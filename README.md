# AI Video Transformer

Full-stack **AI Video-to-Video** app: upload a clip, choose Magic Hour style parameters, and browse async history until the generated video is ready.

**Live demo:** [https://ai-video-transformer-one.vercel.app](https://ai-video-transformer-one.vercel.app)

## Overview

### What it does

1. Upload an MP4/MOV source video through **Uploadcare** (browser → Uploadcare).
2. The server verifies Uploadcare metadata, stores a durable copy in **Cloudinary**, and creates a MongoDB record.
3. Submit Magic Hour Video-to-Video parameters via the transform form.
4. Magic Hour renders asynchronously and notifies `/api/webhook`.
5. On completion, the app copies the output into Cloudinary and updates MongoDB.
6. The UI refreshes history with **TanStack Query** adaptive polling (no WebSockets).

### Main user flow

```text
Upload → Transform settings → Queued / Processing → Completed (or Failed) → History
```

You can leave the page while a job runs; state is persisted in MongoDB.

## Tech stack

| Area | Choice |
| --- | --- |
| App | Next.js (App Router), React, TypeScript |
| Validation | Zod |
| Data | MongoDB (official driver) |
| Upload | Uploadcare (`@uploadcare/react-uploader`) |
| Storage | Cloudinary |
| AI | Magic Hour Video-to-Video |
| UI sync | TanStack Query (adaptive polling) |
| Deploy | Vercel |

## Architecture

```text
Browser
  → Uploadcare (direct upload)
  → POST /api/upload (UUID only)
      → Uploadcare REST metadata (trusted)
      → Cloudinary remote-fetch source
      → MongoDB (status: uploaded)
  → POST /api/transform (transformationId + params)
      → Magic Hour Video-to-Video job
      → MongoDB (status: queued, projectId)
  → Magic Hour dashboard webhook
  → POST /api/webhook
      → started → processing
      → completed → Cloudinary generated copy → completed
      → errored → failed
  → GET /api/history
  → TanStack Query UI (poll ~3s while active)
```

### Why this shape

- **Browser → Uploadcare:** avoids shipping large binaries through Vercel.
- **Server re-fetches Uploadcare metadata:** never trust client-reported size/MIME alone; uses the secret key server-side.
- **Cloudinary remote-fetch:** Cloudinary pulls the trusted Uploadcare CDN URL; the Next.js function does not proxy the video body.
- **MongoDB is source of truth:** UI and webhooks converge on persisted status, not provider polling from the browser.
- **Async Magic Hour + webhooks:** renders can take minutes; the app acknowledges job creation quickly.
- **Adaptive polling:** poll only while jobs are `queued`/`processing`; stop when idle. No WebSockets/SSE for this assignment.

More detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Local setup

```bash
npm install
cp .env.example .env.local
# fill in credentials (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Magic Hour webhooks locally

Magic Hour cannot reach `localhost` directly. For real completion events either:

1. Point the Developer Hub webhook at the **production** URL (recommended for demos), or
2. Use a tunnel (ngrok/Cloudflare) to your local `/api/webhook`.

Subscribed events:

- `video.started`
- `video.completed`
- `video.errored`

Webhook URL (production):

```text
https://ai-video-transformer-one.vercel.app/api/webhook
```

Set `MAGIC_HOUR_WEBHOOK_SECRET` to the signing secret from the Magic Hour Developer Hub.

## Environment variables

Canonical list: [`.env.example`](.env.example). **Never commit real secrets.**

| Variable | Where | Purpose |
| --- | --- | --- |
| `APP_URL` | Server | Public app base URL (webhook configuration / ops) |
| `MONGODB_URI` | Server | MongoDB connection string |
| `MONGODB_DB_NAME` | Server | Database name (default `ai-video-transformer`) |
| `NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY` | Browser | Uploadcare uploader |
| `UPLOADCARE_SECRET_KEY` | Server | Uploadcare REST metadata |
| `CLOUDINARY_CLOUD_NAME` | Server | Cloudinary cloud |
| `CLOUDINARY_API_KEY` | Server | Cloudinary API |
| `CLOUDINARY_API_SECRET` | Server | Cloudinary API secret |
| `MAGIC_HOUR_API_KEY` | Server | Create Video-to-Video jobs |
| `MAGIC_HOUR_WEBHOOK_SECRET` | Server | Verify webhook HMAC signatures |

Only `NEXT_PUBLIC_*` is exposed to the browser.

## API endpoints

| Method | Path | Role |
| --- | --- | --- |
| `POST` | `/api/upload` | Register Uploadcare UUID → Cloudinary source → MongoDB |
| `POST` | `/api/transform` | Start Magic Hour job for a trusted transformation ID |
| `POST` | `/api/webhook` | Verify + apply Magic Hour video lifecycle events |
| `GET` | `/api/history` | Newest-first public history DTO (for UI polling) |

Transform accepts **`transformationId` + parameters only** — clients cannot override Cloudinary/Magic Hour asset URLs.

## Important implementation decisions

- **100 MB upload limit** — application cap chosen around the Cloudinary Free-plan video limit (not a universal Cloudinary platform ceiling). See DEC-006.
- **Trusted Uploadcare `original_file_url`** — modern Uploadcare CDN hosts (`*.ucarecd.net`); host-allowlisted before Cloudinary fetch.
- **Default Magic Hour `version: v2`** — provider `default` currently resolves to unavailable V3 for many styles; live probe confirmed `v2` for all supported art styles.
- **Duplicate transform protection** — atomic claim before creating a Magic Hour job; stuck `queued` without `projectId` can be reclaimed.
- **Webhook security** — HMAC-SHA256 + 5-minute timestamp skew; completion is idempotent via deterministic Cloudinary public IDs.
- **Permanent output copy** — Magic Hour download URLs expire; generated videos are stored under `ai-video-transformer/generated/{projectId}`.

## Assignment / Magic Hour API discrepancy

The assignment text describes sending a **webhook callback URL with the transform request**. Current Magic Hour Video-to-Video APIs register webhooks in the **Developer Hub**; the create request has no `webhook_url` field.

This project follows the **current provider API** (dashboard subscription → `POST /api/webhook`) and documents the difference in DEC-003.

## Limitations / production improvements

Deliberate take-home trade-offs (not product bugs):

- **No authentication** — outside assignment scope. A public deploy can burn Magic Hour credits and expose demo history.
- Prefer **Vercel Deployment Protection** (or auth/rate limits) before leaving paid keys on a public URL.
- **Serverless timeouts** — upload/webhook use `maxDuration = 60`; very large media may still need shorter clips or a higher Vercel plan.
- **No durable queue** — rare crash between Magic Hour create and Mongo `projectId` persist is mitigated by reclaim logic; a second job is a rare residual risk.
- **No WebSockets** — adaptive polling is intentional.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Focused unit tests (validation, webhooks, trust checks) |

## Vercel

Deploy with the same env vars as `.env.example`.

Set:

- `APP_URL=https://ai-video-transformer-one.vercel.app`
- Magic Hour webhook → `https://ai-video-transformer-one.vercel.app/api/webhook`

MongoDB Atlas network access must allow Vercel egress.
