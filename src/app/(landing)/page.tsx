import { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Users,
  MessageSquare,
  Bot,
  Zap,
  Eye,
  Globe,
  Receipt,
  GraduationCap,
  IndianRupee,
  Layers,
  Sparkles,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PricingSection } from '@/components/landing/pricing-section';

export const metadata: Metadata = {
  title: 'Wachatra — Premium WhatsApp CRM & Business Suite',
  description: 'Self-hostable, multi-tenant WhatsApp CRM & Business Suite for Indian SMBs & global agencies. Features shared team inbox, visual chatbot flows, and GST invoicing.',
  keywords: [
    'Wachatra',
    'InvoSuite',
    'WhatsApp CRM',
    'WhatsApp Business API',
    'Shared Inbox',
    'GST Invoicing',
    'No-code Chatbot Builder',
    'Multi-tenant SaaS',
    'Razorpay Subscription CRM',
    'India SMB CRM',
  ],
};

// Starry background component (pure CSS animations)
function StarryBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-primary/30 rounded-full animate-pulse" />
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

// Floating animation wrapper (pure CSS animation)
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

  const faqs = [
    {
      question: 'Is this an official WhatsApp business solution?',
      answer: 'Yes, Wachatra utilizes the official Meta WhatsApp Cloud API. We do not use browser automation or unofficial web-client hacks, ensuring your business number is completely safe from suspension.',
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
      answer: 'Wachatra is optimized for Hostinger Managed Node.js, Vercel, or custom VPS. The setup is highly automated, and you can get up and running with a single-click deploy.',
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
      <nav className="fixed top-0 left-0 right-0 w-full z-50 backdrop-blur-xl bg-[#0a0c10]/80 border-b border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
                <MessageSquare className="w-5.5 h-5.5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-white leading-none">Wachatra</span>
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
      <section id="hero" className="relative pt-20 pb-16 sm:pt-32 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary tracking-wide uppercase">Meta Business Partner</span>
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
                  app.wachatra.com/dashboard
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
      <section id="features" className="py-24 bg-neutral-950/40 border-y border-neutral-900/60">
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
      <section id="integrations" className="py-24">
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
                  Most CRM templates only handle chat. **Wachatra** bridges the gap by integrating GST invoicing (via InvoBill) and local School/Hospital ERPs. Broadcast auto-reminders, invoice PDFs, and student attendance alerts automatically.
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
      <section id="white-label" className="py-24 bg-neutral-950/20 border-t border-neutral-900/60">
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

      {/* Pricing Section (Client Component) */}
      <PricingSection />

      {/* FAQ Section (Pure CSS native HTML details accordions) */}
      <section id="faq" className="py-24">
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
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group border border-neutral-900 bg-[#0c0f16] rounded-xl transition-all duration-300 hover:border-neutral-800 open:border-primary/50 open:shadow [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="p-5.5 flex items-center justify-between gap-4 cursor-pointer list-none select-none">
                  <span className="text-base sm:text-lg text-white font-semibold">
                    {faq.question}
                  </span>
                  <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 group-open:rotate-180 group-open:text-primary" />
                </summary>
                <div className="px-5.5 pb-5.5 pt-0 border-t border-neutral-900/60 mt-2">
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed pt-4">
                    {faq.answer}
                  </p>
                </div>
              </details>
            ))}
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
                <span className="text-lg font-bold text-white tracking-tight">Wachatra</span>
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
              © {new Date().getFullYear()} Wachatra. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Made with ❤️ Maajanki Web Tech
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
