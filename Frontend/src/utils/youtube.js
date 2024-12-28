export const isValidYouTubeUrl = (url) => {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace(/^(www\.|m\.)/, '')
    if (!['youtube.com', 'youtu.be'].includes(hostname)) return false

    if (hostname === 'youtu.be') return urlObj.pathname.length > 1

    if (hostname === 'youtube.com') {
      return urlObj.pathname.startsWith('/e/') ||
             urlObj.pathname.startsWith('/live/') ||
             urlObj.searchParams.has('v') ||
             urlObj.pathname.startsWith('/shorts/') ||
             urlObj.pathname.startsWith('/embed/') ||
             (urlObj.pathname === '/watch' && urlObj.searchParams.has('v'))
    }
    return false
  } catch {
    return false
  }
}

export const getVideoId = (url) => {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace(/^(www\.|m\.)/, '')
    const pathname = urlObj.pathname

    if (hostname === 'youtu.be') return pathname.slice(1).split('&')[0]

    if (hostname === 'youtube.com') {
      if (pathname.startsWith('/e/')) return pathname.slice(3).split('?')[0]
      if (pathname.startsWith('/live/')) return pathname.slice(6).split('?')[0]
      if (urlObj.searchParams.has('v')) return urlObj.searchParams.get('v')
      if (pathname.startsWith('/shorts/')) return pathname.slice(8, 19)
      if (pathname.startsWith('/embed/')) return pathname.slice(7, 18)
    }
    return null
  } catch {
    return null
  }
}
