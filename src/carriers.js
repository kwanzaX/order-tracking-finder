// Tracking-number detection shared by the content script, the popup and the tests.
// Plain JavaScript, no build step: loaded as a classic script in the extension
// and with require() in Node.
(function (root) {
  'use strict';

  // Numeric-only formats (FedEx, DHL Express) collide with order numbers, phone
  // numbers and SKUs, so they only count when a tracking keyword sits nearby.
  const CONTEXT_WINDOW = 60;
  const CONTEXT_WORDS = /track|tracking|shipment|parcel|fedex|dhl|carrier|sendungs/i;

  const CARRIERS = [
    {
      id: 'ups',
      name: 'UPS',
      pattern: /\b1Z[0-9A-Z]{16}\b/g,
      url: (n) => `https://www.ups.com/track?tracknum=${n}`,
    },
    {
      id: 'usps',
      name: 'USPS',
      pattern: /\b9[1-5]\d{20}(?:\d{4})?\b/g,
      url: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
    },
    {
      id: 'amazon',
      name: 'Amazon Logistics',
      pattern: /\bTBA\d{12}\b/g,
      url: () => null, // only trackable inside the Amazon account
    },
    {
      id: 's10',
      name: 'Postal (UPU S10)',
      pattern: /\b[A-Z]{2}\d{9}[A-Z]{2}\b/g,
      validate: isValidS10,
      url: (n) => n.endsWith('GB')
        ? `https://www.royalmail.com/track-your-item#/tracking-results/${n}`
        : `https://t.17track.net/en#nums=${n}`,
    },
    {
      id: 'fedex',
      name: 'FedEx',
      pattern: /\b(?:\d{12}|\d{15})\b/g,
      needsContext: true,
      url: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
    },
    {
      id: 'dhl',
      name: 'DHL Express',
      pattern: /\b\d{10}\b/g,
      needsContext: true,
      contextWords: /dhl/i,
      url: (n) => `https://www.dhl.com/global-en/home/tracking/tracking-express.html?tracking-id=${n}`,
    },
  ];

  // UPU S10 check digit (e.g. Royal Mail, La Poste, Correos): weights 8,6,4,2,3,5,9,7.
  function isValidS10(code) {
    const digits = code.slice(2, 11);
    const weights = [8, 6, 4, 2, 3, 5, 9, 7];
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += Number(digits[i]) * weights[i];
    let check = 11 - (sum % 11);
    if (check === 10) check = 0;
    if (check === 11) check = 5;
    return check === Number(digits[8]);
  }

  function hasContext(text, index, length, words) {
    const start = Math.max(0, index - CONTEXT_WINDOW);
    const around = text.slice(start, index + length + CONTEXT_WINDOW);
    return (words || CONTEXT_WORDS).test(around);
  }

  // Returns [{ number, carrier, carrierName, url }] in page order, without duplicates.
  // A number claimed by a stricter carrier (e.g. USPS) is not re-claimed by a looser one.
  function detect(text) {
    if (!text) return [];
    const found = new Map();
    for (const c of CARRIERS) {
      c.pattern.lastIndex = 0;
      let m;
      while ((m = c.pattern.exec(text)) !== null) {
        const number = m[0];
        if (found.has(number)) continue;
        if (c.validate && !c.validate(number)) continue;
        if (c.needsContext && !hasContext(text, m.index, number.length, c.contextWords)) continue;
        found.set(number, { number, carrier: c.id, carrierName: c.name, url: c.url(number), index: m.index });
      }
    }
    return [...found.values()]
      .sort((a, b) => a.index - b.index)
      .map(({ index, ...rest }) => rest);
  }

  function toCsv(items) {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = items.map((i) => [i.number, i.carrierName, i.url || ''].map(esc).join(','));
    return ['tracking_number,carrier,tracking_url', ...rows].join('\n');
  }

  const api = { detect, toCsv, isValidS10, CARRIERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Carriers = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
