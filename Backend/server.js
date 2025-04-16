const fastify = require('fastify')({ logger: true, trustProxy: true });
const { pipeline } = require('stream');
const { promisify } = require('util');
const { request, Agent } = require('undici');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const fastifyCors = require('@fastify/cors');
const fastifyRateLimit = require('@fastify/rate-limit');
const fastifyStatic = require('@fastify/static');
const archiver = require('archiver');
const fastifyCompress = require('@fastify/compress');
const { Readable } = require('stream');

const pipelineAsync = promisify(pipeline);

// Thumbnail Agent
const thumbnailAgent = new Agent({
  connect: {
    timeout: 1000,
    keepAlive: true,
    keepAliveTimeout: 30000,
  },
  connections: 8,
  pipelining: 1,
  keepAliveTimeout: 30000,
  keepAliveMaxTimeout: 30000,
});

// Constants
const VALID_RESOLUTIONS = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'];
const MAX_REQUESTS = 100;
const TIME_WINDOW = '1 minute';
const YOUTUBE_DOMAINS = new Set(['youtube.com', 'youtu.be']);
const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

// Middleware
fastify.register(fastifyCompress, { encodings: ['br', 'gzip', 'deflate'] });
fastify.register(fastifyCors, {
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Accept-Encoding'],
  exposedHeaders: ['Content-Disposition'],
  credentials: true,
  maxAge: 86400
});
fastify.register(fastifyRateLimit, { max: MAX_REQUESTS, timeWindow: TIME_WINDOW });
fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
  acceptRanges: true,
  preCompressed: true,
  index: ['index.html', 'index.htm']
});

// Extracts video ID from various YouTube URL formats
const getVideoId = (url) => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^(www\.|m\.)/, '');

    if (!YOUTUBE_DOMAINS.has(hostname)) return null;
    if (hostname === 'youtu.be') return urlObj.pathname.slice(1).split('&')[0];

    const patterns = new Map([
      ['/e/', 3], ['/live/', 6], ['/shorts/', 8], ['/embed/', 7]
    ]);

    const pathname = urlObj.pathname;
    for (const [prefix, skip] of patterns) {
      if (pathname.startsWith(prefix)) return pathname.slice(skip).split('?')[0];
    }

    return urlObj.searchParams.get('v') || null;
  } catch {
    return null;
  }
};

const isValidYouTubeUrl = (url) => {
  const videoId = getVideoId(url);
  return videoId !== null && VIDEO_ID_REGEX.test(videoId);
};

const checkThumbnailAvailability = async (videoId, resolution) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1000);
  
  try {
    const { statusCode } = await request(`https://img.youtube.com/vi/${videoId}/${resolution}.jpg`, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 
        'User-Agent': 'YouTube-Thumbnail-Downloader/1.0',
        'Accept': 'image/jpeg',
        'Connection': 'keep-alive'
      },
      dispatcher: thumbnailAgent
    });
    return statusCode === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

const checkResolutionPair = async (videoId, [res1, res2]) => {
  const [result1, result2] = await Promise.all([
    res1 ? checkThumbnailAvailability(videoId, res1) : Promise.resolve(false),
    res2 ? checkThumbnailAvailability(videoId, res2) : Promise.resolve(false)
  ]);
  return { [res1]: result1, ...(res2 && { [res2]: result2 }) };
};

const checkAllResolutions = async (videoId) => {
  const resolutionPairs = [];
  for (let i = 0; i < VALID_RESOLUTIONS.length; i += 2) {
    resolutionPairs.push([
      VALID_RESOLUTIONS[i],
      VALID_RESOLUTIONS[i + 1]
    ]);
  }

  const results = await Promise.all(
    resolutionPairs.map(pair => checkResolutionPair(videoId, pair))
  );

  return Object.assign({}, ...results);
};

