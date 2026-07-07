'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/hooks/use-auth';

function LandingContent({ children }: { children: React.ReactNode }) {
  const { profile, loading, profileLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is authenticated, redirect to dashboard
    if (!loading && !profileLoading && profile) {
      router.replace('/dashboard');
    }
  }, [profile, loading, profileLoading, router]);

  // Show loading state or landing page
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LandingContent>
        {children}
      </LandingContent>
    </AuthProvider>
  );
}
