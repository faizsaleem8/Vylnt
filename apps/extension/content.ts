(() => {
  const root = globalThis as typeof globalThis & { __vynlt?: boolean };
  if (root.__vynlt) return;
  root.__vynlt = true;
  const clean = (value: string) => {
    try { const u = new URL(value, location.href); return ['http:', 'https:'].includes(u.protocol) ? `${u.origin}${u.pathname}` : ''; }
    catch { return ''; }
  };
  function collect() {
    const scripts = [...document.scripts].filter(s => s.src).slice(0, 150)
      .map(s => ({ url: clean(s.src), integrity: Boolean(s.integrity.trim()) })).filter(s => s.url);
    const resources = [...document.querySelectorAll('script[src],img[src],iframe[src],link[rel="stylesheet"][href],audio[src],video[src]')]
      .slice(0, 300).map(el => ({ url: clean(el.getAttribute('src') ?? el.getAttribute('href') ?? ''),
        type: el.tagName === 'IMG' ? 'image' : el.tagName.toLowerCase(), outcome: 'referenced' })).filter(r => r.url);
    void chrome.runtime.sendMessage({ type: 'DOM', scripts, resources }).catch(() => observer.disconnect());
  }
  let timer: ReturnType<typeof setTimeout>;
  let updates = 0;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    if (++updates > 100) { observer.disconnect(); return; }
    timer = setTimeout(collect, 750);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href', 'integrity'] });
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (sender.id === chrome.runtime.id && message.type === 'COLLECT') collect();
  });
  collect();
})();
