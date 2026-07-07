'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppConnectButtonProps {
  organizationId: string;
  onSuccess: () => void;
}

export function WhatsAppConnectButton({ organizationId, onSuccess }: WhatsAppConnectButtonProps) {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Check if FB is already loaded on window
    if (typeof window !== 'undefined' && (window as any).FB) {
      setSdkLoaded(true);
    }
  }, []);

  const initMetaSdk = () => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    if (!appId) {
      console.warn("NEXT_PUBLIC_META_APP_ID is not configured.");
      return;
    }

    try {
      (window as any).fbAsyncInit = function() {
        (window as any).FB.init({
          appId      : appId,
          cookie     : true,
          xfbml      : true,
          version    : 'v21.0'
        });
        setSdkLoaded(true);
      };

      // Load SDK Script if not already loaded
      if (!(window as any).FB && !document.getElementById('facebook-jssdk')) {
        const firstScript = document.getElementsByTagName('script')[0];
        const scriptElement = document.createElement('script');
        scriptElement.id = 'facebook-jssdk';
        scriptElement.src = 'https://connect.facebook.net/en_US/sdk.js';
        if (firstScript && firstScript.parentNode) {
          firstScript.parentNode.insertBefore(scriptElement, firstScript);
        } else {
          document.head.appendChild(scriptElement);
        }
      } else if ((window as any).FB) {
        setSdkLoaded(true);
      }
    } catch (err) {
      console.error("Error loading Meta SDK:", err);
    }
  };

  useEffect(() => {
    initMetaSdk();
  }, []);

  const handleConnect = () => {
    if (!sdkLoaded || !(window as any).FB) {
      toast.error('Meta SDK is not loaded yet. Please wait a moment.');
      return;
    }

    const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;
    if (!configId) {
      toast.error('NEXT_PUBLIC_META_CONFIG_ID is not configured.');
      return;
    }

    setConnecting(true);

    try {
      (window as any).FB.login(
        async (response: any) => {
          if (response.authResponse && response.authResponse.code) {
            const code = response.authResponse.code;
            
            try {
              // Send the code to complete signup
              const res = await fetch('/api/whatsapp/complete-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, organizationId }),
              });

              const data = await res.json();

              if (!res.ok) {
                throw new Error(data.error || 'Failed to complete connection');
              }

              toast.success('WhatsApp Business Account connected successfully!');
              onSuccess();
            } catch (err: any) {
              console.error('Connection complete error:', err);
              toast.error(err.message || 'Failed to connect WhatsApp account.');
            } finally {
              setConnecting(false);
            }
          } else {
            setConnecting(false);
            toast.error('Embedded signup flow was cancelled or failed.');
          }
        },
        {
          scope: 'whatsapp_business_management,whatsapp_business_messaging',
          config_id: configId,
          response_type: 'code',
          extras: {
            feature: 'whatsapp_business_app_onboarding',
            featureType: 'whatsapp_business_app_onboarding',
          },
          override_default_response_type: true
        }
      );
    } catch (err) {
      console.error('FB.login error:', err);
      setConnecting(false);
      toast.error('Failed to open Meta login window.');
    }
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={connecting || !sdkLoaded}
      className="bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all flex items-center gap-2"
    >
      {connecting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting with Meta...
        </>
      ) : (
        <>
          <Zap className="h-4 w-4" />
          Connect WhatsApp
        </>
      )}
    </Button>
  );
}
