# AiSiteBuilder — Website Builder

Turn thoughts into websites instantly, with AI.

AiSiteBuilder is a full‑stack web app that lets anyone create a complete, responsive
single‑page website just by describing it in plain English. The AI generates the
HTML/Tailwind/JavaScript, you preview it live, refine it by chatting or editing
elements directly, keep a version history, and publish it to a shareable public URL.

---

## Table of contents

- [Why this project](#why-this-project)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [How it works (flow)](#how-it-works-flow)
- [Features](#features)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)

---

## Why this project

Building a website normally needs coding, design skill, and hosting setup. This
project removes all three:

| Problem | How AiSiteBuilder solves it |
| --- | --- |
| You can't code HTML/CSS | Describe the site in a sentence; AI writes the code |
| Design takes skill and time | AI applies modern, responsive Tailwind design by default |
| Iterating on a site is slow | Chat requests like "make the header blue" edit the existing site |
| Fear of breaking things | Every change is saved as a version you can roll back to |
| Hosting and sharing | One click publishes the site and gives it a public link |

---

## Tech stack

**Frontend** (`client/`)
- React 18 + TypeScript + Vite
- Tailwind CSS v4, shadcn/ui, Radix UI, lucide-react icons
- React Router v7
- better-auth (client) for sessions
- Axios for API calls
- Sonner for toasts

**Backend** (`server/`)
- Node.js + Express 5 (TypeScript, run with `tsx` / compiled with `tsc`)
- Prisma ORM + PostgreSQL
- better-auth (email & password) for authentication
- OpenAI SDK pointed at OpenRouter for AI generation (model: `stepfun/step-3.5-flash:free`)
- Stripe for credit purchases (Checkout + webhook)

---

## Project structure

```
website builder/
├── client/                     # React + Vite frontend
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx         # Landing page + prompt box to create a project
│       │   ├── Projects.tsx     # Builder view: chat sidebar + live preview
│       │   ├── Myprojects.tsx   # List of the user's projects
│       │   ├── Preview.tsx      # Full-screen preview of current / a version
│       │   ├── View.tsx         # Public view of a published site
│       │   ├── Community.tsx    # Gallery of published sites
│       │   ├── Pricing.tsx      # Credit plans / Stripe checkout
│       │   ├── Settings.tsx     # Account settings
│       │   ├── Loading.tsx      # Post-payment redirect screen
│       │   └── auth/AuthPage.tsx
│       ├── components/
│       │   ├── Navbar.tsx / Footer.tsx
│       │   ├── Sidebar.tsx          # Conversation + revision requests
│       │   ├── ProjectPreview.tsx   # iframe renderer + click-to-select
│       │   ├── EditorPanel.tsx      # Edit selected element (text, class, styles)
│       │   └── LoaderSteps.tsx
│       ├── configs/axios.ts         # Axios instance (withCredentials)
│       ├── lib/auth-client.ts       # better-auth React client
│       └── providers.tsx
│
└── server/                     # Express API
    ├── server.ts               # App entry: CORS, routes, Stripe raw body, auth handler
    ├── routes/
    │   ├── userRoutes.ts        # /api/user/*
    │   └── projectRoutes.ts     # /api/project/*
    ├── controllers/
    │   ├── userController.ts    # create project, credits, publish, purchase credits
    │   ├── projectController.ts # revisions, rollback, save, preview, delete, publish feed
    │   └── stripeWebhook.ts     # payment_intent.succeeded -> add credits
    ├── middlewares/auth.ts      # `protect` — verifies better-auth session
    ├── lib/
    │   ├── auth.ts              # better-auth config (Prisma adapter, cookies)
    │   └── prisma.ts            # Prisma client
    ├── configs/openai.ts        # OpenRouter client with manual retry/backoff
    └── prisma/schema.prisma     # DB schema + migrations
```

---

## How it works (flow)

### 1. Create a project
1. User signs in, types a description on the **Home** page, and submits.
2. `POST /api/user/project` creates a `WebsiteProject`, logs the prompt as a
   `Conversation` message, and deducts **5 credits**.
3. The response returns immediately with `projectId`; the frontend navigates to
   `/projects/:projectId`.
4. **In the background**, the server:
   - calls the AI to **enhance the prompt** into a detailed design spec,
   - calls the AI again to **generate a full HTML page** (Tailwind + JS),
   - strips code fences, saves it as the first `Version`,
   - sets `current_code` / `current_version_index` on the project,
   - writes assistant messages into the conversation.
   - If generation fails, the 5 credits are refunded.

### 2. Preview while generating
The **Projects** page polls `GET /api/user/project/:projectId` every 10s until
`current_code` exists, then renders it in an iframe via `ProjectPreview`.

### 3. Revise by chat
1. In the **Sidebar**, the user sends a change request.
2. `POST /api/project/revision/:projectId` deducts **5 credits**, enhances the
   request into edit instructions, then asks the AI to update the *current* HTML
   (not regenerate from scratch).
3. A new `Version` is created and becomes the current code.

### 4. Edit elements directly
Click an element in the preview to open `EditorPanel` and tweak its text, class
names, padding/margin, font size, and colors. `PUT /api/project/save/:projectId`
persists the edited HTML.

### 5. Version history & rollback
Every generation/revision is a `Version`. `GET /api/project/rollback/:projectId/:versionId`
restores an older version as the current code.

### 6. Publish & share
`GET /api/user/publish-toggle/:projectId` flips `isPublished`. Published sites are
served publicly at `/view/:projectId` (via `GET /api/project/published/:projectId`)
and listed in the **Community** gallery.

### 7. Buy more credits
Users start with **20 credits**. On **Pricing**, `POST /api/user/purchase-credits`
creates a Stripe Checkout session. On successful payment, the Stripe webhook
(`POST /api/stripe`) marks the transaction paid and increments the user's credits.

---

## Features

- **Prompt-to-website generation** — one sentence in, a full responsive site out.
- **Two-step AI pipeline** — prompt enhancement, then code generation.
- **Background generation** — UI stays responsive; preview appears when ready.
- **Chat-based revisions** — iterative edits that preserve existing structure.
- **Visual element editor** — click to select, edit text/classes/styles.
- **Version history + rollback** — never lose a working state.
- **Live device preview** — phone / tablet / desktop widths.
- **Download** — export the site as `index.html`.
- **Publish + public URL + Community gallery**.
- **Auth** — email & password via better-auth, secure session cookies.
- **Credits system** — 5 credits per create/revision, auto-refund on failure.
- **Stripe payments** — Basic / Pro / Enterprise credit packs.

---

## API reference

All `/api/user/*` and most `/api/project/*` routes require an authenticated
session (the `protect` middleware).

### User routes (`/api/user`)
| Method | Path | Description |
| --- | --- | --- |
| GET  | `/credits` | Current user's credit balance |
| POST | `/project` | Create a project from `initial_prompt`; triggers background generation |
| GET  | `/project/:projectId` | Get one project with conversation + versions |
| GET  | `/projects` | List the user's projects |
| GET  | `/publish-toggle/:projectId` | Publish / unpublish a project |
| POST | `/purchase-credits` | Create a Stripe Checkout session (`planId`: basic/pro/enterprise) |

### Project routes (`/api/project`)
| Method | Path | Description |
| --- | --- | --- |
| POST   | `/revision/:projectId` | Apply an AI revision (`message`) |
| PUT    | `/save/:projectId` | Save manually edited HTML (`code`) |
| GET    | `/rollback/:projectId/:versionId` | Restore an older version |
| DELETE | `/:projectId` | Delete a project |
| GET    | `/preview/:projectId` | Get project + versions for preview |
| GET    | `/published` | Public: list all published projects |
| GET    | `/published/:projectId` | Public: get a published project's code |

### Other
| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/stripe` | Stripe webhook (raw body) — credits users on payment |
| ALL  | `/api/auth/*` | better-auth handlers (sign in / sign up / session) |

---

## Data model

| Model | Purpose |
| --- | --- |
| `User` | Account, `credits` (default 20), `totalCreation` |
| `WebsiteProject` | A site: `initial_prompt`, `current_code`, `current_version_index`, `isPublished` |
| `Conversation` | Chat log per project (`role`: user / assistant) |
| `Version` | Snapshot of `code` for a project, with a description |
| `Transaction` | Credit purchase record (`planId`, `amount`, `credits`, `isPaid`) |
| `Session` / `Account` / `Verification` | better-auth tables |

---

## Local setup

### Prerequisites
- Node.js 18+
- A PostgreSQL database
- OpenRouter API key
- Stripe account (test keys) for the payments flow

### 1. Backend
```bash
cd server
npm install
# create server/.env (see below)
npx prisma migrate dev      # apply schema to your database
npm run server              # starts on http://localhost:3000 with nodemon + tsx
```

### 2. Frontend
```bash
cd client
npm install
# create client/.env (see below)
npm run dev                 # starts Vite dev server
```

### 3. Stripe webhook (optional, for payments)
```bash
stripe listen --forward-to localhost:3000/api/stripe
```

---

## Environment variables

### `server/.env`
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
PORT=3000
NODE_ENV=development

# better-auth
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your_random_secret
TRUSTED_ORIGINS=http://localhost:5173

# AI (OpenRouter)
AI_API_KEY=your_openrouter_api_key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

> Note: `server.ts` currently sets the CORS `origin` to the deployed frontend URL.
> For local development, point it at `http://localhost:5173`.

### `client/.env`
```env
VITE_API_URL=http://localhost:3000
```

---

## Deployment

- **Frontend** — Vercel (`client/vercel.json` handles SPA routing).
- **Backend** — any Node host (Render, Railway, Fly.io, etc.). Build with
  `npm run build` (`prisma generate && tsc`) and start with `npm start`
  (`node dist/server.js`).
- Set all environment variables on the host, update `TRUSTED_ORIGINS` and the
  CORS `origin` to the production frontend URL, and register the Stripe webhook
  endpoint at `<backend-url>/api/stripe`.
