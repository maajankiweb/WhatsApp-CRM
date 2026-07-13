# Architecture Comparison: MJChatSyncs (InvoSuite) vs. ChatNexGen Ai (V2)

This document outlines the key architectural differences between **MJChatSyncs / InvoSuite** (our project) and **ChatNexGen Ai** (derived from the `sapatil2212/WhatsApp-Automation-CRM-V2` branch).

---

## 1. Core Architectural Differences

| Dimension | MJChatSyncs (InvoSuite) — Our Project | ChatNexGen Ai (V2 Repo) |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | Next.js 16 (App Router) + Custom Server |
| **Database** | **PostgreSQL (Supabase)** | **MySQL (via Prisma Client)** |
| **Real-time Engine** | **Supabase Realtime API** (Serverless friendly) | **Socket.io + HTTP Server** |
| **Authentication** | **Supabase Auth** | Custom Next-Auth / Prisma token-based |
| **Multi-Tenant Security** | **Database-level Row-Level Security (RLS)** | Application-level checks (No DB-level isolation) |
| **SaaS Billing & Limits** | **Razorpay Subscriptions & Quota Enforcement** | Basic Tenant Configurations (No payment gateway) |
| **White-Labeling & SMTP** | **Full Reseller Panel** with accent colors, custom logo, SMTP settings | Basic SMTP settings |
| **Verticals Support** | **AI Clinic Booking & Business Suite** (Integrated with Supabase RLS) | Clinic, Doctors & Slots MySQL records |

---

## 2. Technical Breakdown

### 2.1 Database & Real-Time Engines
* **ChatNexGen Ai (V2)** uses MySQL with Prisma and spins up a persistent HTTP server running Socket.io for bi-directional live dashboard updates.
* **MJChatSyncs** uses PostgreSQL managed by Supabase. We leverage **Supabase Realtime** listening to database replication streams. This allows our Next.js backend to remain serverless/edge-compatible, removing the need to manage and scale a custom Node.js Socket.io server.

### 2.2 Security & Tenant Isolation (RLS vs Application Code)
* In **ChatNexGen Ai (V2)**, tenant isolation is handled purely in the application routing/controllers code. If a developer forgets to filter by tenant in a new query, data leaks can occur.
* In **MJChatSyncs**, every table contains an `account_id` or `workspace_id` column, protected by **Supabase Row-Level Security (RLS)**. The database engine itself rejects queries trying to access other tenant records, guaranteeing absolute data isolation.

### 2.3 SaaS Billing, Subscription & Reseller System
* **MJChatSyncs** features a complete subscription package with **Razorpay integration** (auto-renewals, cancellations, upgrades). The system active limits check (`checkQuota`) prevents non-paying or downgraded organizations from exceeding their monthly limits (broadcast messages count, team seats, connected WhatsApp sessions, and AI replies).
* **V2** does not have an active payment gateway integration.

### 2.4 Domain-Specific Verticals (Healthcare & Business)
* While **V2** introduced the original schema for doctors, appointments, and general business enquiries, **MJChatSyncs** has fully ported and integrated these schemas into PostgreSQL migrations (`supabase/migrations/044_healthcare_and_business_domains.sql`) with active indices and RLS policies, making them production-ready.
