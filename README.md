# Echo Core

Echo Core is a full-stack marketplace for branded clothing, built as a Telegram-first product with a responsive web interface and a Telegram Mini App experience.

The project combines user profiles, product listings, moderation workflows, product and seller search, likes, private messages, image uploads, delivery-point selection through CDEK, and analytics for Telegram launch/campaign events. The authentication layer is built around Telegram Mini App `initData` validation, one-time nonce launch links, Supabase profile binding, and protected `HttpOnly` application sessions.

This repository is published as a sanitized portfolio snapshot of a real product. Production secrets, deployment files, local IDE settings, private support-bot data, Git history, and environment files are intentionally excluded.

## What this project demonstrates

- Telegram Mini App authentication with backend `initData` validation
- One-time nonce launch flow issued through a Telegram bot webhook
- Internal Supabase profile binding for verified Telegram users
- Protected API routes based on `HttpOnly` session cookies
- Marketplace listing flow for branded clothing and accessories
- Seller profiles, profile editing, product ownership, and public profile pages
- Product search, brand search, filters, likes, and saved items
- Product moderation through pending listings and admin verification tools
- Image upload to Supabase Storage
- Private message/thread functionality
- CDEK pickup-point and city/PVZ lookup integration
- Telegram Mini App UI with Telegram WebApp SDK handling
- Lightweight app/event tracking for Mini App launches and outbound Telegram clicks

## Core user flow

1. A user opens the Telegram bot and sends `/start`.
2. The bot webhook validates Telegram's webhook secret header.
3. The backend creates a one-time nonce for the Telegram user.
4. The bot sends a Telegram Mini App launch button with the nonce.
5. The Mini App sends Telegram `initData` and/or the nonce to the backend.
6. The backend validates Telegram identity, consumes the nonce, and binds the Telegram user to an internal profile.
7. The application issues protected `HttpOnly` session cookies.
8. Authenticated users can create profiles, publish listings, like products, message sellers, and manage their own items.
9. Listings can pass through moderation before becoming visible in marketplace search.
10. Delivery UX can use CDEK city and pickup-point endpoints.

## Architecture overview

```text
Telegram Bot /start
        |
        v
app/api/tg-webhook/route.ts
        |
        | requests one-time nonce
        v
app/api/nonce/issue/route.ts
        |
        v
Telegram Mini App launch URL
        |
        v
Mini App frontend
        |
        | sends initData / nonce
        v
app/api/tg-auth/route.ts or app/api/nonce-login/route.ts
        |
        | validates Telegram identity and binds profile
        v
Supabase profiles + protected HttpOnly session
        |
        v
Marketplace API routes and Mini App UI
```

## Main folders

```text
app/                    Next.js App Router pages and API routes
app/api/                Server-side handlers for auth, listings, search, likes, CDEK, Telegram webhook
app/mini/               Telegram Mini App pages and mobile-first UI
components/             Reusable UI components and feature modules
components/mini/        Mini App authentication and profile components
components/sell/        Listing creation UI
lib/                    Supabase, Telegram auth, CDEK, and analytics helpers
types/                  Generated Supabase database types
supabase/               Local Supabase config snapshot
prisma/                 Early Prisma schema snapshot
```

## Tech stack

- Next.js App Router
- React
- TypeScript
- Supabase Auth/Database/Storage
- Telegram WebApp SDK
- `@telegram-apps/init-data-node`
- CDEK API integration
- Tailwind CSS
- Prisma schema snapshot

## Required environment variables

Create a local `.env.local` based on `.env.example`.

```bash
cp .env.example .env.local
```

Important: never commit real values from `.env.local`.

## Local development

```bash
pnpm install
pnpm dev
```

Open the app at `http://localhost:3000`.

