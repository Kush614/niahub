// Background service worker — pings niahub.dev so the live ticker shows the
// "Aside-driven install" event. Runs the moment a content script reports an
// install click. Tab open + paste-to-mcp.json happens in the page; this is
// just the analytics & one-line snippet copy helper.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.kind !== 'install' || !msg.pack) return;
  fetch('https://niahub.dev/api/aside/event', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind: 'install_intent', pack: msg.pack, ts: Date.now() }),
  }).catch(() => undefined);
  sendResponse({ ok: true });
  return true;
});
