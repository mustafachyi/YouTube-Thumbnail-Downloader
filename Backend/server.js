const fastify = require('fastify')({ 
  logger: true,
  trustProxy: true
});
const { pipeline } = require('stream');
const { promisify } = require('util');
const { request } = require('undici');
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

// Supported YouTube thumbnail quality options
const VALID_RESOLUTIONS = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'];
const MAX_REQUESTS = 100;
const TIME_WINDOW = '1 minute';
const YOUTUBE_DOMAINS = new Set(['youtube.com', 'youtu.be']);
const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

// Add compression before other plugins
fastify.register(fastifyCompress, {
  encodings: ['br', 'gzip', 'deflate']
});

// CORS configuration
fastify.register(fastifyCors, {
  origin: true, // Allow all origins since we're serving frontend from same origin
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Accept-Encoding'],
  exposedHeaders: ['Content-Disposition'],
  credentials: true,
  maxAge: 86400
});

fastify.register(fastifyRateLimit, {
  max: MAX_REQUESTS,
  timeWindow: TIME_WINDOW
});

// Serve static files from public directory
fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/'
});

// Handle SPA routing by serving index.html for all non-API routes
fastify.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api/')) {
    reply.code(404).send({ error: 'API endpoint not found' });
    return;
  }
  reply.sendFile('index.html');
});

// Extract video ID from various YouTube URL formats
const getVideoId = (url) => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^(www\.|m\.)/, '');
    const pathname = urlObj.pathname;

    if (!YOUTUBE_DOMAINS.has(hostname)) return null;

    if (hostname === 'youtu.be') {
      return pathname.slice(1).split('&')[0];
    }

    const patterns = {
      '/e/': 3,
      '/live/': 6,
      '/shorts/': 8,
      '/embed/': 7
    };

    for (const [prefix, skip] of Object.entries(patterns)) {
      if (pathname.startsWith(prefix)) {
        return pathname.slice(skip).split('?')[0];
      }
    }

    return urlObj.searchParams.get('v') || null;
  } catch {
    return null;
  }
};

// Verify URL is valid YouTube link with proper video ID
const isValidYouTubeUrl = (url) => {
  const videoId = getVideoId(url);
  return videoId !== null && VIDEO_ID_REGEX.test(videoId);
};

// Check if specific resolution thumbnail exists
const checkThumbnailAvailability = async (videoId, resolution) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    
    const response = await fetch(`https://img.youtube.com/vi/${videoId}/${resolution}.jpg`, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'YouTube-Thumbnail-Downloader/1.0' }
    });
    
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
};

// Get all available thumbnail resolutions for video
const checkAllResolutions = async (videoId) => {
  const checks = await Promise.allSettled(
    VALID_RESOLUTIONS.map(async resolution => {
      const isAvailable = await checkThumbnailAvailability(videoId, resolution);
      return [resolution, isAvailable];
    })
  );

  return Object.fromEntries(
    checks
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value)
  );
};

// API: Check which thumbnail resolutions are available
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

// Download thumbnail stream with timeout handling
const downloadThumbnail = async (videoId, resolution) => {
  if (!videoId) throw new Error('Invalid video ID');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`https://img.youtube.com/vi/${videoId}/${resolution}.jpg`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'YouTube-Thumbnail-Downloader/1.0' }
    });

    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch thumbnail (${response.status})`);
    }

    return Readable.fromWeb(response.body);
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
};

// API: Download single thumbnail or ZIP of all available resolutions
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

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info('Server started successfully');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();