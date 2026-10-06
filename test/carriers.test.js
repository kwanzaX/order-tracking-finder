'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { detect, toCsv, isValidS10 } = require('../src/carriers.js');

test('detects UPS and USPS numbers without context', () => {
  const items = detect('Shipped 1Z999AA10123456784 and 9400111899223197428490');
  assert.deepEqual(items.map((i) => i.carrier), ['ups', 'usps']);
});

test('validates the UPU S10 check digit', () => {
  assert.equal(isValidS10('RA123456785GB'), true);
  assert.equal(isValidS10('RA123456784GB'), false);
  assert.deepEqual(detect('Royal Mail RA123456785GB').map((i) => i.number), ['RA123456785GB']);
  assert.equal(detect('Ref RA123456784GB').length, 0);
});

test('ignores 12-digit numbers that are not near a tracking keyword', () => {
  assert.equal(detect('Order number 123456789012 placed on 3 Oct').length, 0);
  assert.equal(detect('FedEx tracking: 123456789012')[0].carrier, 'fedex');
});

test('only treats 10-digit numbers as DHL when DHL is mentioned', () => {
  assert.equal(detect('Call 0123456789 for support').length, 0);
  assert.equal(detect('DHL Express 1234567890')[0].carrier, 'dhl');
});

test('does not let a looser pattern re-claim a stricter match', () => {
  const items = detect('tracking 9400111899223197428490');
  assert.equal(items.length, 1);
  assert.equal(items[0].carrier, 'usps');
});

test('returns numbers in page order without duplicates', () => {
  const items = detect('TBA123456789012 then 1Z999AA10123456784 then TBA123456789012');
  assert.deepEqual(items.map((i) => i.number), ['TBA123456789012', '1Z999AA10123456784']);
  assert.equal(items[0].url, null);
});

test('exports CSV with quoted fields', () => {
  const csv = toCsv(detect('1Z999AA10123456784'));
  assert.equal(csv.split('\n')[0], 'tracking_number,carrier,tracking_url');
  assert.match(csv, /"1Z999AA10123456784","UPS","https:\/\/www\.ups\.com/);
});
