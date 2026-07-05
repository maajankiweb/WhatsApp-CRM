# MJChatSyncs SaaS - Development Rules & Guidelines

This workspace is being evolved into **MJChatSyncs (InvoSuite)**, a premium white-label multi-tenant WhatsApp CRM and Business Suite targeted at Indian SMBs and global agencies.

## SaaS Architecture Constraints

### 1. Multi-Tenant Architecture
* **Tenant Isolation:** All database tables must have `account_id` or `workspace_id` columns, enforced by Supabase Row-Level Security (RLS). Users must never cross-read data.
* **Workspace Concept:** A workspace represents a tenant/business. A user can belong to multiple workspaces with roles (`owner`, `admin`, `agent`, `viewer`).

### 2. Billing & Subscription (Razorpay Integration)
* **Razorpay Webhooks:** Subscriptions, payments, and cancellations must be processed via a dedicated endpoint (`/api/billing/razorpay/webhook`).
* **Usage Limits:** Subscriptions control limits on:
  - Number of connected WhatsApp numbers (sessions)
  - Number of contacts
  - Monthly broadcast message quotas
  - Team member seats
  - AI Reply Assistant usage

### 3. White Labeling & Reselling
* **Custom Domains:** Allow agencies to map custom domains (CNAME pointing to your server) to their workspace.
* **Branding Options:** Agencies can configure their own logo, favicon, accent colors, SMTP server for emails, and support links via the Agency Admin panel.
* **Reseller Plan:** Agencies pay a high-tier subscription fee to host their own custom-branded clients under their account.

### 4. Codebase Styling & Aesthetics
* **Premium SaaS Design:** Follow high-end modern SaaS aesthetics. Use rich gradients, glassmorphic cards (`backdrop-blur-md bg-card/60 border-border/50`), elegant typography, and micro-interactions.
* **Dark Mode Default:** Keep a sleek dark mode appearance for the landing page and app shell.
