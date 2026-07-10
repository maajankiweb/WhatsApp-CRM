'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CustomField, Tag } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Users,
  Tags,
  Filter,
  Upload,
  Loader2,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';

interface SegmentFilter {
  tagIds?: string[];
  excludeTagIds?: string[];
  pipelineStageId?: string;
  idleDays?: number;
  noReplyDays?: number;
}

type AudienceType = 'all' | 'tags' | 'custom_field' | 'csv' | 'segment';
type CustomFieldOperator = 'is' | 'is_not' | 'contains';

interface CustomFieldFilter {
  fieldId: string;
  operator: CustomFieldOperator;
  value: string;
}

interface AudienceConfig {
  type: AudienceType;
  tagIds?: string[];
  customField?: CustomFieldFilter;
  csvContacts?: { phone: string; name?: string }[];
  segment?: SegmentFilter;
  excludeTagIds?: string[];
}

interface Step2Props {
  audience: AudienceConfig;
  onUpdate: (audience: AudienceConfig) => void;
  onNext: () => void;
  onBack: () => void;
}

const audienceOptions: {
  type: AudienceType;
  label: string;
  description: string;
  icon: typeof Users;
}[] = [
  {
    type: 'all',
    label: 'All Contacts',
    description: 'Send to every contact in your database',
    icon: Users,
  },
  {
    type: 'tags',
    label: 'Filter by Tags',
    description: 'Target contacts with specific tags',
    icon: Tags,
  },
  {
    type: 'custom_field',
    label: 'Custom Field',
    description: 'Filter by a custom field value',
    icon: Filter,
  },
  {
    type: 'csv',
    label: 'Upload CSV',
    description: 'Upload a list of phone numbers',
    icon: Upload,
  },
  {
    type: 'segment',
    label: 'Dynamic Segment',
    description: 'Combine tags, stages, and activity rules',
    icon: Filter,
  },
];

const OPERATOR_OPTIONS: { value: CustomFieldOperator; label: string }[] = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'contains', label: 'contains' },
];

