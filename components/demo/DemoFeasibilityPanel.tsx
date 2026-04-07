'use client';

import { Loader2, Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import type { FeasibilityLevel } from '@/lib/types';

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

interface DemoFeasibilityPanelProps {
  feasibility: {
    summary: string;
    level: FeasibilityLevel;
    assumptions: string[];
    risks: string[];
  } | null;
  aiThinking: boolean;
  isConfirming: boolean;
}

export function DemoFeasibilityPanel({
  feasibility,
  aiThinking,
  isConfirming,
}: DemoFeasibilityPanelProps) {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t('feasibility.title')}</CardTitle>
          </div>
          {isConfirming && (
            <Badge variant="outline" className="gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              {t('feasibility.confirmed')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {aiThinking && !feasibility && (
          <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t('feasibility.evaluating')}</span>
          </div>
        )}

        {feasibility && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className={`rounded-lg p-3 ${LEVEL_COLORS[feasibility.level].bg}`}>
              <div className="flex items-center gap-2 mb-1">
                {(() => {
                  const Icon = LEVEL_ICONS[feasibility.level];
                  return <Icon className={`h-4 w-4 ${LEVEL_COLORS[feasibility.level].color}`} />;
                })()}
                <span className={`text-sm font-medium ${LEVEL_COLORS[feasibility.level].color}`}>
                  {t('feasibility.feasibilityLabel')}: {t(LEVEL_KEYS[feasibility.level])}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{feasibility.summary}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">{t('feasibility.assumptions')}</h4>
              <ul className="space-y-1">
                {feasibility.assumptions.map((a, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-muted-foreground/50 shrink-0">•</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">{t('feasibility.risks')}</h4>
              <ul className="space-y-1">
                {feasibility.risks.map((r, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-muted-foreground/50 shrink-0">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button disabled size="sm">
                {t('feasibility.confirmContinue')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
