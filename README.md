# Order Tracking Finder

A small Chrome extension (Manifest V3, plain JavaScript, no build step) that finds carrier tracking numbers on eBay and Amazon order pages, links each one to its carrier and exports the list as CSV.

## What it does

- Scans the order page text for UPS, USPS, FedEx, DHL Express, Amazon Logistics (TBA) and UPU S10 postal numbers (Royal Mail and other national posts).
- Shows the count on the toolbar badge and lists the numbers in the popup, each with a carrier tracking link.
- Copies the list as CSV (`tracking_number,carrier,tracking_url`).
- Re-scans automatically when the page changes, since marketplace order pages load content after the first render.

## Design decisions

- **Text scan, not CSS selectors.** eBay and Amazon change their markup often. Reading `innerText` and matching carrier formats keeps working when the layout changes.
- **Context check for numeric formats.** FedEx (12 or 15 digits) and DHL Express (10 digits) look like order numbers and phone numbers. They only count when a tracking keyword appears within 60 characters.
- **Check digits where the format has one.** UPU S10 numbers are validated with the official weights (8, 6, 4, 2, 3, 5, 9, 7), so random two-letter codes are rejected.
- **Stricter formats first.** A number matched as USPS is never re-claimed by a looser numeric pattern.
- **State in `chrome.storage.session`.** The MV3 service worker can be suspended at any time. Per-tab results live in session storage and are removed when the tab closes.

## Run it

1. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and select this folder.
2. Open an eBay or Amazon order page that has shipped items.

## Tests

```
npm test
```

Runs the detection tests with Node's built-in test runner (Node 18+). No dependencies.

## Limits

- Detection is format-based. A number in an unusual format is missed, and a rare false positive is possible for numeric formats near the word "tracking".
- It does not call carrier APIs for delivery status. That would be the next step, behind a small backend to keep API keys out of the extension.
