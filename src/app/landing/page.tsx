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
  GitFork,
  Star,
  Eye,
  MousePointerClick,
  Smartphone,
  Globe,
  Lock,
  Database,
  Bolt,
  Code2
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

// GitHub stats component
function GitHubStats() {
  const [stars, setStars] = useState('1.5k');
  const [forks, setForks] = useState('300');

  useEffect(() => {
    // Fetch GitHub stats
    fetch('https://api.github.com/repos/ArnasDon/wacrm')
      .then(res => res.json())
      .then(data => {
        if (data.stargazers_count) {
          setStars(data.stargazers_count.toLocaleString());
        }
        if (data.forks_count) {
          setForks(data.forks_count.toLocaleString());
        }
      })
      .catch(() => {
        // Keep default values on error
      });
  }, []);

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-medium">{stars}</span>
      </div>
      <div className="flex items-center gap-2">
        <GitFork className="w-4 h-4" />
        <span className="text-sm font-medium">{forks}</span>
      </div>
    </div>
  );
}

// Tech stack badges
function TechStack() {
  const tech = [
    { name: 'Next.js 16', color: 'bg-black text-white' },
    { name: 'React 19', color: 'bg-blue-500 text-white' },
    { name: 'TypeScript', color: 'bg-blue-600 text-white' },
    { name: 'Tailwind', color: 'bg-cyan-500 text-white' },
    { name: 'Supabase', color: 'bg-green-500 text-white' },
    { name: 'WhatsApp API', color: 'bg-green-400 text-black' },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {tech.map((t) => (
        <Badge key={t.name} className={`${t.color} px-3 py-1 text-xs font-medium`}>
          {t.name}
        </Badge>
      ))}
    </div>
  );
}

