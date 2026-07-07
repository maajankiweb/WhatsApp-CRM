import type { Metadata } from "next";
import { getTenantContext } from "@/lib/supabase/tenant";
import { DashboardShell } from "@/app/(dashboard)/dashboard-shell";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
}

export default async function TenantLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  
  // Resolve organization context.
  // Performs the database check, and handles 404/redirects server-side.
  const org = await getTenantContext(slug);

  return <DashboardShell>{children}</DashboardShell>;
}
