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

// Bluesky's oEmbed API ignores the theme query param entirely; its embed.js
// only picks a color mode from this attribute on the blockquote it hydrates.
function themeBlueskyEmbed(html: string, dark: boolean): string {
  return html.replace(
    /(<blockquote\b[^>]*\bclass="[^"]*\bbluesky-embed\b[^"]*"[^>]*)>/,
    (match, openTag: string) =>
      /\bdata-bluesky-embed-color-mode=/.test(openTag)
        ? match
        : `${openTag} data-bluesky-embed-color-mode="${dark ? 'dark' : 'light'}">`
  )
}

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/**
 * This document executes provider HTML on the public worker origin.
 * Never serve it on the site's origin or an origin containing authenticated data.
 */
export function embedDocument(
  html: string,
  source: string,
  dark: boolean,
  background?: string
): string {
  const themedHtml = themeBlueskyEmbed(html, dark)
  // Confirmed by direct testing: setting color-scheme on this document's
  // root (regardless of whether it matches or mismatches the parent site's)
  // produces a mismatched background at the iframe boundary. Omit it
  // entirely and rely on the explicit background color alone.
  const bg =
    background && HEX_COLOR_PATTERN.test(background)
      ? background
      : dark
        ? '#1c1c1c'
        : '#ffffff'
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Embedded post</title>
<style>
html,body{margin:0;padding:0;background:${bg}}
#embed-content{display:flow-root;overflow-wrap:anywhere}
iframe,img,video{max-width:100%}
</style></head><body>
<main id="embed-content">${themedHtml}</main>
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
