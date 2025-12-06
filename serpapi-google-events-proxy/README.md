# SerpApi Google Events Proxy

Lightweight Node/Express proxy for SerpApi's `google_events` engine. The API key is kept in the server environment, not passed by clients.

## Setup

```bash
cd serpapi-google-events-proxy
npm install
cp .env.example .env   # fill SERPAPI_API_KEY
npm start              # defaults to http://localhost:3001
```

## Usage

```bash
curl "http://localhost:3001/search?q=concerts%20in%20Austin"
curl "http://localhost:3001/search?q=tech%20events&location=San%20Francisco%2C%20CA&hl=en&gl=us&start=10"
```

Notes:
- The proxy forces `engine=google_events` and injects `SERPAPI_API_KEY` from the server environment.
- Query params you can pass through: `q` (required), `location`, `hl`, `gl`, `start`. Additional SerpApi params can be added similarly if needed.
- Health check: `GET /health` returns `{ "status": "ok" }`.

## OpenAPI

See `openapi.json` for a minimal spec pointing at this proxy.

## Deploying

- Add `SERPAPI_API_KEY` as an environment variable/secret in your hosting provider.
- Optional: adjust `PORT` via env var.
