function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]!
  )
}

/**
 * This document executes provider HTML on the public worker origin.
 * Never serve it on the site's origin or an origin containing authenticated data.
 */
export function embedDocument(
  html: string,
  source: string,
  dark: boolean
): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Embedded post</title>
<style>
html,body{margin:0;padding:0;background:transparent;color-scheme:${dark ? 'dark' : 'light'}}
#embed-content{display:flow-root;overflow-wrap:anywhere}
iframe,img,video{max-width:100%}
</style></head><body>
<main id="embed-content">${html}</main>
<noscript><a href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">View original post</a></noscript>
<script>
(() => {
  const content = document.getElementById('embed-content');
  let previous = 0;
  function resize() {
    const height = Math.ceil(content.getBoundingClientRect().height);
    if (height > 0 && height !== previous) {
      previous = height;
      parent.postMessage({type:'vinh:embed-size',height}, '*');
    }
  }
  new ResizeObserver(resize).observe(content);
  window.addEventListener('load', resize);
  resize();
})();
</script></body></html>`
}
