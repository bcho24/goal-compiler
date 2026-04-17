'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Feasibility, FeasibilityLevel } from '@/lib/types';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';

const LEVEL_ICONS = {
  high: CheckCircle2,
  medium: AlertTriangle,
  low: XCircle,
};

const LEVEL_COLORS: Record<FeasibilityLevel, { color: string; bg: string }> = {
  high: { color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' },
  medium: { color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950' },
  low: { color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950' },
};

const LEVEL_KEYS: Record<FeasibilityLevel, string> = {
  high: 'feasibility.levelHigh',
  medium: 'feasibility.levelMedium',
  low: 'feasibility.levelLow',
};

interface FeasibilityPanelProps {
  goalText: string;
  clarifications: { question: string; answer: string }[];
  feasibility: Feasibility | null;
  isActive: boolean;
  onFeasibilityGenerated: (data: Omit<Feasibility, 'id' | 'goalId' | 'userConfirmed'>) => void;
  onConfirm: () => void;
}

export function FeasibilityPanel({
  goalText,
  clarifications,
  feasibility,
  isActive,
  onFeasibilityGenerated,
  onConfirm,
}: FeasibilityPanelProps) {
  const [loading, setLoading] = useState(false);
  const config = useSettingsStore((s) => s.config);
  const triggered = useRef(false);
  const { t } = useI18n();

  useEffect(() => {
    if (isActive && !feasibility && !loading && !triggered.current) {
      triggered.current = true;
      requestFeasibility();
    }
  }, [isActive, feasibility]);

  const requestFeasibility = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/feasibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalText,
          clarifications,
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

      const data = await res.json();
      onFeasibilityGenerated(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(t('common.aiRequestFailed', { msg: message }));
      triggered.current = false;
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm text-muted-foreground">{t('feasibility.evaluating')}</span>
        </CardContent>
      </Card>
    );
  }

  if (!feasibility) return null;

  const LevelIcon = LEVEL_ICONS[feasibility.level];
  const colors = LEVEL_COLORS[feasibility.level];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          {t('feasibility.title')}
          {feasibility.userConfirmed && (
            <Badge variant="default" className="text-xs">{t('feasibility.confirmed')}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`rounded-lg p-3 ${colors.bg}`}>
          <div className="flex items-center gap-2 mb-2">
            <LevelIcon className={`h-4 w-4 ${colors.color}`} />
            <span className={`font-medium text-sm ${colors.color}`}>
              {t('feasibility.feasibilityLabel')}: {t(LEVEL_KEYS[feasibility.level])}
            </span>
          </div>
          <p className="text-sm">{feasibility.summary}</p>
        </div>

        {feasibility.assumptions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-1.5">{t('feasibility.assumptions')}</h4>
            <ul className="space-y-1">
              {feasibility.assumptions.map((a, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                  <span className="text-muted-foreground/60 mt-0.5">•</span>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        {feasibility.risks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-1.5">{t('feasibility.risks')}</h4>
            <ul className="space-y-1">
              {feasibility.risks.map((r, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isActive && !feasibility.userConfirmed && (
          <div className="flex gap-2 pt-2">
            <Button onClick={onConfirm} className="w-full">
              {t('feasibility.confirmContinue')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
