# AI Personal Health Companion

A full-stack mobile health app built with Expo + React Native (mobile) and Express (API server).

## What it does
- **Daily AI health card** — personalized recommendations powered by Cohere, cached per user per day
- **Symptom checker** — describe symptoms, get a risk tier (home care / monitor / see doctor / emergency) with AI-generated advice and an emergency keyword gate
- **Medication tracker** — add medications, log taken/missed/snoozed with haptic feedback
- **Vital readings** — blood pressure, blood sugar, and weight tracking with reference ranges
- **Health files** — upload lab reports and prescriptions (PDF/image) stored in Postgres
- **Credit meter** — 100 free AI credits/month, tracked per user and surfaced in the Profile tab

## Stack

| Layer | Tech |
|---|---|
| Mobile | Expo 54 (SDK), React Native, Expo Router, TanStack Query |
| API | Express + TypeScript, built with esbuild |
| Database | PostgreSQL via Drizzle ORM |
| AI | Cohere (`command-r-plus`) via backend proxy |
| Auth | Device-ID (UUID stored in AsyncStorage, sent as `Authorization: Bearer <id>`) |
| Fonts | Inter (via `@expo-google-fonts/inter`) |

## Artifacts

- `artifacts/api-server` — Express REST API, runs on `$PORT`
- `artifacts/mobile` — Expo app (view in Expo Go or the preview pane)
- `artifacts/mockup-sandbox` — Canvas / design sandbox (untouched)

## Key files

- `lib/db/src/schema/index.ts` — Drizzle schema for all tables
- `lib/api-spec/openapi.yaml` — OpenAPI spec (codegen source)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `artifacts/api-server/src/routes/` — all API route handlers
- `artifacts/api-server/src/lib/cohere.ts` — Cohere AI integration
- `artifacts/mobile/contexts/UserContext.tsx` — device-ID auth + onboarding state
- `artifacts/mobile/constants/colors.ts` — full light/dark color palette

## Running locally

```bash
# Start API server
pnpm --filter @workspace/api-server run dev

# Start Expo app
pnpm --filter @workspace/mobile run dev

# Push DB schema (first time or after schema changes)
pnpm --filter @workspace/db run push
```

## User preferences

- Cohere model: `command-r-plus` (override via `COHERE_MODEL` env var)
- Free tier: 100 AI credits per user per 30-day rolling window
- Emergency keyword check runs before any Cohere call — returns emergency tier immediately without burning credits
- Daily recommendations are cached per user per calendar day to avoid repeat credit usage
- All AI calls go through the backend; the mobile app never calls Cohere directly