const downloadThumbnail = async (videoId, resolution) => {
  if (!videoId) throw new Error('Invalid video ID');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const { statusCode, body } = await request(`https://img.youtube.com/vi/${videoId}/${resolution}.jpg`, {
      signal: controller.signal,
      headers: { 
        'User-Agent': 'YouTube-Thumbnail-Downloader/1.0',
        'Accept': 'image/jpeg',
        'Connection': 'keep-alive'
      },
      dispatcher: thumbnailAgent
    });

    if (statusCode !== 200) throw new Error(`Failed to fetch thumbnail (${statusCode})`);
    return Readable.from(body);
  } catch (error) {
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

// API Routes
fastify.post('/api/check-availability', async (request, reply) => {
  const { videoUrl } = request.body;

  if (!videoUrl || !isValidYouTubeUrl(videoUrl)) {
    return reply.code(400).send({ error: 'Invalid YouTube URL' });
  }

  const videoId = getVideoId(videoUrl);

  try {
    const availabilityMap = await checkAllResolutions(videoId);
    const bestAvailable = VALID_RESOLUTIONS.find(res => availabilityMap[res]);

    return reply.send({
      videoId,
      availableResolutions: availabilityMap,
      bestAvailable,
    });
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: 'Failed to check thumbnail availability' });
  }
});

fastify.post('/api/download', async (request, reply) => {
  const { videoUrl, resolution, availabilityData } = request.body;

  if (!videoUrl || !isValidYouTubeUrl(videoUrl)) {
    return reply.code(400).send({ error: 'Invalid YouTube URL' });
  }

  const videoId = getVideoId(videoUrl);
  let validResolutions;

  if (availabilityData?.videoId === videoId) {
    validResolutions = Object.entries(availabilityData.availableResolutions)
      .filter(([_, available]) => available)
      .map(([res]) => res);
  } else {
    const availabilityMap = await checkAllResolutions(videoId);
    validResolutions = VALID_RESOLUTIONS.filter(res => availabilityMap[res]);
  }

  if (!validResolutions.length) {
    return reply.code(404).send({ error: 'No thumbnails available' });
  }

  if (resolution === 'all') {
    reply.raw.setHeader('Content-Type', 'application/zip');
    reply.raw.setHeader('Content-Disposition', `attachment; filename="${videoId}_thumbnails.zip"`);
    if (!request.headers.origin || request.headers.origin === 'http://localhost:5173') {
      reply.raw.setHeader('Access-Control-Allow-Origin', request.headers.origin || '*');
      reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
      reply.raw.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    }
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(reply.raw);

    try {
      for (const res of validResolutions) {
        const stream = await downloadThumbnail(videoId, res);
        archive.append(stream, { name: `${videoId}_${res}.jpg` });
      }

      await archive.finalize();
      return reply;
    } catch (error) {
      archive.abort();
      throw error;
    }
  } else {
    if (!VALID_RESOLUTIONS.includes(resolution)) {
      return reply.code(400).send({ error: 'Invalid resolution' });
    }

    if (!validResolutions.includes(resolution)) {
      return reply.code(400).send({ 
        error: 'Requested resolution not available',
        bestAvailable: validResolutions[0]
      });
    }

    try {
      const thumbnailStream = await downloadThumbnail(videoId, resolution);
      const headers = {
        'Content-Disposition': `attachment; filename="${videoId}_${resolution}.jpg"`,
        'Content-Type': 'image/jpeg'
      };
      
      if (!request.headers.origin || request.headers.origin === 'http://localhost:5173') {
        headers['Access-Control-Allow-Origin'] = request.headers.origin || '*';
        headers['Access-Control-Allow-Credentials'] = 'true';
        headers['Access-Control-Expose-Headers'] = 'Content-Disposition';
      }
      
      return reply
        .headers(headers)
        .send(thumbnailStream);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to download thumbnail' });
    }
  }
});

fastify.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api/')) {
    reply.code(404).send({ error: 'API endpoint not found' });
    return;
  }
  reply.sendFile('index.html');
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info('Server started successfully');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  await thumbnailAgent.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await thumbnailAgent.close();
  process.exit(0);
});

start();