// Main landing page component
export default function LandingPage() {
  const animatedSections = useScrollAnimation();

  const features = [
    {
      id: 'shared-inbox',
      icon: Users,
      title: 'Shared Inbox',
      description: 'Multiple agents working one WhatsApp number with per-conversation assignment, status tracking, and internal notes.',
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
    },
    {
      id: 'contacts',
      icon: Database,
      title: 'Contacts & Tags',
      description: 'Organize contacts with custom fields, CSV import, deduplication, and smart tagging.',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      id: 'pipelines',
      icon: BarChart3,
      title: 'Sales Pipelines',
      description: 'Kanban-style deal management with drag-and-drop, linked to conversations.',
      color: 'text-cobalt-500',
      bgColor: 'bg-cobalt-500/10',
    },
    {
      id: 'broadcasts',
      icon: Megaphone,
      title: 'Broadcasts',
      description: 'Send Meta-approved templates with delivery tracking, read receipts, and variable substitution.',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      id: 'automations',
      icon: Zap,
      title: 'No-Code Automations',
      description: 'Visual builder for triggers, conditions, waits, tags, and webhooks. No coding required.',
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
    },
    {
      id: 'ai-assistant',
      icon: Bot,
      title: 'AI Reply Assistant',
      description: 'Bring your own OpenAI/Anthropic key. One-click AI-drafted replies and auto-reply bot.',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  const benefits = [
    {
      icon: Shield,
      title: 'Full Ownership',
      description: 'Your code, your Supabase project, your domain, your data. No SaaS lock-in.',
    },
    {
      icon: Code2,
      title: 'Full Customization',
      description: 'Add fields, remove modules, redesign anything. Boring stack = short learning curve.',
    },
    {
      icon: Bolt,
      title: 'Zero Ops to Start',
      description: 'Hostinger deploys a fork in a few clicks. No Docker, no Kubernetes, no infra team.',
    },
    {
      icon: Lock,
      title: 'Real Security',
      description: 'Token encryption (AES-256-GCM), RLS on every table, HMAC-verified webhooks.',
    },
  ];

  const useCases = [
    {
      title: 'Customer Support',
      description: 'Handle customer inquiries efficiently with shared inbox and AI assistance.',
      icon: MessageSquare,
    },
    {
      title: 'Sales Teams',
      description: 'Track deals through customizable pipelines linked to WhatsApp conversations.',
      icon: BarChart3,
    },
    {
      title: 'Marketing Campaigns',
      description: 'Run targeted broadcast campaigns with delivery tracking and analytics.',
      icon: Megaphone,
    },
    {
      title: 'Small Businesses',
      description: 'Manage all customer communications in one place without complex setup.',
      icon: Smartphone,
    },
  ];

  const faqs = [
    {
      question: 'Is this free to use?',
      answer: 'Yes! wacrm is MIT-licensed. You only pay for your hosting (Hostinger, Vercel, etc.) and WhatsApp Business API costs from Meta.',
    },
    {
      question: 'Do I need coding experience?',
      answer: 'Not to get started. Deploy with Hostinger in minutes. Customization requires basic React/Next.js knowledge.',
    },
    {
      question: 'Can I use my own WhatsApp number?',
      answer: 'Yes! You connect your own WhatsApp Business Account via Meta Cloud API. Full setup guide included.',
    },
    {
      question: 'Is the data encrypted?',
      answer: 'Yes. Sensitive data like API keys are encrypted with AES-256-GCM. All database access is protected by Row-Level Security.',
    },
    {
      question: 'Can I self-host this?',
      answer: 'Absolutely! Deploy anywhere Node.js runs - Hostinger (recommended), Vercel, Railway, or your own VPS.',
    },
    {
      question: 'What about updates?',
      answer: 'Since you fork the repo, you control when and how to pull updates from upstream. No forced updates.',
    },
  ];

  const [activeFaq, setActiveFaq] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      {/* Starry background for hero */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <StarryBackground />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 backdrop-blur-lg bg-background/80 border-b border-border/50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">wacrm</span>
              </div>
            </Link>

            <div className="flex items-center gap-6">
              <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">
                Features
              </Link>
              <Link href="#benefits" className="text-sm font-medium hover:text-primary transition-colors">
                Benefits
              </Link>
              <Link href="#use-cases" className="text-sm font-medium hover:text-primary transition-colors">
                Use Cases
              </Link>
              <Link href="#faq" className="text-sm font-medium hover:text-primary transition-colors">
                FAQ
              </Link>
              <Link href="https://github.com/ArnasDon/wacrm" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="gap-2">
                  <GitFork className="w-4 h-4" />
                  <span className="hidden sm:inline">Star on GitHub</span>
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm">Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        data-animate="hero"
        id="hero"
        className={`relative z-10 py-20 sm:py-32 transition-all duration-1000 ${
          animatedSections.has('hero') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <span className="text-primary text-sm font-medium">v0.7.0</span>
            <span className="text-sm text-muted-foreground">Latest release</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Self-Hostable CRM for{' '}
            <span className="relative inline-block">
              WhatsApp
              <span className="absolute inset-0 bg-primary/20 rounded-lg -z-10 animate-pulse" style={{ animationDuration: '2s' }} />
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Shared inbox, contacts, sales pipelines, broadcasts, and no-code automations.
            Fork it, brand it, host it.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link href="/login">
              <Button size="lg" className="gap-2 min-w-[180px]">
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="https://wacrm.tech/docs" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="gap-2 min-w-[180px]">
                <Eye className="w-4 h-4" />
                View Docs
              </Button>
            </Link>
          </div>

          <GitHubStats />
          <div className="mt-8">
            <TechStack />
          </div>
        </div>

        {/* Hero visual */}
        <div className="mt-16 max-w-5xl mx-auto px-4">
          <div className="relative bg-card rounded-2xl p-4 sm:p-8 shadow-2xl shadow-primary/10 border border-border/50">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-green-500">Live Connection</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    Shared Inbox
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    AI Assistant
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    Sales Pipelines
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Check className="w-4 h-4 text-primary" />
                    Broadcasts
                  </div>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="bg-gradient-to-br from-primary/20 to-primary/50 rounded-xl p-6 h-48">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="font-medium">WhatsApp Integration</span>
                  </div>
                  <div className="space-y-2">
                    <div className="w-full h-2 bg-primary/30 rounded-full" />
                    <div className="w-3/4 h-2 bg-primary/20 rounded-full" />
                    <div className="w-1/2 h-2 bg-primary/30 rounded-full" />
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
        className={`py-20 sm:py-28 bg-muted/30 transition-all duration-1000 ${
          animatedSections.has('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <Zap className="w-3 h-3 mr-1" />
              Powerful Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Everything You Need for WhatsApp CRM
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built with modern tools, designed for productivity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FloatAnimation key={feature.id} delay={`${index * 0.1}s`}>
                <Card className="h-full hover:shadow-lg transition-shadow duration-300 group">
                  <CardHeader>
                    <div className={`flex items-center justify-center w-14 h-14 rounded-xl mb-4 group-hover:scale-105 transition-transform duration-300 ${feature.bgColor}`}>
                      <feature.icon className={`w-7 h-7 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href="/login" className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1">
                      Learn more <ArrowRight className="w-3 h-3" />
                    </Link>
                  </CardContent>
                </Card>
              </FloatAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section
        id="benefits"
        data-animate="benefits"
        className={`py-20 sm:py-28 transition-all duration-1000 ${
          animatedSections.has('benefits') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <Shield className="w-3 h-3 mr-1" />
              Why Choose wacrm
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Why Fork This Template?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              This is a template, not a product. You get full control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <FloatAnimation key={benefit.title} delay={`${index * 0.1}s`}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                      <benefit.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      {benefit.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </FloatAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section
        id="use-cases"
        data-animate="use-cases"
        className={`py-20 sm:py-28 bg-muted/30 transition-all duration-1000 ${
          animatedSections.has('use-cases') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <MousePointerClick className="w-3 h-3 mr-1" />
              Perfect For
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Who Uses wacrm?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From solopreneurs to growing teams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => (
              <FloatAnimation key={useCase.title} delay={`${index * 0.1}s`}>
                <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/40 mb-4">
                      <useCase.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{useCase.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      {useCase.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </FloatAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        data-animate="cta"
        id="cta"
        className={`py-20 sm:py-28 transition-all duration-1000 ${
          animatedSections.has('cta') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-3xl p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />
            <div className="relative">
              <Badge variant="outline" className="mb-4 bg-background/50 backdrop-blur-sm">
                <Globe className="w-3 h-3 mr-1" />
                Ready to Start
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Deploy Your CRM in Minutes
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Fork on GitHub, deploy to Hostinger, connect WhatsApp, and start managing conversations.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/login">
                  <Button size="lg" className="gap-2 min-w-[180px]">
                    Start Free Trial
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="https://github.com/ArnasDon/wacrm" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="gap-2 min-w-[180px]">
                    <GitFork className="w-4 h-4" />
                    Fork on GitHub
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        data-animate="faq"
        className={`py-20 sm:py-28 transition-all duration-1000 ${
          animatedSections.has('faq') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              FAQ
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Got questions? We have answers.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <FloatAnimation key={faq.question} delay={`${index * 0.1}s`}>
                <Card
                  className={`cursor-pointer transition-all duration-300 ${
                    activeFaq === faq.question ? 'bg-muted/50' : ''
                  }`}
                  onClick={() => setActiveFaq(activeFaq === faq.question ? null : faq.question)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      {faq.question}
                      <span className={`transform transition-transform duration-300 ${
                        activeFaq === faq.question ? 'rotate-180' : ''
                      }`}>
                        <ArrowRight className="w-5 h-5" />
                      </span>
                    </CardTitle>
                  </CardHeader>
                  {activeFaq === faq.question && (
                    <CardContent>
                      <CardDescription className="text-base">
                        {faq.answer}
                      </CardDescription>
                    </CardContent>
                  )}
                </Card>
              </FloatAnimation>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-muted/30 border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-bold">wacrm</span>
                </div>
              </Link>
              <p className="text-sm text-muted-foreground mb-4">
                Self-hostable CRM template for WhatsApp. Fork it, brand it, host it.
              </p>
              <GitHubStats />
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Benefits</Link></li>
                <li><Link href="#use-cases" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Use Cases</Link></li>
                <li><Link href="https://wacrm.tech/docs" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Documentation</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><Link href="https://github.com/ArnasDon/wacrm" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">GitHub</Link></li>
                <li><Link href="https://github.com/ArnasDon/wacrm/issues" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Issues</Link></li>
                <li><Link href="https://github.com/ArnasDon/wacrm/discussions" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Discussions</Link></li>
                <li><Link href="https://wacrm.tech" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Website</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="https://github.com/ArnasDon/wacrm/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">License (MIT)</Link></li>
                <li><Link href="https://github.com/ArnasDon/wacrm/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contributing</Link></li>
                <li><Link href="https://github.com/ArnasDon/wacrm/blob/main/.github/SECURITY.md" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/50 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} wacrm. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Made with ❤️ for the open-source community
            </p>
          </div>
        </div>
      </footer>

      {/* Scroll to top button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-6 right-6 z-50 bg-background/80 backdrop-blur-lg hover:bg-background transition-all duration-300"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ArrowRight className="w-4 h-4 rotate-90" />
      </Button>
    </div>
  );
}
