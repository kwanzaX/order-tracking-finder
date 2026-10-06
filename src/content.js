// Scans order pages for tracking numbers and reports them to the service worker.
// Marketplace pages are single-page apps, so the scan re-runs (debounced) when the DOM changes.
(function () {
  'use strict';

  let lastReported = '';
  let timer = null;

  function scan() {
    const items = Carriers.detect(document.body ? document.body.innerText : '');
    const key = items.map((i) => i.number).join('|');
    if (key === lastReported) return;
    lastReported = key;
    chrome.runtime.sendMessage({ type: 'tracking:found', items, page: location.href }).catch(() => {});
  }

  function scheduleScan() {
    clearTimeout(timer);
    timer = setTimeout(scan, 400);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === 'tracking:rescan') {
      lastReported = '';
      scan();
      sendResponse({ ok: true });
    }
  });

  new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
