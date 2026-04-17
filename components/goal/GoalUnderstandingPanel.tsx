'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Brain, Pencil, RotateCcw, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { toast } from 'sonner';
import { readStreamingJson } from '@/lib/ai/streamJson';
import type { UnderstandResponse } from '@/lib/ai/prompts';

interface UnderstandingBlock {
  title: string;
  content: string;
}

interface GoalUnderstandingPanelProps {
  goalText: string;
  goalId: string;
  aiUnderstanding: string | null;
  isActive: boolean;
  onUnderstandingGenerated: (understanding: string) => void;
  onUnderstandingUpdated: (understanding: string) => void;
  onConfirm: () => void;
  isConfirmed?: boolean;
}

function parseUnderstanding(raw: string): { summary: string; blocks: UnderstandingBlock[] } | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.summary === 'string' && Array.isArray(parsed.blocks)) {
      return parsed;
    }
  } catch {
    // ignore - might be legacy plain text
  }
  return null;
}

function formatUnderstandingForEdit(raw: string): string {
  const parsed = parseUnderstanding(raw);
  if (!parsed) return raw;
  const parts = [parsed.summary];
  for (const block of parsed.blocks) {
    parts.push(`### ${block.title}\n${block.content}`);
  }
  return parts.join('\n\n');
}

export function GoalUnderstandingPanel({
  goalText,
  goalId,
  aiUnderstanding,
  isActive,
  onUnderstandingGenerated,
  onUnderstandingUpdated,
  onConfirm,
  isConfirmed = false,
}: GoalUnderstandingPanelProps) {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [expanded, setExpanded] = useState(true);
  const triggered = useRef(false);
  const config = useSettingsStore((s) => s.config);

  const generateUnderstanding = useCallback(async (previousUnderstanding?: string | null, userNote?: string | null) => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/understand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalText,
          previousUnderstanding,
          userNote,
          compatType: config.compatType,
          baseURL: config.baseURL,
          apiKey: config.apiKey,
          model: config.model,
          enablePromptCaching: config.enablePromptCaching,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      // Stream the JSON response and update UI incrementally
      const data = await readStreamingJson<UnderstandResponse>(res, (partial) => {
        if (partial.summary || partial.blocks?.length) {
          const partialStr = JSON.stringify({
            summary: partial.summary ?? '',
            blocks: partial.blocks ?? [],
          });
          if (previousUnderstanding) {
            onUnderstandingUpdated(partialStr);
          } else {
            onUnderstandingGenerated(partialStr);
          }
        }
      });

      const understandingStr = JSON.stringify(data);
      if (previousUnderstanding) {
        onUnderstandingUpdated(understandingStr);
      } else {
        onUnderstandingGenerated(understandingStr);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`AI 理解生成失败: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [goalText, config, onUnderstandingGenerated, onUnderstandingUpdated]);

  // Auto-trigger on first mount if active and no understanding yet
  useEffect(() => {
    if (isActive && !aiUnderstanding && !loading && !triggered.current) {
      triggered.current = true;
      generateUnderstanding();
    }
  }, [isActive, aiUnderstanding, loading, generateUnderstanding]);

  const handleStartEdit = () => {
    setEditText(aiUnderstanding ? formatUnderstandingForEdit(aiUnderstanding) : '');
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    setEditing(false);
    // Re-generate understanding based on user's edited text
    await generateUnderstanding(aiUnderstanding, editText);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditText('');
  };

  const handleRegenerate = async () => {
    triggered.current = true;
    await generateUnderstanding(null);
  };

  if (loading && !aiUnderstanding) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">AI 正在理解目标...</span>
        </CardContent>
      </Card>
    );
  }

  if (!aiUnderstanding) return null;

  const parsed = parseUnderstanding(aiUnderstanding);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI 目标理解
            {isConfirmed && (
              <span className="text-xs font-normal text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="h-3 w-3" /> 已确认
              </span>
            )}
            {loading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {isActive && !editing && !isConfirmed && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs text-muted-foreground"
                  onClick={handleStartEdit}
                  disabled={loading}
                >
                  <Pencil className="h-3 w-3" />
                  编辑
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs text-muted-foreground"
                  onClick={handleRegenerate}
                  disabled={loading}
                >
                  <RotateCcw className="h-3 w-3" />
                  重新理解
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3">
          {editing ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                编辑后点击确认，AI 会基于你的修改重新生成理解
              </p>
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-[200px] text-sm font-mono"
                placeholder="编辑目标理解..."
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} disabled={!editText.trim()}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  确认并重新理解
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  取消
                </Button>
              </div>
            </div>
          ) : parsed ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-muted-foreground">{parsed.summary}</p>
              {parsed.blocks.map((block, i) => (
                <div key={i} className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                    {block.title}
                  </h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{block.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{aiUnderstanding}</p>
          )}

          {isActive && !editing && !isConfirmed && !loading && (
            <div className="pt-2 border-t">
              <Button onClick={onConfirm} className="w-full" size="sm">
                <Check className="h-3.5 w-3.5 mr-1.5" />
                确认目标，开始可行性分析
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
