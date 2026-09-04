# AI Video Transformer

Full-stack AI Video-to-Video transformation case study built with Next.js, TypeScript, MongoDB, Uploadcare, Cloudinary, Magic Hour, and Vercel.

## Status

Phase 1 (project foundation) is in progress. Setup, architecture, and async workflow documentation will be completed in Phase 9. Until then, see:

- `docs/CASE_STUDY.md` — assignment requirements
- `docs/ARCHITECTURE.md` — system design
- `docs/IMPLEMENTATION_PLAN.md` — phased plan
- `docs/DECISIONS.md` — engineering decisions

## Quick start (foundation)

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill in provider credentials in `.env.local` before later integration phases.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
