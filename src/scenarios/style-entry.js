import '@fontsource-variable/archivo';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './photo.css';

// H3 orbit preview: /scenarios/?h3=1
// The default hero stays on the stable 1080p 2.5D cut.
if (new URLSearchParams(window.location.search).has('h3')) {
  const heroVideo = document.querySelector('.hero-image video');
  if (heroVideo) {
    for (const source of heroVideo.querySelectorAll('source')) {
      source.src = source.type === 'video/webm'
        ? '/media/paddy-h3-orbit-1080.webm'
        : '/media/paddy-h3-orbit-1080.mp4';
    }
    heroVideo.poster = '/media/paddy-h3-orbit-1080-poster.jpg';
    heroVideo.load();
    heroVideo.play().catch(() => {});
    document.body.classList.add('h3-preview');
  }
}
