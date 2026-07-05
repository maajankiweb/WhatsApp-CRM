'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Check,
  Users,
  MessageSquare,
  BarChart3,
  Megaphone,
  Bot,
  Shield,
  Zap,
  Star,
  Eye,
  Globe,
  Lock,
  Database,
  Bolt,
  Code2,
  Receipt,
  GraduationCap,
  IndianRupee,
  Layers,
  Sparkles,
  ChevronDown,
  Building2,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Animation on scroll hook
function useScrollAnimation() {
  const [animatedSections, setAnimatedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setAnimatedSections(prev => new Set(prev).add(entry.target.id));
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('[data-animate]').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return animatedSections;
}

// Starry background component
function StarryBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
      <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-primary/20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute top-1/2 left-1/3 w-1 h-1 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-2/3 right-1/3 w-1 h-1 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
      <div className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-primary/20 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-1/3 right-1/2 w-1 h-1 bg-primary/40 rounded-full animate-pulse" style={{ animationDelay: '2.5s' }} />
      <div className="absolute top-1/5 left-1/2 w-1 h-1 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
      <div className="absolute bottom-1/5 right-1/4 w-1 h-1 bg-primary/20 rounded-full animate-pulse" style={{ animationDelay: '3.5s' }} />
    </div>
  );
}

// Floating animation wrapper
function FloatAnimation({ children, delay = '0s' }: { children: React.ReactNode; delay?: string }) {
  return (
    <div className="animate-float" style={{ animationDelay: delay }}>
      {children}
    </div>
  );
}

