'use client';

import { useState } from 'react';
import {
  FileSpreadsheet,
  BookOpen,
  Share2,
  GitBranch,
  AtSign,
  Users,
  Volume2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Link2,
  PlugZap,
  Settings,
  Terminal,
  ExternalLink,
} from 'lucide-react';

// Custom inline SVG icons for social platforms
const Facebook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

import { SettingsPanelHead } from './settings-panel-head';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Configuration states types
interface SheetsConfig {
  connected: boolean;
  url: string;
  sheetName: string;
  syncContacts: boolean;
  syncMessages: boolean;
}

interface NotionConfig {
  connected: boolean;
  token: string;
  databaseId: string;
}

interface WebhookConfig {
  connected: boolean;
  url: string;
  events: string[];
}

interface MetaChannelConfig {
  connected: boolean;
  name: string;
}

interface GroupConfig {
  connected: boolean;
  monitorAll: boolean;
  groupsList: string[];
}

export function IntegrationsPanel() {
  // Modal toggle states
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Connection configurations state
  const [sheets, setSheets] = useState<SheetsConfig>({
    connected: false,
    url: '',
    sheetName: 'Wachatra Leads',
    syncContacts: true,
    syncMessages: false,
  });

  const [notion, setNotion] = useState<NotionConfig>({
    connected: false,
    token: '',
    databaseId: '',
  });

  const [n8n, setN8n] = useState<WebhookConfig>({
    connected: false,
    url: '',
    events: ['message.received', 'contact.created'],
  });

  const [make, setMake] = useState<WebhookConfig>({
    connected: false,
    url: '',
    events: ['message.received'],
  });

  const [facebook, setFacebook] = useState<MetaChannelConfig>({
    connected: false,
    name: '',
  });

  const [instagram, setInstagram] = useState<MetaChannelConfig>({
    connected: false,
    name: '',
  });

  const [threads, setThreads] = useState<MetaChannelConfig>({
    connected: false,
    name: '',
  });

  const [groups, setGroups] = useState<GroupConfig>({
    connected: false,
    monitorAll: true,
    groupsList: ['Sales Leads IN', 'Support Group EU'],
  });

  const [channels, setChannels] = useState<MetaChannelConfig>({
    connected: false,
    name: '',
  });

  // Event list options for webhook subscription
  const EVENT_OPTIONS = [
    { id: 'message.received', label: 'Inbound message received' },
    { id: 'message.sent', label: 'Outbound message sent' },
    { id: 'message.status_updated', label: 'Message status transition (Delivered/Read)' },
    { id: 'contact.created', label: 'New contact registered' },
  ];

  // Helper toggle for webhooks events
  const handleWebhookEventToggle = (
    provider: 'n8n' | 'make',
    eventId: string,
    checked: boolean
  ) => {
    const target = provider === 'n8n' ? n8n : make;
    const setter = provider === 'n8n' ? setN8n : setMake;

    if (checked) {
      setter({ ...target, events: [...target.events, eventId] });
    } else {
      setter({ ...target, events: target.events.filter((e) => e !== eventId) });
    }
  };

  return (
    <section className="space-y-6 animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="Integrations Hub"
        description="Sync conversations, contacts, and automated workflows across database layers, automation engines, and social communication channels."
      />

      {/* Group 1: Data Synchronisation */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Databases & Spreadsheets
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Google Sheets Card */}
          <Card className="backdrop-blur-md bg-card/60 border-border/50 hover:border-border/80 transition-all">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-semibold text-foreground">Google Sheets</CardTitle>
                <CardDescription className="text-xs text-muted-foreground truncate">
                  {sheets.connected ? `Synced with "${sheets.sheetName}"` : 'Export leads and logs to spreadsheet'}
                </CardDescription>
              </div>
              <div className="shrink-0 flex items-center">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    sheets.connected
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${sheets.connected ? 'bg-emerald-400' : 'bg-neutral-500'}`} />
                  {sheets.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-2 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Sync contacts or inbound messages automatically</span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 border-neutral-800/80 hover:bg-neutral-900"
                onClick={() => setActiveModal('sheets')}
              >
                <Settings className="w-3.5 h-3.5" />
                Configure
              </Button>
            </CardContent>
          </Card>

          {/* Notion Card */}
          <Card className="backdrop-blur-md bg-card/60 border-border/50 hover:border-border/80 transition-all">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-semibold text-foreground">Notion CRM</CardTitle>
                <CardDescription className="text-xs text-muted-foreground truncate">
                  {notion.connected ? 'Synced with workspace database' : 'Push chat contacts directly to Notion'}
                </CardDescription>
              </div>
              <div className="shrink-0 flex items-center">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    notion.connected
                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${notion.connected ? 'bg-purple-400' : 'bg-neutral-500'}`} />
                  {notion.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-2 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Create database entries on new inbound chats</span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 border-neutral-800/80 hover:bg-neutral-900"
                onClick={() => setActiveModal('notion')}
              >
                <Settings className="w-3.5 h-3.5" />
                Configure
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Group 2: Outgoing Webhooks & Workflow Engines */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Workflow Engines & Webhooks
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {/* n8n.io Card */}
          <Card className="backdrop-blur-md bg-card/60 border-border/50 hover:border-border/80 transition-all">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                <Share2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-semibold text-foreground">n8n Node Integration</CardTitle>
                <CardDescription className="text-xs text-muted-foreground truncate">
                  {n8n.connected ? `Active on ${n8n.events.length} trigger events` : 'Self-hostable automation connector'}
                </CardDescription>
              </div>
              <div className="shrink-0 flex items-center">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    n8n.connected
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${n8n.connected ? 'bg-orange-400' : 'bg-neutral-500'}`} />
                  {n8n.connected ? 'Active' : 'Not Configured'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-2 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Forward real-time API events to self-hosted n8n</span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 border-neutral-800/80 hover:bg-neutral-900"
                onClick={() => setActiveModal('n8n')}
              >
                <Settings className="w-3.5 h-3.5" />
                Configure
              </Button>
            </CardContent>
          </Card>

          {/* Make.com Card */}
          <Card className="backdrop-blur-md bg-card/60 border-border/50 hover:border-border/80 transition-all">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <GitBranch className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-semibold text-foreground">Make (Integromat)</CardTitle>
                <CardDescription className="text-xs text-muted-foreground truncate">
                  {make.connected ? 'Webhook sync verified' : 'Connect multi-app scenario webhooks'}
                </CardDescription>
              </div>
              <div className="shrink-0 flex items-center">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    make.connected
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${make.connected ? 'bg-blue-400' : 'bg-neutral-500'}`} />
                  {make.connected ? 'Active' : 'Not Configured'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-2 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Trigger scenarios using webhook events listener</span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 border-neutral-800/80 hover:bg-neutral-900"
                onClick={() => setActiveModal('make')}
              >
                <Settings className="w-3.5 h-3.5" />
                Configure
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Group 3: Social Omnichannel Channels */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Omnichannel Social Messengers
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Facebook Card */}
          <Card className="backdrop-blur-md bg-card/60 border-border/50 hover:border-border/80 transition-all">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-sky-600/10 text-sky-500 flex items-center justify-center border border-sky-600/20">
                <Facebook className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Facebook Messenger</h4>
                <p className="text-[11px] text-muted-foreground mt-1 min-h-[32px]">
                  {facebook.connected ? `Connected to page "${facebook.name}"` : 'Sync Facebook business messages to team inbox.'}
                </p>
              </div>
              <Button
                variant={facebook.connected ? 'destructive' : 'outline'}
                size="sm"
                className="w-full text-xs h-8"
                onClick={() => {
                  if (facebook.connected) {
                    setFacebook({ connected: false, name: '' });
                  } else {
                    setActiveModal('facebook');
                  }
                }}
              >
                {facebook.connected ? 'Disconnect' : 'Connect Page'}
              </Button>
            </CardContent>
          </Card>

          {/* Instagram Card */}
          <Card className="backdrop-blur-md bg-card/60 border-border/50 hover:border-border/80 transition-all">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                <Instagram className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Instagram DMs</h4>
                <p className="text-[11px] text-muted-foreground mt-1 min-h-[32px]">
                  {instagram.connected ? `Connected to @${instagram.name}` : 'Handle Instagram DMs and comment replies.'}
                </p>
              </div>
              <Button
                variant={instagram.connected ? 'destructive' : 'outline'}
                size="sm"
                className="w-full text-xs h-8"
                onClick={() => {
                  if (instagram.connected) {
                    setInstagram({ connected: false, name: '' });
                  } else {
                    setActiveModal('instagram');
                  }
                }}
              >
                {instagram.connected ? 'Disconnect' : 'Connect Account'}
              </Button>
            </CardContent>
          </Card>

          {/* Threads Card */}
          <Card className="backdrop-blur-md bg-card/60 border-border/50 hover:border-border/80 transition-all">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-neutral-200/10 text-foreground flex items-center justify-center border border-neutral-200/20">
                <AtSign className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Threads Connect</h4>
                <p className="text-[11px] text-muted-foreground mt-1 min-h-[32px]">
                  {threads.connected ? `Connected to @${threads.name}` : 'Sync Threads mentions & posts to conversation logs.'}
                </p>
              </div>
              <Button
                variant={threads.connected ? 'destructive' : 'outline'}
                size="sm"
                className="w-full text-xs h-8"
                onClick={() => {
                  if (threads.connected) {
                    setThreads({ connected: false, name: '' });
                  } else {
                    setActiveModal('threads');
                  }
                }}
              >
                {threads.connected ? 'Disconnect' : 'Connect Threads'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Group 4: WhatsApp Groups & Channels */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          WhatsApp Group & Channel Connect
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Groups Connection Card */}
          <Card className="backdrop-blur-md bg-card/60 border-border/50 hover:border-border/80 transition-all">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-semibold text-foreground">WhatsApp Group Sync</CardTitle>
                <CardDescription className="text-xs text-muted-foreground truncate">
                  {groups.connected
                    ? groups.monitorAll
                      ? 'Monitoring all group messages'
                      : `Monitoring ${groups.groupsList.length} specified groups`
                    : 'Sync internal WhatsApp group threads to team inbox'}
                </CardDescription>
              </div>
              <div className="shrink-0 flex items-center">
                <Switch
                  checked={groups.connected}
                  onCheckedChange={(checked) => setGroups({ ...groups, connected: checked })}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-2 flex justify-between items-center gap-4">
              <span className="text-xs text-muted-foreground">
                Enable this to view group conversations and assign group chat tickets to agents.
              </span>
              {groups.connected && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs h-8 border-neutral-800/80 hover:bg-neutral-900 shrink-0"
                  onClick={() => setActiveModal('groups')}
                >
                  Configure
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Channels Broadcast Card */}
          <Card className="backdrop-blur-md bg-card/60 border-border/50 hover:border-border/80 transition-all">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                <Volume2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-semibold text-foreground">WhatsApp Channels Connect</CardTitle>
                <CardDescription className="text-xs text-muted-foreground truncate">
                  {channels.connected ? `Broadcasting to "${channels.name}"` : 'Manage your WhatsApp Public Channels'}
                </CardDescription>
              </div>
              <div className="shrink-0 flex items-center">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    channels.connected
                      ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${channels.connected ? 'bg-yellow-400' : 'bg-neutral-500'}`} />
                  {channels.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-2 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Schedule and post updates directly to subscribers</span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 border-neutral-800/80 hover:bg-neutral-900"
                onClick={() => setActiveModal('channels')}
              >
                <Settings className="w-3.5 h-3.5" />
                Configure
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- MODAL DIALOGS --- */}

      {/* Google Sheets Dialog */}
      <Dialog open={activeModal === 'sheets'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[500px] border-border/80 bg-neutral-950/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
              Google Sheets Integration
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Sync Wachatra customer profiles and messages to a Google Sheet spreadsheet for reporting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-foreground">
            <div className="space-y-2">
              <Label htmlFor="sheet-url">Google Spreadsheet URL or ID</Label>
              <Input
                id="sheet-url"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                value={sheets.url}
                onChange={(e) => setSheets({ ...sheets, url: e.target.value })}
                className="bg-neutral-900 border-neutral-800"
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Make sure to share edit permissions with our integration client mail: 
                <code className="bg-neutral-900 px-1 py-0.5 rounded ml-1 text-primary">sheets-sync@wachatra.iam.gserviceaccount.com</code>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheet-name">Target Worksheet Name</Label>
              <Input
                id="sheet-name"
                value={sheets.sheetName}
                onChange={(e) => setSheets({ ...sheets, sheetName: e.target.value })}
                className="bg-neutral-900 border-neutral-800"
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sync-contacts" className="font-medium text-foreground block">Sync Contacts</Label>
                  <span className="text-[11px] text-muted-foreground">Append new phone leads to rows.</span>
                </div>
                <Switch
                  id="sync-contacts"
                  checked={sheets.syncContacts}
                  onCheckedChange={(checked) => setSheets({ ...sheets, syncContacts: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sync-messages" className="font-medium text-foreground block">Sync Message Log</Label>
                  <span className="text-[11px] text-muted-foreground">Log every single chat transaction into Sheet.</span>
                </div>
                <Switch
                  id="sync-messages"
                  checked={sheets.syncMessages}
                  onCheckedChange={(checked) => setSheets({ ...sheets, syncMessages: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="hover:bg-neutral-900" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setSheets({ ...sheets, connected: true });
                setActiveModal(null);
              }}
            >
              Verify & Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notion Dialog */}
      <Dialog open={activeModal === 'notion'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[480px] border-border/80 bg-neutral-950/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <BookOpen className="w-5 h-5 text-purple-400" />
              Notion Connection Panel
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Connect Notion databases to sync leads.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3 text-foreground">
            <div className="space-y-2">
              <Label htmlFor="notion-secret">Notion Integration Token (Secret)</Label>
              <Input
                id="notion-secret"
                type="password"
                placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={notion.token}
                onChange={(e) => setNotion({ ...notion, token: e.target.value })}
                className="bg-neutral-900 border-neutral-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notion-db">Database ID</Label>
              <Input
                id="notion-db"
                placeholder="32-digit UUID code (e.g. 5d5a7d90e80a4db091df2bf72e...)"
                value={notion.databaseId}
                onChange={(e) => setNotion({ ...notion, databaseId: e.target.value })}
                className="bg-neutral-900 border-neutral-800"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="hover:bg-neutral-900" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => {
                setNotion({ ...notion, connected: true });
                setActiveModal(null);
              }}
            >
              Connect Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* n8n Dialog */}
      <Dialog open={activeModal === 'n8n'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[500px] border-border/80 bg-neutral-950/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Share2 className="w-5 h-5 text-orange-500" />
              Configure n8n Webhook
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Send outbound webhook payloads to n8n whenever workspace events trigger.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-foreground">
            <div className="space-y-2">
              <Label htmlFor="n8n-url">n8n Webhook Node URL</Label>
              <Input
                id="n8n-url"
                placeholder="https://n8n.yourdomain.com/webhook/..."
                value={n8n.url}
                onChange={(e) => setN8n({ ...n8n, url: e.target.value })}
                className="bg-neutral-900 border-neutral-800"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground block">Subscribe to Events</Label>
              <div className="grid gap-2 pt-1">
                {EVENT_OPTIONS.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`n8n-${opt.id}`}
                      checked={n8n.events.includes(opt.id)}
                      onCheckedChange={(checked) =>
                        handleWebhookEventToggle('n8n', opt.id, !!checked)
                      }
                    />
                    <label
                      htmlFor={`n8n-${opt.id}`}
                      className="text-xs font-medium text-foreground leading-none cursor-pointer"
                    >
                      {opt.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="hover:bg-neutral-900" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => {
                setN8n({ ...n8n, connected: true });
                setActiveModal(null);
              }}
            >
              Activate Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Make Dialog */}
      <Dialog open={activeModal === 'make'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[500px] border-border/80 bg-neutral-950/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <GitBranch className="w-5 h-5 text-blue-400" />
              Configure Make Scenario Webhook
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Forward real-time event updates to Make.com scenarios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-foreground">
            <div className="space-y-2">
              <Label htmlFor="make-url">Make Webhook URL</Label>
              <Input
                id="make-url"
                placeholder="https://hook.us1.make.com/..."
                value={make.url}
                onChange={(e) => setMake({ ...make, url: e.target.value })}
                className="bg-neutral-900 border-neutral-800"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground block">Subscribe to Events</Label>
              <div className="grid gap-2 pt-1">
                {EVENT_OPTIONS.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`make-${opt.id}`}
                      checked={make.events.includes(opt.id)}
                      onCheckedChange={(checked) =>
                        handleWebhookEventToggle('make', opt.id, !!checked)
                      }
                    />
                    <label
                      htmlFor={`make-${opt.id}`}
                      className="text-xs font-medium text-foreground leading-none cursor-pointer"
                    >
                      {opt.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="hover:bg-neutral-900" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                setMake({ ...make, connected: true });
                setActiveModal(null);
              }}
            >
              Activate Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meta channels connection popups (Mock OAuth Flow) */}
      <Dialog open={activeModal === 'facebook'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[400px] border-border/80 bg-neutral-950/95 backdrop-blur-2xl">
          <DialogHeader className="text-center">
            <Facebook className="w-10 h-10 text-sky-500 mx-auto mb-2" />
            <DialogTitle className="text-foreground">Connect Facebook Messenger</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Grant Wachatra permission to sync Facebook Page conversation threads.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-foreground">
            <p className="text-xs text-muted-foreground mb-4">
              This opens the official Meta Business login flow to request manage_pages and read_inbox scopes.
            </p>
            <Input
              placeholder="Select Facebook Page"
              defaultValue="My Agency Business page"
              className="text-center font-semibold bg-neutral-900 border-neutral-800"
              readOnly
            />
          </div>
          <DialogFooter className="sm:justify-center">
            <Button variant="ghost" className="hover:bg-neutral-900" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700 text-white"
              onClick={() => {
                setFacebook({ connected: true, name: 'My Agency Business page' });
                setActiveModal(null);
              }}
            >
              Log in with Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === 'instagram'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[400px] border-border/80 bg-neutral-950/95 backdrop-blur-2xl">
          <DialogHeader className="text-center">
            <Instagram className="w-10 h-10 text-rose-400 mx-auto mb-2" />
            <DialogTitle className="text-foreground">Connect Instagram Account</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Link your Instagram Professional Creator account via Meta Business Manager.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-foreground">
            <Input
              placeholder="Enter Instagram Handle"
              defaultValue="wachatra_crm"
              className="text-center font-semibold bg-neutral-900 border-neutral-800"
              readOnly
            />
          </div>
          <DialogFooter className="sm:justify-center">
            <Button variant="ghost" className="hover:bg-neutral-900" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => {
                setInstagram({ connected: true, name: 'wachatra_crm' });
                setActiveModal(null);
              }}
            >
              Authorize API Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === 'threads'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[400px] border-border/80 bg-neutral-950/95 backdrop-blur-2xl">
          <DialogHeader className="text-center">
            <AtSign className="w-10 h-10 text-foreground mx-auto mb-2" />
            <DialogTitle className="text-foreground">Connect Threads Account</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Authorize access to retrieve notifications, replies, and mentions on Threads.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-foreground">
            <Input
              placeholder="Threads Username"
              defaultValue="wachatra_app"
              className="text-center font-semibold bg-neutral-900 border-neutral-800"
              readOnly
            />
          </div>
          <DialogFooter className="sm:justify-center">
            <Button variant="ghost" className="hover:bg-neutral-900" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button
              className="bg-neutral-800 hover:bg-neutral-700 text-white"
              onClick={() => {
                setThreads({ connected: true, name: 'wachatra_app' });
                setActiveModal(null);
              }}
            >
              Verify OAuth Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Groups Dialog */}
      <Dialog open={activeModal === 'groups'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[450px] border-border/80 bg-neutral-950/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Users className="w-5 h-5 text-teal-400" />
              Configure Group Synchronization
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Toggle how group chats should be imported and displayed inside the collaborative Shared Inbox.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-foreground">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="monitor-all" className="font-semibold block">Monitor All Groups</Label>
                <span className="text-[11px] text-muted-foreground">Automatically track messages from any group your number is added to.</span>
              </div>
              <Switch
                id="monitor-all"
                checked={groups.monitorAll}
                onCheckedChange={(checked) => setGroups({ ...groups, monitorAll: checked })}
              />
            </div>

            {!groups.monitorAll && (
              <div className="space-y-2">
                <Label>Sync Selected Groups Only</Label>
                <div className="border border-neutral-800 rounded-lg bg-neutral-950 p-3 space-y-2 max-h-[150px] overflow-y-auto">
                  {groups.groupsList.map((gName) => (
                    <div key={gName} className="flex items-center gap-2">
                      <Checkbox id={`group-${gName}`} defaultChecked />
                      <label htmlFor={`group-${gName}`} className="text-xs font-medium cursor-pointer text-foreground">
                        {gName}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" className="hover:bg-neutral-900" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => {
                setActiveModal(null);
              }}
            >
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Channel Dialog */}
      <Dialog open={activeModal === 'channels'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[450px] border-border/80 bg-neutral-950/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Volume2 className="w-5 h-5 text-yellow-400" />
              WhatsApp Channels Integration
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Connect your WhatsApp public channel to publish updates and track reader analytics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-foreground">
            <div className="space-y-2">
              <Label htmlFor="channel-name">Channel Link or Name</Label>
              <Input
                id="channel-name"
                placeholder="e.g. Wachatra Official Channel"
                value={channels.name}
                onChange={(e) => setChannels({ ...channels, name: e.target.value })}
                className="bg-neutral-900 border-neutral-800"
              />
              <span className="text-[10px] text-muted-foreground block leading-tight">
                Requires the connected business number to be an Owner/Admin of the targeted public Channel.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="hover:bg-neutral-900" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
              onClick={() => {
                setChannels({ ...channels, connected: true });
                setActiveModal(null);
              }}
            >
              Connect Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
