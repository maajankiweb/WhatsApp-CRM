# Wachatra — Upcoming Features & CRM Roadmap

This document outlines the roadmap and features list to be implemented in the Wachatra WhatsApp CRM to transform it into a complete enterprise-grade SaaS product, matching top agency providers.

---

## 1. Sales & Inbox Enhancement

### 1.1 Canned Responses (Quick Replies / Shortcuts)
- **Feature**: Create keyboard shortcuts (e.g., `/price`, `/discount`, `/gst`) for agents to quickly trigger pre-saved text, images, or template responses in the inbox.
- **Benefits**: Faster response times, less repetitive typing, consistent messaging across agents.
- **Tech Hook**: Add a new table `canned_responses` (columns: `id`, `account_id`, `shortcut`, `content`, `media_url`) with RLS protection. Render matching dropdowns inside the Chat Inbox text input on typing `/`.

### 1.2 Interactive Website WhatsApp Chat Widget
- **Feature**: Provide a snippet builder inside Settings allowing customers to generate a floating WhatsApp widget code to embed on their external websites.
- **Benefits**: Converts website traffic directly into CRM leads.
- **Tech Hook**: Serves a static script `/js/widget.js` that pulls configurations (bubble text, avatar, agent number) from the CRM organization, launching a redirection or direct message logs.

### 1.3 Custom Lead Fields Sidebar (CRM Directory Side Panel)
- **Feature**: A right-sidebar inside the active Chat Inbox page displaying custom qualification fields (e.g., Lead Source, Budget, GSTIN, Company Name, Address) and contact notes.
- **Benefits**: Allows agents to qualify leads and save database profile contexts dynamically during conversations.

---

## 2. Advanced Automations & AI Agent Copilot

### 2.1 AI Draft Copilot (Inbox Assistant)
- **Feature**: Place an "AI Draft" or "Suggest Reply" button in the active chat input bar. When clicked, it queries OpenAI/Gemini using the last few messages and custom Knowledge Base context, drafting a response for the agent to review, edit, and send.
- **Benefits**: Reduces human search time while maintaining control over final outbound messages.

### 2.2 Smart Round-Robin Routing
- **Feature**: Automatically assign incoming WhatsApp chats to online agents in a cyclic distribution pattern.
- **Benefits**: Fair workload distribution and optimized agent queues.

### 2.3 Working Hours & Out-of-Office (OOO) Auto-Reply
- **Feature**: Setup day-by-day business hours (e.g., Mon-Fri 9:00 AM - 6:00 PM). Automatically trigger OOO automated responses if a customer messages outside these hours.

---

## 3. E-Commerce & Payment Gateway Integrations

### 3.1 Shopify & WooCommerce Cart Recovery
- **Feature**: Native API hooks connecting to Shopify/WooCommerce stores.
- **Benefits**: Auto-detects abandoned checkouts, sending recovery notifications with discount codes directly on WhatsApp. Syncs delivery tracking numbers to customer alerts.

### 3.2 Dynamic Payment Requests (Razorpay & UPI)
- **Feature**: Generate dynamic payment links or UPI QR codes directly inside the Chat Inbox.
- **Benefits**: Allows merchants to collect deposits or invoice amounts in real-time inside the chat. Instantly updates conversation status on webhook settlement.

---

## 4. Marketing Campaigns & Segments

### 4.1 Meta Template Builder (No-Code Approval Panel)
- **Feature**: Interface to design and submit message templates (text, buttons, variables) to Meta directly, without logging into the Facebook Developer dashboard.
- **Benefits**: Speeds up template lifecycle setup.

### 4.2 Targeted Broadcast Segmentation
- **Feature**: Build dynamic segments based on contact fields, pipeline stages, or tags (e.g., "Send campaign to all users tagged 'Lead' who haven't replied in 7 days").

---

## 5. Reseller White-Label Capabilities

### 5.1 Auto-SSL Domain Mapping
- **Feature**: Automates SSL provisioning (e.g. via Cloudflare SaaS custom hostnames or Let's Encrypt API) when agencies map custom domains (CNAMEs).

### 5.2 Custom SMTP Configuration per Tenant
- **Feature**: Allows agencies to input their own email credentials (SES, SendGrid, Mailgun) for invitations, invoices, and password resets.