export function Step2SelectAudience({
  audience,
  onUpdate,
  onNext,
  onBack,
}: Step2Props) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Tags are used both by the primary "Filter by Tags" audience type
  // AND by the exclude-list below — so always load once on mount.
  useEffect(() => {
    async function fetchTags() {
      setLoadingTags(true);
      try {
        const supabase = createClient();
        const { data } = await supabase.from('tags').select('*').order('name');
        setTags(data ?? []);
      } finally {
        setLoadingTags(false);
      }
    }
    fetchTags();
  }, []);

  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);

  // Lazy-load custom fields only when that audience type is active.
  useEffect(() => {
    if (audience.type !== 'custom_field') return;
    async function fetchFields() {
      setLoadingFields(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('custom_fields')
          .select('*')
          .order('field_name');
        setCustomFields(data ?? []);
      } finally {
        setLoadingFields(false);
      }
    }
    fetchFields();
  }, [audience.type]);

  useEffect(() => {
    if (audience.type !== 'segment') return;
    async function fetchStages() {
      setLoadingStages(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('pipeline_stages')
          .select('id, name, pipeline:pipelines(name)');
        setPipelineStages(data ?? []);
      } finally {
        setLoadingStages(false);
      }
    }
    fetchStages();
  }, [audience.type]);

  const fetchEstimatedCount = useCallback(async () => {
    setLoadingCount(true);
    try {
      const supabase = createClient();

      // Base query — produces the superset before exclude is applied.
      let baseIds: Set<string> | null = null; // null means "all contacts"

      if (audience.type === 'all') {
        // Handled below — full-table count adjusted by excludes.
      } else if (
        audience.type === 'tags' &&
        audience.tagIds &&
        audience.tagIds.length > 0
      ) {
        const { data } = await supabase
          .from('contact_tags')
          .select('contact_id')
          .in('tag_id', audience.tagIds);
        baseIds = new Set((data ?? []).map((r) => r.contact_id));
      } else if (
        audience.type === 'custom_field' &&
        audience.customField?.fieldId &&
        audience.customField.value
      ) {
        const { fieldId, operator, value } = audience.customField;
        let q = supabase
          .from('contact_custom_values')
          .select('contact_id')
          .eq('custom_field_id', fieldId);
        if (operator === 'is') q = q.eq('value', value);
        else if (operator === 'is_not') q = q.neq('value', value);
        else q = q.ilike('value', `%${value}%`);
        const { data } = await q;
        baseIds = new Set((data ?? []).map((r) => r.contact_id));
      } else if (
        audience.type === 'csv' &&
        audience.csvContacts &&
        audience.csvContacts.length > 0
      ) {
        setEstimatedCount(audience.csvContacts.length);
        return;
      } else if (audience.type === 'segment') {
        const seg = audience.segment ?? {};
        let contactIds: Set<string> | null = null;

        // Tags inclusion
        if (seg.tagIds && seg.tagIds.length > 0) {
          const { data } = await supabase
            .from('contact_tags')
            .select('contact_id')
            .in('tag_id', seg.tagIds);
          contactIds = new Set((data ?? []).map((r) => r.contact_id));
        }

        // Pipeline stage
        if (seg.pipelineStageId) {
          const { data } = await supabase
            .from('deals')
            .select('contact_id')
            .eq('stage_id', seg.pipelineStageId)
            .eq('status', 'active');
          const dealsSet = new Set((data ?? []).map((d) => d.contact_id));
          if (contactIds === null) contactIds = dealsSet;
          else contactIds = new Set([...contactIds].filter((id) => dealsSet.has(id)));
        }

        // Idle days
        if (seg.idleDays && seg.idleDays > 0) {
          const cutoff = new Date(Date.now() - seg.idleDays * 24 * 60 * 60 * 1000).toISOString();
          const { data } = await supabase
            .from('conversations')
            .select('contact_id')
            .gte('last_message_at', cutoff);
          const activeSet = new Set((data ?? []).map((c) => c.contact_id));
          if (contactIds === null) {
            const { data: allC } = await supabase.from('contacts').select('id');
            contactIds = new Set((allC ?? []).map((c) => c.id).filter((id) => !activeSet.has(id)));
          } else {
            contactIds = new Set([...contactIds].filter((id) => !activeSet.has(id)));
          }
        }

        // No reply days
        if (seg.noReplyDays && seg.noReplyDays > 0) {
          const cutoff = new Date(Date.now() - seg.noReplyDays * 24 * 60 * 60 * 1000).toISOString();
          const { data: oldConvs } = await supabase
            .from('conversations')
            .select('id, contact_id')
            .lt('last_message_at', cutoff);
          const eligible = new Set<string>();
          if (oldConvs && oldConvs.length > 0) {
            const convIds = oldConvs.map((c) => c.id);
            const { data: msgs } = await supabase
              .from('messages')
              .select('conversation_id, sender_type, created_at')
              .in('conversation_id', convIds)
              .order('created_at', { ascending: false });
            
            const latestMsgMap = new Map<string, string>();
            for (const msg of msgs ?? []) {
              if (!latestMsgMap.has(msg.conversation_id)) {
                latestMsgMap.set(msg.conversation_id, msg.sender_type);
              }
            }

            for (const c of oldConvs) {
              const latestSender = latestMsgMap.get(c.id);
              if (latestSender === 'agent' || latestSender === 'bot') {
                eligible.add(c.contact_id);
              }
            }
          }
          if (contactIds === null) contactIds = eligible;
          else contactIds = new Set([...contactIds].filter((id) => eligible.has(id)));
        }

        // Segment-level tag exclusions
        if (seg.excludeTagIds && seg.excludeTagIds.length > 0) {
          const { data } = await supabase
            .from('contact_tags')
            .select('contact_id')
            .in('tag_id', seg.excludeTagIds);
          const exSet = new Set((data ?? []).map((r) => r.contact_id));
          if (contactIds === null) {
            const { data: allC } = await supabase.from('contacts').select('id');
            contactIds = new Set((allC ?? []).map((c) => c.id).filter((id) => !exSet.has(id)));
          } else {
            contactIds = new Set([...contactIds].filter((id) => !exSet.has(id)));
          }
        }

        baseIds = contactIds || new Set();
      } else {
        // Partially-configured audience — wait for the user to finish.
        setEstimatedCount(null);
        return;
      }

      // Apply exclude tags
      let excludeSet: Set<string> | null = null;
      if (audience.excludeTagIds && audience.excludeTagIds.length > 0) {
        const { data: excludeRows } = await supabase
          .from('contact_tags')
          .select('contact_id')
          .in('tag_id', audience.excludeTagIds);
        excludeSet = new Set((excludeRows ?? []).map((r) => r.contact_id));
      }

      if (baseIds) {
        const effective = [...baseIds].filter(
          (id) => !excludeSet?.has(id),
        );
        setEstimatedCount(effective.length);
      } else {
        // "All" — fetch the total, then subtract exclude set if any.
        const { count } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true });
        const total = count ?? 0;
        setEstimatedCount(excludeSet ? Math.max(0, total - excludeSet.size) : total);
      }
    } finally {
      setLoadingCount(false);
    }
  }, [
    audience.type,
    audience.tagIds,
    audience.customField,
    audience.csvContacts,
    audience.excludeTagIds,
    audience.segment,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEstimatedCount();
  }, [fetchEstimatedCount]);

  function toggleTag(tagId: string) {
    const current = audience.tagIds ?? [];
    const updated = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    onUpdate({ ...audience, tagIds: updated });
  }

  function toggleExcludeTag(tagId: string) {
    const current = audience.excludeTagIds ?? [];
    const updated = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    onUpdate({ ...audience, excludeTagIds: updated });
  }

  function updateCustomField(patch: Partial<CustomFieldFilter>) {
    const prev = audience.customField ?? {
      fieldId: '',
      operator: 'is' as CustomFieldOperator,
      value: '',
    };
    onUpdate({ ...audience, customField: { ...prev, ...patch } });
  }

  function updateSegment(patch: Partial<SegmentFilter>) {
    const prev = audience.segment ?? {};
    onUpdate({ ...audience, segment: { ...prev, ...patch } });
  }

  function toggleSegmentTag(tagId: string) {
    const current = audience.segment?.tagIds ?? [];
    const updated = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    updateSegment({ tagIds: updated });
  }

  function toggleSegmentExcludeTag(tagId: string) {
    const current = audience.segment?.excludeTagIds ?? [];
    const updated = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    updateSegment({ excludeTagIds: updated });
  }

  const isValid =
    audience.type === 'all' ||
    (audience.type === 'tags' && audience.tagIds && audience.tagIds.length > 0) ||
    (audience.type === 'custom_field' &&
      !!audience.customField?.fieldId &&
      audience.customField.value.length > 0) ||
    (audience.type === 'csv' &&
      audience.csvContacts &&
      audience.csvContacts.length > 0) ||
    audience.type === 'segment';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Select Audience</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose who will receive this broadcast.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {audienceOptions.map((option) => {
          const isSelected = audience.type === option.type;
          const Icon = option.icon;
          return (
            <button
              key={option.type}
              onClick={() =>
                onUpdate({
                  ...audience,
                  type: option.type,
                  // Wipe shape fields from other types to avoid stale
                  // config leaking across selections.
                  tagIds: option.type === 'tags' ? audience.tagIds : undefined,
                  customField:
                    option.type === 'custom_field'
                      ? audience.customField
                      : undefined,
                  csvContacts:
                    option.type === 'csv' ? audience.csvContacts : undefined,
                  segment:
                    option.type === 'segment' ? audience.segment ?? {} : undefined,
                })
              }
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card/50 hover:border-border'
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{option.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {audience.type === 'tags' && (
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Select Tags</p>
          {loadingTags ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : tags.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No tags found. Create tags in Settings.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected = audience.tagIds?.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border bg-muted text-muted-foreground hover:border-border'
                    }`}
                  >
                    <span
                      className="mr-1.5 h-2 w-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {audience.type === 'custom_field' && (
        <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
          <p className="text-sm font-medium text-foreground">Custom Field Filter</p>
          {loadingFields ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : customFields.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No custom fields defined. Create one in Settings → Custom Fields.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)]">
              <select
                value={audience.customField?.fieldId ?? ''}
                onChange={(e) => updateCustomField({ fieldId: e.target.value })}
                className="h-9 rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">Select field…</option>
                {customFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.field_name}
                  </option>
                ))}
              </select>
              <select
                value={audience.customField?.operator ?? 'is'}
                onChange={(e) =>
                  updateCustomField({
                    operator: e.target.value as CustomFieldOperator,
                  })
                }
                className="h-9 rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {OPERATOR_OPTIONS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={audience.customField?.value ?? ''}
                onChange={(e) => updateCustomField({ value: e.target.value })}
                placeholder="Value"
                className="h-9 rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>
      )}

      {audience.type === 'segment' && (
        <div className="space-y-4 rounded-xl border border-border bg-card/50 p-4">
          <p className="text-sm font-semibold text-foreground">Dynamic Segment Rules</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Combine multiple criteria to build a highly targeted campaign audience. If a section is left unconfigured, it will be skipped.
          </p>

          {/* 1. Tag Inclusions */}
          <div className="space-y-2 border-t border-border/40 pt-3">
            <Label className="text-xs font-semibold text-foreground">Include Contacts Tagged With</Label>
            {loadingTags ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : tags.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No tags defined.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const isSelected = audience.segment?.tagIds?.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleSegmentTag(tag.id)}
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all ${
                        isSelected
                          ? 'border-primary/45 bg-primary/10 text-primary'
                          : 'border-border bg-muted text-muted-foreground hover:border-border'
                      }`}
                    >
                      <span className="mr-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Deals / Pipeline Stage */}
          <div className="space-y-2 border-t border-border/40 pt-3">
            <Label className="text-xs font-semibold text-foreground">Filter by Active Deal Stage</Label>
            {loadingStages ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <select
                value={audience.segment?.pipelineStageId ?? ''}
                onChange={(e) => updateSegment({ pipelineStageId: e.target.value || undefined })}
                className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">Any pipeline stage (No filter)</option>
                {pipelineStages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.pipeline?.name ? `${stage.pipeline.name} — ` : ''}{stage.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 3. Interaction / Activity History */}
          <div className="grid grid-cols-1 gap-4 border-t border-border/40 pt-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Idle Duration (No messages)</span>
                {audience.segment?.idleDays ? (
                  <span className="text-[10px] text-primary">{audience.segment.idleDays} days</span>
                ) : null}
              </Label>
              <select
                value={audience.segment?.idleDays ?? 0}
                onChange={(e) => updateSegment({ idleDays: Number(e.target.value) || undefined })}
                className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value={0}>No idle filter</option>
                <option value={1}>Idle for 1 day or more</option>
                <option value={3}>Idle for 3 days or more</option>
                <option value={7}>Idle for 7 days or more</option>
                <option value={14}>Idle for 14 days or more</option>
                <option value={30}>Idle for 30 days or more</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>No Reply From Customer</span>
                {audience.segment?.noReplyDays ? (
                  <span className="text-[10px] text-primary">{audience.segment.noReplyDays} days</span>
                ) : null}
              </Label>
              <select
                value={audience.segment?.noReplyDays ?? 0}
                onChange={(e) => updateSegment({ noReplyDays: Number(e.target.value) || undefined })}
                className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value={0}>No reply filter</option>
                <option value={1}>No customer reply for 1+ day</option>
                <option value={3}>No customer reply for 3+ days</option>
                <option value={7}>No customer reply for 7+ days</option>
                <option value={14}>No customer reply for 14+ days</option>
                <option value={30}>No customer reply for 30+ days</option>
              </select>
            </div>
          </div>

          {/* 4. Tag Exclusions */}
          <div className="space-y-2 border-t border-border/40 pt-3">
            <Label className="text-xs font-semibold text-foreground">Exclude Contacts Tagged With</Label>
            {loadingTags ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : tags.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No tags defined.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const isExcluded = audience.segment?.excludeTagIds?.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleSegmentExcludeTag(tag.id)}
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all ${
                        isExcluded
                          ? 'border-red-500/45 bg-red-500/10 text-red-300'
                          : 'border-border bg-muted text-muted-foreground hover:border-border'
                      }`}
                    >
                      <span className="mr-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exclude list — applies regardless of audience type */}
      <div className="rounded-xl border border-border bg-card/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <X className="h-4 w-4 text-red-400" />
          <p className="text-sm font-medium text-foreground">
            Exclude contacts with these tags
          </p>
          <span className="text-xs text-muted-foreground">(optional)</span>
        </div>
        {tags.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tags available.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isExcluded = audience.excludeTagIds?.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleExcludeTag(tag.id)}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    isExcluded
                      ? 'border-red-500/30 bg-red-500/10 text-red-300'
                      : 'border-border bg-muted text-muted-foreground hover:border-border'
                  }`}
                >
                  <span
                    className="mr-1.5 h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Audience Summary */}
      <div className="rounded-xl border border-border bg-card/50 p-4">
        <p className="mb-2 text-sm font-medium text-foreground">Audience Summary</p>
        {loadingCount ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Calculating…</span>
          </div>
        ) : estimatedCount !== null ? (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">
              {estimatedCount.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">estimated recipients</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Select an audience type to see the estimate.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-border text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