// Tech stack badges
function TechStack() {
  const tech = [
    { name: 'Next.js 16', color: 'bg-black text-white border border-neutral-800' },
    { name: 'React 19', color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
    { name: 'TypeScript', color: 'bg-blue-600/10 text-blue-300 border border-blue-600/20' },
    { name: 'Tailwind CSS v4', color: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' },
    { name: 'Supabase DB', color: 'bg-green-500/10 text-green-400 border border-green-500/20' },
    { name: 'Meta Cloud API', color: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' },
    { name: 'MongoDB Atlas', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-2 mt-6">
      {tech.map((t) => (
        <Badge key={t.name} className={`${t.color} px-3 py-1 text-xs font-normal rounded-full`}>
          {t.name}
        </Badge>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const animatedSections = useScrollAnimation();
  const [isYearly, setIsYearly] = useState(false);
  const [activeFaq, setActiveFaq] = useState<string | null>(null);

  const features = [
    {
      id: 'shared-inbox',
      icon: Users,
      title: 'Shared Team Inbox',
      description: 'Multiple agents working on a single WhatsApp number. Direct conversation assignment, internal notes, and agent performance analytics.',
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/5 border-violet-500/10 hover:border-violet-500/30',
    },
    {
      id: 'flow-builder',
      icon: Zap,
      title: 'No-Code Flow Builder',
      description: 'Design visual chatbot automation workflows. Setup interactive list messages, button replies, delay nodes, and API webhooks.',
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/5 border-rose-500/10 hover:border-rose-500/30',
    },
    {
      id: 'ai-reply',
      icon: Bot,
      title: 'AI Support Assistant',
      description: 'Intelligent auto-replies powered by OpenAI, Gemini, or Nvidia NIM. Automatically queries your KB to handle customer FAQs.',
      color: 'text-primary',
      bgColor: 'bg-primary/5 border-primary/10 hover:border-primary/30',
    },
    {
      id: 'gst-billing',
      icon: Receipt,
      title: 'GST Billing & Invoices',
      description: 'Create and send professional GST-compliant invoices directly inside WhatsApp. Send PDF invoices, payment reminders, and receipts.',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30',
    },
    {
      id: 'school-erp',
      icon: GraduationCap,
      title: 'School ERP Modules',
      description: 'Integrate directly with school management systems. Auto-broadcast fee alerts, exam report cards, and student attendance notifications.',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/5 border-amber-500/10 hover:border-amber-500/30',
    },
    {
      id: 'white-label',
      icon: Layers,
      title: 'White-Label Portal',
      description: 'Agencies can rebrand the platform. Configure your own agency logo, support domain, colors, and plans to sell to your clients.',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/5 border-cyan-500/10 hover:border-cyan-500/30',
    },
  ];

  const benefits = [
    {
      icon: Shield,
      title: 'Enterprise Tenant Isolation',
      description: 'Supabase RLS secures multi-tenant workspace partitions. Your customer data remains securely separated.',
    },
    {
      icon: Globe,
      title: 'Official Meta Cloud API',
      description: 'Built on the stable Meta Business API. Zero risk of WhatsApp numbers getting banned compared to web-automation hacks.',
    },
    {
      icon: Database,
      title: 'Hybrid Database Architecture',
      description: 'Supabase PostgreSQL powers core CRM, while MongoDB Atlas acts as the high-throughput engine for chats and AI context.',
    },
    {
      icon: Bolt,
      title: 'White-Label Ready',
      description: 'Fully responsive white-labeling module enables agencies to build a fully customizable SaaS product in minutes.',
    },
  ];

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

  const faqs = [
    {
      question: 'Is this an official WhatsApp business solution?',
      answer: 'Yes, MJChatSyncs utilizes the official Meta WhatsApp Cloud API. We do not use browser automation or unofficial web-client hacks, ensuring your business number is completely safe from suspension.',
    },
    {
      question: 'How does the White-Label feature work?',
      answer: 'Under the Business Suite plan, agencies get access to a custom admin dashboard. You can map your own domain (e.g., crm.youragency.com), customize the CSS themes, add your logo, and sell subscription packages directly to your clients.',
    },
    {
      question: 'Can we integrate it with our local billing or ERP systems?',
      answer: 'Absolutely. We support incoming and outgoing webhooks, as well as a full REST API. The Business Suite comes pre-integrated with InvoBill for GST invoicing and standard school ERP systems.',
    },
    {
      question: 'Is there a limit to how many messages we can send?',
      answer: 'No, we do not charge per message. You only pay the flat subscription price. However, Meta\'s standard messaging fees for business-initiated conversations apply directly to your Meta billing account.',
    },
    {
      question: 'Do we need a dedicated server to host this?',
      answer: 'MJChatSyncs is optimized for Hostinger Managed Node.js, Vercel, or custom VPS. The setup is highly automated, and you can get up and running with a single-click deploy.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0c10] text-[#e3e6ed] relative overflow-x-hidden font-sans antialiased">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Starry Background */}
      <StarryBackground />

      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0c10]/80 border-b border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
                <MessageSquare className="w-5.5 h-5.5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-white leading-none">MJChatSyncs</span>
                <span className="text-[10px] text-muted-foreground mt-1">InvoSuite Business OS</span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm font-medium hover:text-white text-muted-foreground transition-colors">Features</Link>
              <Link href="#white-label" className="text-sm font-medium hover:text-white text-muted-foreground transition-colors">White-Label</Link>
              <Link href="#pricing" className="text-sm font-medium hover:text-white text-muted-foreground transition-colors">Pricing</Link>
              <Link href="#faq" className="text-sm font-medium hover:text-white text-muted-foreground transition-colors">FAQ</Link>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-white">Sign In</Button>
              </Link>
              <Link href="/login">
                <Button className="shadow-lg shadow-primary/20 text-sm font-medium">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" data-animate="hero" className="relative pt-20 pb-16 sm:pt-32 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary tracking-wide uppercase">Next-Gen WhatsApp SaaS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7.5xl font-black tracking-tight text-white leading-tight mb-8">
            Complete WhatsApp CRM & <br/>
            <span className="bg-gradient-to-r from-primary via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Business Suite for India
            </span>
          </h1>

          <p className="text-base sm:text-xl text-[#9ea3b0] max-w-3xl mx-auto leading-relaxed mb-12">
            Shared team inbox, no-code visual chatbot flows, and broadcast campaigns. Pre-integrated with GST Invoicing (InvoBill) and school/hospital ERP systems. Rebrand and sell as your own SaaS.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4.5">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto px-8 py-6 h-auto text-base font-semibold shadow-xl shadow-primary/20 gap-2">
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-6 h-auto text-base font-semibold border-neutral-800 hover:bg-neutral-900 gap-2">
                <Eye className="w-4 h-4" />
                Explore Features
              </Button>
            </Link>
          </div>

          <div className="mt-12 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Official Cloud API
            </div>
            <span className="hidden sm:inline text-neutral-800">•</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Razorpay Subscriptions
            </div>
            <span className="hidden sm:inline text-neutral-800">•</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              White-Labeling Support
            </div>
          </div>

          <TechStack />
        </div>

        {/* Hero Mockup Visual */}
        <div className="mt-20 max-w-6xl mx-auto px-4 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-transparent to-transparent z-10" />
          <div className="relative rounded-2xl p-2.5 bg-neutral-900/40 border border-neutral-800/80 shadow-2xl backdrop-blur-3xl">
            <div className="bg-[#0e1117] rounded-xl overflow-hidden border border-neutral-900 aspect-video flex flex-col">
              {/* Fake Window Header */}
              <div className="h-11 bg-[#0b0d13] border-b border-neutral-900 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="text-[11px] text-muted-foreground font-mono bg-neutral-900/60 px-4 py-1 rounded border border-neutral-800/50">
                  app.mjchatsyncs.com/dashboard
                </div>
                <div className="w-12" />
              </div>
              {/* Fake Dashboard Body */}
              <div className="flex-1 grid grid-cols-5 p-6 gap-6 bg-[#0a0c11]">
                <div className="col-span-1 border-r border-neutral-900/80 pr-6 space-y-4">
                  <div className="w-full h-8 bg-primary/10 rounded border border-primary/20 flex items-center px-3 gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    <div className="w-12 h-2.5 bg-primary/20 rounded" />
                  </div>
                  <div className="w-full h-8 rounded hover:bg-neutral-900/50 flex items-center px-3 gap-2">
                    <Users className="w-3.5 h-3.5 text-neutral-600" />
                    <div className="w-16 h-2 bg-neutral-800 rounded" />
                  </div>
                  <div className="w-full h-8 rounded hover:bg-neutral-900/50 flex items-center px-3 gap-2">
                    <Receipt className="w-3.5 h-3.5 text-neutral-600" />
                    <div className="w-14 h-2 bg-neutral-800 rounded" />
                  </div>
                  <div className="w-full h-8 rounded hover:bg-neutral-900/50 flex items-center px-3 gap-2">
                    <Layers className="w-3.5 h-3.5 text-neutral-600" />
                    <div className="w-20 h-2 bg-neutral-800 rounded" />
                  </div>
                </div>

                <div className="col-span-4 grid grid-rows-6 gap-6">
                  {/* Cards Row */}
                  <div className="row-span-2 grid grid-cols-3 gap-6">
                    <div className="bg-[#0e1117] rounded-xl p-5 border border-neutral-900 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Active Chats</span>
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-2xl font-bold text-white mt-2">1,248</span>
                    </div>
                    <div className="bg-[#0e1117] rounded-xl p-5 border border-neutral-900 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">GST Invoiced</span>
                        <Receipt className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-2xl font-bold text-white mt-2">₹48,250</span>
                    </div>
                    <div className="bg-[#0e1117] rounded-xl p-5 border border-neutral-900 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">AI Resolution</span>
                        <Bot className="w-4 h-4 text-violet-400" />
                      </div>
                      <span className="text-2xl font-bold text-white mt-2">84.2%</span>
                    </div>
                  </div>

                  {/* Graph Area */}
                  <div className="row-span-4 bg-[#0e1117] rounded-xl border border-neutral-900 p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold text-white">Daily Message Analytics</span>
                      <Badge variant="outline" className="text-[10px] bg-neutral-900 border-neutral-800">Live</Badge>
                    </div>
                    <div className="flex-1 flex items-end gap-3.5 pt-4">
                      <div className="flex-1 bg-primary/20 rounded-t h-[40%] border-t border-primary/40" />
                      <div className="flex-1 bg-primary/30 rounded-t h-[60%] border-t border-primary/50" />
                      <div className="flex-1 bg-primary/20 rounded-t h-[30%] border-t border-primary/40" />
                      <div className="flex-1 bg-gradient-to-t from-primary/30 to-primary/60 rounded-t h-[85%] border-t border-primary" />
                      <div className="flex-1 bg-primary/20 rounded-t h-[50%] border-t border-primary/40" />
                      <div className="flex-1 bg-primary/40 rounded-t h-[70%] border-t border-primary/60" />
                      <div className="flex-1 bg-gradient-to-t from-primary/40 to-primary/80 rounded-t h-[95%] border-t-2 border-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        data-animate="features"
        className={`py-24 bg-neutral-950/40 border-y border-neutral-900/60 transition-all duration-1000 ${
          animatedSections.has('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge variant="outline" className="mb-4 bg-primary/10 border-primary/20 text-primary px-3.5 py-1">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Unified Business OS
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-6">
              Features Built for Growth
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2.5xl mx-auto">
              Combine customer messaging with operations, invoicing, and white-label agency power in a single dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6.5">
            {features.map((feature, index) => (
              <FloatAnimation key={feature.id} delay={`${index * 0.08}s`}>
                <Card className={`h-full border bg-neutral-900/30 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:bg-neutral-900/60 shadow-lg ${feature.bgColor} group`}>
                  <CardHeader className="p-7">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center border border-neutral-800 shadow-md group-hover:scale-105 transition-transform duration-300">
                      <feature.icon className={`w-6.5 h-6.5 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl font-bold mt-5 text-white">{feature.title}</CardTitle>
                    <CardDescription className="text-sm mt-3.5 text-[#9ea3b0] leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </FloatAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* Indian Market Integration Section */}
      <section
        id="integrations"
        data-animate="integrations"
        className={`py-24 transition-all duration-1000 ${
          animatedSections.has('integrations') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-neutral-950 to-neutral-900/50 rounded-3xl p-8 sm:p-16 border border-neutral-900 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px]" />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge variant="outline" className="mb-4 bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                  <IndianRupee className="w-3.5 h-3.5 mr-1" />
                  Made For Indian Businesses
                </Badge>
                <h2 className="text-3xl sm:text-4.5xl font-black tracking-tight text-white mb-6">
                  GST Invoicing & <br/>
                  School ERP Integration
                </h2>
                <p className="text-muted-foreground text-base sm:text-lg mb-8 leading-relaxed">
                  Most CRM templates only handle chat. **MJChatSyncs** bridges the gap by integrating GST invoicing (via InvoBill) and local School/Hospital ERPs. Broadcast auto-reminders, invoice PDFs, and student attendance alerts automatically.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                    <div>
                      <span className="font-semibold text-white block">Automated Payment Reminders</span>
                      <span className="text-sm text-muted-foreground">Send payment requests with Razorpay/UPI links and auto-reconciliation.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
                    <div>
                      <span className="font-semibold text-white block">School ERP Attendance & Marks</span>
                      <span className="text-sm text-muted-foreground">Alert parents regarding attendance status, homework, and reports automatically.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#080a0e] rounded-2xl p-6 sm:p-8 border border-neutral-900/80 shadow-xl relative">
                <h3 className="font-bold text-white text-lg mb-6 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  Active InvoBill Invoice Output
                </h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-900 flex justify-between items-center">
                    <div>
                      <span className="text-xs text-muted-foreground block">CLIENT</span>
                      <span className="text-sm font-semibold text-white">Shree Balaji Enterprises</span>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">PAID</Badge>
                  </div>
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-900 flex justify-between items-center">
                    <div>
                      <span className="text-xs text-muted-foreground block">GST DETAILS (GSTIN)</span>
                      <span className="text-sm font-mono text-white">07AAAAA1111A1Z1</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-900 flex justify-between items-center">
                    <div>
                      <span className="text-xs text-muted-foreground block">TOTAL INVOICED AMOUNT</span>
                      <span className="text-base font-bold text-white">₹14,850.00</span>
                    </div>
                    <span className="text-xs text-[#9ea3b0]">CGST 9% + SGST 9%</span>
                  </div>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 text-white gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Broadcast via WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* White Label / Agency Section */}
      <section
        id="white-label"
        data-animate="white-label"
        className={`py-24 bg-neutral-950/20 border-t border-neutral-900/60 transition-all duration-1000 ${
          animatedSections.has('white-label') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-primary/5 rounded-2xl blur-[40px]" />
              <div className="bg-[#0e1117]/80 rounded-2xl p-8 border border-neutral-800 shadow-2xl relative">
                <div className="h-8 flex items-center justify-between border-b border-neutral-900 pb-4 mb-6">
                  <span className="text-xs font-semibold text-white">Agency White-Label Customization</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                </div>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs text-[#9ea3b0]">Agency Domain (CNAME Mapping)</label>
                    <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-900 font-mono text-sm text-cyan-400">
                      crm.maajankiweb.com
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[#9ea3b0]">SaaS Theme Branding</label>
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded bg-primary border border-white/20" />
                      <div className="w-8 h-8 rounded bg-violet-600" />
                      <div className="w-8 h-8 rounded bg-emerald-500" />
                      <div className="w-8 h-8 rounded bg-amber-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-[#9ea3b0]">Logo & Favicon</label>
                    <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-900 text-xs text-muted-foreground flex items-center justify-between">
                      <span>maajanki-logo.png</span>
                      <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary text-[10px]">Loaded</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <Badge variant="outline" className="mb-4 bg-cyan-500/10 border-cyan-500/20 text-cyan-400">
                <Layers className="w-3.5 h-3.5 mr-1" />
                Agencies & Resellers
              </Badge>
              <h2 className="text-3xl sm:text-4.5xl font-black tracking-tight text-white mb-6">
                Start Your Own SaaS Business
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg mb-8 leading-relaxed">
                Empower your agency to sell WhatsApp CRM software to local clients under your own brand. Custom colors, domains, emails, and subscription billing. Agencies have full control over client setups and workspace allocations.
              </p>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-900">
                  <Globe className="w-5 h-5 text-cyan-400 mb-2.5" />
                  <span className="font-semibold text-white block mb-1">Custom Domain</span>
                  <span className="text-xs text-muted-foreground">Map client workspaces to your brand domain seamlessly.</span>
                </div>
                <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-900">
                  <IndianRupee className="w-5 h-5 text-cyan-400 mb-2.5" />
                  <span className="font-semibold text-white block mb-1">Custom Pricing</span>
                  <span className="text-xs text-muted-foreground">Define and collect payments under your own subscription plans.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        data-animate="pricing"
        className={`py-24 bg-neutral-950/40 border-y border-neutral-900/60 transition-all duration-1000 ${
          animatedSections.has('pricing') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
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

      {/* FAQ Section */}
      <section
        id="faq"
        data-animate="faq"
        className={`py-24 transition-all duration-1000 ${
          animatedSections.has('faq') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 bg-primary/10 border-primary/20 text-primary">
              FAQ
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Have questions about the CRM platform? We have answers.
            </p>
          </div>

          <div className="space-y-4.5">
            {faqs.map((faq) => {
              const isOpen = activeFaq === faq.question;
              return (
                <Card
                  key={faq.question}
                  className={`border bg-[#0c0f16] cursor-pointer transition-all duration-300 hover:border-neutral-800 ${
                    isOpen ? 'border-primary/50 shadow' : 'border-neutral-900'
                  }`}
                  onClick={() => setActiveFaq(isOpen ? null : faq.question)}
                >
                  <CardHeader className="p-5.5 flex flex-row items-center justify-between gap-4">
                    <CardTitle className="text-base sm:text-lg text-white font-semibold">
                      {faq.question}
                    </CardTitle>
                    <ChevronDown
                      className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-primary' : ''
                      }`}
                    />
                  </CardHeader>
                  {isOpen && (
                    <CardContent className="px-5.5 pb-5.5 pt-0 border-t border-neutral-900/60 mt-2">
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed pt-4">
                        {faq.answer}
                      </p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-[#07090d] border-t border-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center">
                  <MessageSquare className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="text-lg font-bold text-white tracking-tight">MJChatSyncs</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Premium multi-tenant white-label WhatsApp CRM and Indian Business Suite.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-white text-sm tracking-wider uppercase mb-5">Product</h3>
              <ul className="space-y-3.5">
                <li><Link href="#features" className="text-sm text-muted-foreground hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#white-label" className="text-sm text-muted-foreground hover:text-white transition-colors">White-Label</Link></li>
                <li><Link href="#pricing" className="text-sm text-muted-foreground hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#faq" className="text-sm text-muted-foreground hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white text-sm tracking-wider uppercase mb-5">Resources</h3>
              <ul className="space-y-3.5">
                <li><Link href="https://github.com/maajankiweb/WhatsApp-CRM" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-white transition-colors">GitHub Repository</Link></li>
                <li><Link href="https://github.com/maajankiweb/WhatsApp-CRM/issues" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-white transition-colors">Bug Reports</Link></li>
                <li><Link href="https://github.com/maajankiweb/WhatsApp-CRM/discussions" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-white transition-colors">Community Discussions</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white text-sm tracking-wider uppercase mb-5">Legal</h3>
              <ul className="space-y-3.5">
                <li><Link href="https://github.com/maajankiweb/WhatsApp-CRM/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-white transition-colors">License (MIT)</Link></li>
                <li><Link href="https://github.com/maajankiweb/WhatsApp-CRM/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-white transition-colors">Contributing Guide</Link></li>
                <li><Link href="https://github.com/maajankiweb/WhatsApp-CRM/blob/main/.github/SECURITY.md" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-white transition-colors">Security Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-neutral-900/60 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} MJChatSyncs. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Made with ❤️ for the open-source community
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
