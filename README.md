# Rudra Bank

A small, private virtual piggy bank that runs entirely in the browser and can be hosted on GitHub Pages.

## How data is stored

Rudra Bank stores preferences, the savings goal, and transaction history in the browser's `localStorage`. No data is sent to a server. Because browser storage is specific to one browser/device and can be cleared, the Settings panel includes JSON export and import for backups and transfers.

## Run locally

Open `index.html` directly, or serve the folder with any static HTTP server.

## Deploy

GitHub Pages publishes the static files directly from the `main` branch. Pushing an update to `main` refreshes the live site automatically.
