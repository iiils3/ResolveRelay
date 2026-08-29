# ResolveRelay Chrome Extension (MVP)

This Manifest V3 extension captures the current product page title, URL, merchant hostname, and an optional price, then opens ResolveRelay's Product Fingerprints screen with those fields prefilled.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `extension` folder.

## Privacy

The extension does not continuously monitor browsing and does not upload anything by itself. It only reads the active tab after the user opens the extension popup and presses **Send to ResolveRelay**.

The receiving ResolveRelay screen still requires the user's authenticated account before saving the fingerprint.
