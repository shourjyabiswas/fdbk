# FDBK — Anonymous Survey Platform

FDBK is a full-stack anonymous survey web app for lab-course evaluation workflows, built with Next.js App Router, MongoDB, NextAuth, and Recharts.

## Core Architecture

The anonymity model is based on strict separation of identity and answer content:

- **SubmissionRecord** stores only identity linkage (`userId`, `surveyId`, `submittedAt`) to enforce one submission per participant.
- **AnonymousResponse** stores only survey content (`surveyId`, encrypted `answers`, `submittedAt`) and contains no user identity fields.
- There is **no shared join key** between a user and an individual anonymous answer payload.

### Why this is anonymous

Even with full database read access, an operator cannot map a specific response to a specific user because:

1. The collection that knows user identity has no response body.
2. The collection that stores responses has no user identity.
3. Analytics only returns aggregated counts, not individual response payloads.

## Encryption-at-rest flow

The submission route applies AES encryption before persisting response content:

1. Generate a temporary random token with `crypto.randomBytes(32).toString("hex")`.
2. Encrypt the submitted answer payload with `CryptoJS.AES.encrypt(..., ENCRYPTION_KEY)`.
3. Save encrypted data in `AnonymousResponse.answers`.
4. Save completion marker in `SubmissionRecord`.
5. Update `User.hasSubmitted`.
6. Destroy the temporary token variable.

Only analytics endpoints decrypt data in memory for aggregation.

## Tech stack

- Next.js 16+ App Router with TypeScript
- Tailwind CSS v4 tokens mapped from CSS custom properties
- NextAuth Credentials provider
- MongoDB + Mongoose
- React Hook Form + Zod validation
- Framer Motion animations
- Recharts analytics visualizations

## Environment Setup

Create `.env.local` and set:

- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `ADMIN_EMAIL`
- `ENCRYPTION_KEY` (application-enforced to exactly 32 characters for AES-256 key length consistency)
- `NEXT_PUBLIC_APP_NAME`

## Scripts

```bash
npm run dev
npm run lint
npm run build
npx tsx scripts/seed.ts
npx tsx scripts/create-admin.ts
```

## Modules

- `/admin` + `/admin/builder`: survey builder and publishing flow
- `/survey`: respondent multi-step experience with one-time submission protection
- `/dashboard`: aggregate-only analytics and export

## Export policy

Exports include **aggregated question-level data only** (`prompt`, `option`, `count`, `percentage`).
Raw decrypted individual responses are never exported.
