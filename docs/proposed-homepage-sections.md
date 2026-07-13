# Proposed Homepage Sections for Wachatra Business OS

This document outlines the detailed specifications, visual design systems, and functional code architectures for the 5 proposed sections to be added to the Wachatra Homepage.

---

## 1. Industry-Specific Use Case Switcher

### Visual Design
* **Layout**: Two-column layout on desktop.
  * **Left Column**: Interactive vertical tab controllers (buttons) representing different industries.
  * **Right Column**: A dynamic card containing mock dashboards or chat flows corresponding to the active industry.
* **Aesthetics**: Glassmorphism (`bg-neutral-900/40 border-neutral-800`), colored shadows, and glowing accent rings matching the active industry's accent color.

### Copywriting & Content
* **E-commerce**:
  * *Title*: Recover 45% of Abandoned Carts Automatically.
  * *Description*: Send personalized WhatsApp notifications with discount codes when a buyer leaves checkout.
  * *Points*: Abandoned Cart Alerts, Payment Links Integration, Dynamic Product Catalog.
* **Healthcare & Clinics**:
  * *Title*: Eliminate No-Shows with Automated Bookings.
  * *Description*: Patients query doctor schedules and reserve slots directly on WhatsApp.
  * *Points*: Instant Slot Check, Automated Reminder Alerts, Direct CRM sync.
* **Real Estate**:
  * *Title*: Qualify Leads Instantly 24/7.
  * *Description*: Automate property photo delivery and filter serious buyers before hopping on calls.
  * *Points*: Instant Property Brochure, Lead Budget Filtering, Sales Agent Routing.
* **Education**:
  * *Title*: Keep Parents Informed on the Go.
  * *Description*: Automate fee receipts, attendance summaries, and exam report cards directly.
  * *Points*: School ERP Sync, Automated Fee Reminders, Broadcast Announcements.

---

## 2. Interactive ROI Calculator

### Visual Design
* **Layout**: Centered container with two sliders (Inputs) and a large summary card (Output).
* **Aesthetics**: Glowing Emerald metrics, smooth slider tracks, and a highlighted estimated monthly savings card.

### Functional Architecture (React Code Blueprint)
```tsx
import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

export default function ROICalculator() {
  const [messages, setMessages] = useState(25000);
  const [teamSize, setTeamSize] = useState(5);

  // Math equations
  const manualTimeHours = Math.round((messages * 1.5) / 60); // 1.5 mins per message
  const automatedTimeHours = Math.round((messages * 0.1) / 60);
  const hoursSaved = manualTimeHours - automatedTimeHours;
  const supportSalaryRate = 250; // INR per hour avg
  const estimatedSavings = hoursSaved * supportSalaryRate;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-neutral-950/40 border border-neutral-900 rounded-3xl">
      <h3 className="text-xl font-bold mb-6 text-white text-center">Calculate Your ROI</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">Monthly Messages: {messages.toLocaleString()}</label>
            <input 
              type="range" min="5000" max="100000" step="5000" value={messages} 
              onChange={(e) => setMessages(Number(e.target.value))} 
              className="w-full accent-emerald-500 bg-neutral-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">Team Size: {teamSize} Agents</label>
            <input 
              type="range" min="2" max="30" step="1" value={teamSize} 
              onChange={(e) => setTeamSize(Number(e.target.value))} 
              className="w-full accent-emerald-500 bg-neutral-900"
            />
          </div>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 flex flex-col justify-center text-center">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Estimated Monthly Savings</span>
          <span className="text-4xl sm:text-5xl font-black text-white mt-4 block">₹{estimatedSavings.toLocaleString()}</span>
          <span className="text-[10px] text-slate-500 mt-2 block">Saves approximately {hoursSaved} support hours/month</span>
        </div>
      </div>
    </div>
  );
}
```

---

## 3. Native Integrations Grid

### Visual Design
* **Layout**: Multi-column logo cloud or floating circular arrangement.
* **Aesthetics**: Each logo is contained in an outline box that lights up with its brand color on hover.

### Integration Details
1. **Shopify**: Trigger abandoned cart recovery flow, update shipment status.
2. **Razorpay**: Send payment checkout links and automated receipts.
3. **Google Sheets**: Auto-export lead contact details and survey replies.
4. **WooCommerce**: Instantly update orders and inventory notifications.
5. **IndiaMart & JustDial**: Automatically capture incoming local business leads and trigger AI qualification sequences.

---

## 4. Wachatra vs. Competitors Table

### Visual Design
* **Layout**: Matrix grid highlighting Wachatra in an active green border to draw focus.
* **Aesthetics**: Bold headers, clear checkmarks (`CheckCircle2` in green) vs. crosses (in grey).

### Comparison Matrix
| Feature | Wachatra | Wati / Aisensy | Intercom |
| :--- | :---: | :---: | :---: |
| **White-Label Agency** | **Yes** (Custom Domains & SMTP) | No | No |
| **GST Billing Integration** | **Yes** (Built-in InvoBill) | No | No |
| **No-Code Flow Builder** | **Yes** (Figma-style drag-and-drop) | Limited | Complex |
| **Anti-Ban Architecture** | **Yes** (Official Meta APIs Only) | Yes | Yes |
| **Indian ERP Sync** | **Yes** (School ERPs & Clinics) | No | No |
| **Flat Subscriptions** | **Yes** (Unlimited Messages) | Extra Charges | Very Expensive |

---

## 5. Security & Official Meta Compliance

### Visual Design
* **Layout**: Centered header, 3-column stats list with security badges (Shield, Lock, FileText).
* **Aesthetics**: Deep dark grey backgrounds with warning/violet safety highlights.

### Content Bullet Points
* **Meta Official Partner Compliance**:
  * Officially approved API usage. Absolutely zero browser extensions or web-client automations, guaranteeing your business number stays 100% compliant.
* **Enterprise Data Encryption**:
  * All user keys, databases, and customer records are protected with 256-bit encryption. Restrict access through role-based credentials.
* **High Uptime Infrastructure**:
  * Powered by Hostinger Node.js servers with an average 99.9% API connection rate. Your automations never drop.
