'use strict';

const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const statusEl = document.getElementById('status');
let current = [];

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function render(items) {
  current = items;
  listEl.replaceChildren(...items.map((i) => {
    const li = document.createElement('li');
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = i.number;
    const meta = document.createElement('span');
    meta.className = 'carrier';
    meta.textContent = i.carrierName + ' ';
    if (i.url) {
      const a = document.createElement('a');
      a.href = i.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Track';
      meta.append(a);
    }
    li.append(num, meta);
    return li;
  }));
  emptyEl.hidden = items.length > 0;
}

async function load() {
  const tab = await activeTab();
  if (!tab) return render([]);
  const data = await chrome.storage.session.get(`tab:${tab.id}`);
  render((data[`tab:${tab.id}`] || {}).items || []);
}

document.getElementById('rescan').addEventListener('click', async () => {
  const tab = await activeTab();
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'tracking:rescan' });
    setTimeout(load, 150);
    statusEl.textContent = 'Rescanned';
  } catch {
    statusEl.textContent = 'Not an eBay or Amazon page';
  }
});

document.getElementById('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(Carriers.toCsv(current));
    statusEl.textContent = `Copied ${current.length}`;
  } catch {
    statusEl.textContent = 'Copy failed';
  }
});

load();
