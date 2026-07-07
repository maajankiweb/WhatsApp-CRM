"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);

  const pricingPlans = [
    {
      name: 'Starter',
      price: isYearly ? 799 : 999,
      description: 'Essential features for local businesses and shops.',
      features: [
        '1 WhatsApp Number Session',
        '1,000 Contacts Limit',
        'Shared Inbox (Up to 3 Agents)',
        'Basic Auto-Responder',
        'Broadcast Templates Scheduler',
        'Email Support',
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: 'Pro',
      price: isYearly ? 1599 : 1999,
      description: 'Advanced WhatsApp campaigns & AI automations.',
      features: [
        '3 WhatsApp Number Sessions',
        '10,000 Contacts Limit',
        'Unlimited Inbox Agents',
        'No-Code Chatbot Flow Builder',
        'AI Reply Assistant (BYO Key)',
        'Google Sheets & Webhooks Sync',
        'Priority Chat Support',
      ],
      cta: 'Get Pro Access',
      popular: true,
    },
    {
      name: 'Business Suite',
      price: isYearly ? 3999 : 4999,
      description: 'Complete Indian Business OS with white-label portal.',
      features: [
        'Unlimited WhatsApp Numbers',
        'Unlimited Contacts & Uploads',
        'GST Billing & Invoicing (InvoBill)',
        'School/Hospital ERP Connect',
        'Full Agency White-Label Portal',
        'Custom Domain Mapping',
        '24/7 Dedicated Account Manager',
      ],
      cta: 'Upgrade to Business',
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-neutral-950/40 border-y border-neutral-900/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 bg-primary/10 border-primary/20 text-primary">
            Pricing Plans
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-6">
            Flexible Plans, No Hidden Fees
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Pick the right tier for your operations. All plans include Razorpay recurring subscription support.
          </p>

          {/* Pricing Toggle */}
          <div className="inline-flex items-center gap-3 bg-neutral-900/80 border border-neutral-800 p-1.5 rounded-full">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-4.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                !isYearly ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-4.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isYearly ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-white'
              }`}
            >
              Yearly (20% Off)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {pricingPlans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col justify-between border bg-neutral-900/20 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 ${
                plan.popular ? 'border-primary shadow-2xl shadow-primary/10 bg-neutral-900/40' : 'border-neutral-900'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-semibold px-3 py-1 shadow">
                  Most Popular
                </Badge>
              )}
              <div>
                <CardHeader className="p-6.5 border-b border-neutral-900">
                  <CardTitle className="text-2xl font-bold text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-sm mt-2 text-[#9ea3b0]">{plan.description}</CardDescription>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-xl font-medium text-white">₹</span>
                    <span className="text-4.5xl font-black text-white">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">/ month</span>
                  </div>
                </CardHeader>
                <CardContent className="p-6.5 space-y-4">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <Check className="w-4.5 h-4.5 text-primary shrink-0" />
                      <span className="text-sm text-[#e3e6ed]">{feature}</span>
                    </div>
                  ))}
                </CardContent>
              </div>
              <div className="p-6.5 pt-0 mt-auto">
                <Link href="/login">
                  <Button
                    className={`w-full py-5 h-auto text-sm font-semibold shadow-lg transition-all ${
                      plan.popular
                        ? 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
                        : 'bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
