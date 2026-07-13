# Wachatra — CRM Template for WhatsApp

> Self-hostable CRM template for WhatsApp® — shared inbox, contacts,
> sales pipelines, broadcasts, and no-code automations. Fork it, brand
> it, host it.

<p align="center">
  <a href="https://www.hostinger.com/web-apps-hosting">
    <img src="./.github/assets/hostinger-deploy.png" alt="Ship your Node.js app in one click — Deploy to Hostinger" width="900">
  </a>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](./LICENSE)
[![CI](https://github.com/maajankiweb/WhatsApp-CRM/actions/workflows/ci.yml/badge.svg)](https://github.com/maajankiweb/WhatsApp-CRM/actions/workflows/ci.yml)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ecf8e?logo=supabase)](https://supabase.com)
[![Stars](https://img.shields.io/github/stars/maajankiweb/WhatsApp-CRM?style=social)](https://github.com/maajankiweb/WhatsApp-CRM/stargazers)

The marketing site and self-host docs live in a separate repo:
[maajankiweb/MY-WhatsApp-CRM-MJ-site](https://github.com/maajankiweb/MY-WhatsApp-CRM-MJ-site)
([wachatra.com](https://wachatra.com)). This repo is the product —
clone or fork it to run your own CRM.

## What you get out of the box

- **SaaS Split-Screen Authentication**: Redesigned **Login**, **Signup**, and **Forgot Password** pages featuring a desktop product showcase carousel, glassmorphic card overlays, custom inputs with animations, and OAuth/Google Sign-In integration.
- **Shared Inbox**: Multiple agents staffing a single WhatsApp number. Direct conversation assignment, internal notes, unread status indicators, and agent performance tracking.
- **No-Code Automations**: Visual drag-and-drop workflow builder. Triggers on inbound messages, new contacts, keywords, or cron schedules; contains action nodes (send template, add tag, create deal, trigger webhooks), wait delays, and conditional branches.
- **Sales Pipelines (Kanban)**: Track deal stages, assign lead statuses, configure follow-up variables, and monitor customer parameters directly from a Kanban board where deals are linked directly to chat logs.
- **AI Support Assistant & Knowledge Base**: Powered by OpenAI, Gemini, or Nvidia NIM. Automatically queries your custom knowledge base (using hybrid Postgres full-text or pgvector semantic embeddings) to resolve FAQs with custom conversation caps and seamless human handoffs.
- **GST Billing & Invoices**: Create and send professional, GST-compliant invoices directly inside WhatsApp (PDF invoices, payment reminders, and receipts powered by InvoBill).
- **School ERP Sync**: Pre-integrated with school management ERPs to broadcast fee alerts, student attendance reports, and exam results via automated templates.
- **White-Label Reseller Portal**: Map custom agency domains (CNAME mapping), configure reseller SMTP servers, customize dashboard CSS themes, logos, and favicons, and sell subscription packages directly to your clients.
- **Real-Time Analytics Dashboard**: Live metrics tracking (Open Convos, New Today, Avg Reply) and visual SVG graphs mapping incoming vs. outgoing messaging traffic over time.
- **Contacts + Tags + Custom Fields**: CSV lists upload, deduplication, custom parameters filtering, and dynamic segment management.
- **Broadcast Campaigns**: Send official Meta-approved template notifications with recipient variable substitution, delivery rates, and read tracking.
- **Public REST API & Model Context Protocol (MCP) Server**: Full REST API (`/api/v1`) with revocable API keys, and built-in MCP server support to drive your CRM securely from AI assistants like Claude or Cursor.
- **Modern Styling & Typographic Balancing**: Powered by Tailwind CSS v4 with custom variable scaling (e.g. 22px typography mapping) for optimal visual aesthetics.

## Why fork this?

This is a **template**, not a product. Forking means you get:

- **Full ownership** — your code, your Supabase project, your domain,
  your data. No SaaS lock-in, no seat pricing, no trust dance.
- **Full customisation** — add the fields your team needs, remove the
  modules you don't, redesign anything. The stack is boring on
  purpose (Next.js + Supabase + Tailwind) so the learning curve is
  short.
- **Zero ops to start** — [Hostinger](https://www.hostinger.com/web-apps-hosting)
  Managed Node.js deploys a fork in a few clicks. No Docker, no
  Kubernetes, no infra team needed.
  ([See below ↓](#-deploy-on-hostinger-recommended))
- **Real security primitives** — token encryption (AES-256-GCM), RLS
  on every table, HMAC-verified webhooks, CSP, rate limiting, CI
  typecheck/build on every PR.

Not a framework. Not an SDK. A concrete, working CRM you can stand up
in an afternoon and make yours.

## Quick start

```bash
# Fork on GitHub first: https://github.com/maajankiweb/WhatsApp-CRM → Fork
git clone https://github.com/<your-username>/WhatsApp-CRM.git
cd WhatsApp-CRM
npm install
cp .env.local.example .env.local   # fill in Supabase + Meta creds
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/login` (or
`/dashboard` if already signed in).

## 🚀 Deploy on Hostinger (recommended)

<p align="center">
  <a href="https://www.hostinger.com/web-apps-hosting">
    <img src="./.github/assets/hostinger-deploy.png" alt="Ship your Node.js app in one click — Deploy to Hostinger" width="1000">
  </a>
</p>
<p align="center">
  <a href="https://wachatra.com/docs/deployment-hostinger">
    <img src="https://img.shields.io/badge/Step--by--step_guide-wachatra.com%2Fdocs-111?style=for-the-badge" alt="Step-by-step guide" height="44">
  </a>
</p>

**Wachatra is built to run on [Hostinger](https://www.hostinger.com/web-apps-hosting).**
It's the path we test, document, and recommend — and the fastest way
to get a production-grade CRM live without owning a VPS or a
Kubernetes cluster.

### Why Hostinger?

| | |
|---|---|
| **One-click Git deploy** | Connect your fork, push to `main`, Hostinger builds and ships it. No SSH, no Docker, no CI to wire up — this repo's own `main` deploys this way. |
| **Managed Node.js** | Next.js 16 (App Router, server actions, ISR) runs out of the box on [Premium, Business, and Cloud](https://www.hostinger.com/web-apps-hosting) shared plans. You don't manage Node versions, processes, or reverse proxies. |
| **Free SSL + free domain** | Automatic Let's Encrypt on your custom domain (or a free one included with annual plans). HTTPS is on by default — required for the WhatsApp Business webhook. |
| **Global CDN + LiteSpeed** | Static assets cached at the edge, dynamic routes served from LiteSpeed. Snappy dashboards out of the box, no Cloudflare setup required. |
| **Env vars + logs in hPanel** | Set `SUPABASE_*`, `WHATSAPP_*`, and `ENCRYPTION_KEY` from the panel — no `.env` on the server. Live application logs in the same UI. |
| **DDoS protection + daily backups** | Built-in, no add-ons. The webhook endpoint is a public target — having protection at the edge matters. |
| **Cheaper than a VPS** | Plans start at a few dollars a month — order-of-magnitude less than a comparable managed Node.js host, and you don't pay extra for the database (that's Supabase). |
| **24/7 human support** | Live chat support in 20+ languages — useful when your CRM is the thing your team relies on to talk to customers. |

### The 60-second version

1. **Fork** this repo on GitHub.
2. In **hPanel → Websites → Create**, pick **Node.js** and connect
   your fork.
3. Paste your Supabase + Meta env vars into hPanel.
4. Push to `main`. Hostinger builds and serves it. Done.

Full walkthrough with screenshots:
**[wachatra.com/docs/deployment-hostinger](https://wachatra.com/docs/deployment-hostinger)**.

> _Note: Wachatra is MIT-licensed and runs anywhere Node.js does
> (Vercel, Railway, your own VPS). Hostinger is recommended, not
> required._

## Documentation

Full self-host documentation — Supabase migrations, WhatsApp Business
API config, and production deploy — lives at
**[wachatra.com/docs](https://wachatra.com/docs)**
(source: [maajankiweb/MY-WhatsApp-CRM-MJ-site](https://github.com/maajankiweb/MY-WhatsApp-CRM-MJ-site)).

Key pages:
- [Getting started](https://wachatra.com/docs/getting-started)
- [Supabase setup](https://wachatra.com/docs/supabase-setup)
- [WhatsApp setup](https://wachatra.com/docs/whatsapp-setup)
- [Environment variables](https://wachatra.com/docs/environment-variables)
- [Deploy on Hostinger](https://wachatra.com/docs/deployment-hostinger)
- [Architecture](https://wachatra.com/docs/architecture)
- [Troubleshooting](https://wachatra.com/docs/troubleshooting)

## Stack

- **App** — Next.js 16 (App Router), React 19, TypeScript, Tailwind v4.
- **Data** — Supabase (Postgres + Auth + Storage + RLS).
- **WhatsApp** — Meta Cloud API (official WhatsApp Business API).

## Contributing

This is a template, not a collaborative product — the expected flow is
fork → customise → deploy, **not** upstream contribution. Bug reports
and security issues are welcome; feature PRs often belong in your fork
rather than here. Details in
[`CONTRIBUTING.md`](./CONTRIBUTING.md) and
[`.github/SECURITY.md`](./.github/SECURITY.md).

## License

[MIT](./LICENSE). Fork it, brand it, host it.
