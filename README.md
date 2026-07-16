JobFit is a personal, ADHD-friendly job search app. Instead of a wall of listings,
it surfaces a **focused few strongly-aligned jobs per day**, explains **why each
fits**, and generates a **resume tailored** to each role — asking for a little extra
context to strengthen it.

## How it works

- **Profile** (`src/lib/profile.ts`) — the single source of truth for "what I'm
  looking for" (seniority, frontend-leaning stack, NYC-first location ranking). Drives
  both the crawler query and the AI fit scoring. A settings UI can later override it
  via the `profile.preferences` column.
- **Pipeline** (`src/app/api/cron/*`) — daily cron: SerpAPI searches ATS boards →
  enrich (scrape descriptions, keep NYC-or-remote + React/TS) → AI fit scoring
  (heuristic fallback when no key).
- **Daily focus** (`/`) — the top-scoring unseen jobs, stamped as today's fixed set.
- **Resume tailoring** (`src/lib/ai.ts`, `/resumes`) — one base resume, tailored per
  job with a context Q&A loop.

## Setup

Environment variables (`.env.development.local` for dev, Vercel env for prod):

- `DATABASE_URL` — Neon Postgres
- `SERPAPI_KEY` — job crawling
- `ANTHROPIC_API_KEY` — **required** for AI fit scoring, resume tailoring, and
  context questions (Claude `claude-opus-4-8`). Without it, these features degrade
  gracefully (heuristic scores, no drafts).
- `CRON_SECRET` — bearer token guarding `/api/cron`

Run the DB migration once (adds fit/lifecycle columns + `profile` / `tailored_resume`
tables):

```bash
npx tsx scripts/migrate.ts dev     # or: prod --confirm-prod
```

Pipeline scripts: `scripts/fetch-jobs.ts`, `scripts/enrich-jobs.ts`,
`scripts/verify-jobs.ts` (re-scores enriched jobs).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
