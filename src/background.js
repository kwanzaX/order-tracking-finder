// Service worker: keeps the numbers found per tab and shows the count on the toolbar badge.
// chrome.storage.session survives the worker being suspended but is cleared when the browser closes.
'use strict';

const keyFor = (tabId) => `tab:${tabId}`;

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== 'tracking:found' || !sender.tab) return;
  const tabId = sender.tab.id;
  chrome.storage.session.set({ [keyFor(tabId)]: { items: msg.items, page: msg.page, at: Date.now() } });
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#1f6feb' });
  chrome.action.setBadgeText({ tabId, text: msg.items.length ? String(msg.items.length) : '' });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(keyFor(tabId));
});
