'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, ListChecks, Settings2, CheckCircle2, Check, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StepItem } from './StepItem';
import { StepGroupedView } from './StepGroupedView';
import { StepGraphView } from './StepGraphView';
import type { Step, StepGroup, ClarifyQuestion, Feasibility, GoalState, AncestorContext } from '@/lib/types';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useI18n } from '@/lib/i18n';
import { buildExportJson, downloadJson } from '@/lib/export';
import { toast } from 'sonner';

interface StepsPanelProps {
  goalText: string;
  goalState: GoalState;
  clarifications: { question: string; answer: string }[];
  stepPlanningResolvedQa: { question: string; answer: string }[];
  feasibility: Feasibility | null;
  steps: Step[];
  stepGroups: StepGroup[];
  parentContext?: AncestorContext[] | null;
  parentContextReady?: boolean;
  stepClarificationQuestions: ClarifyQuestion[] | null;
  isActive: boolean;
  onStepsGenerated: (
    steps: {
      order: number; title: string; description: string;
      type?: string; executable?: boolean; blocked_by?: number[];
      reason_if_not_executable?: string; tool_hint?: string; group?: string;
    }[],
    groups?: { id: string; title: string; description?: string; order: number; blocked_by?: number[] }[]
  ) => void | Promise<void>;
  onStepClarificationNeeded: (questions: ClarifyQuestion[]) => void | Promise<void>;
  onStepClarificationAnswered: (answers: Record<string, string>) => void;
  onToggleStep: (stepId: string) => void;
  onEditStep: (stepId: string, title: string, description: string) => void;
  onDeleteStep: (stepId: string) => void;
  onDrillDown: (step: Step) => void;
  onViewChild: (childGoalId: string) => void;
  onEditGroup: (groupId: string, title: string, description?: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onComplete: () => void;
  childStepCounts?: Record<string, number>;
}

export function StepsPanel({
  goalText,
  goalState,
  clarifications,
  stepPlanningResolvedQa,
  feasibility,
  steps,
  stepGroups,
  parentContext,
  parentContextReady = true,
  stepClarificationQuestions,
  isActive,
  onStepsGenerated,
  onStepClarificationNeeded,
  onStepClarificationAnswered,
  onToggleStep,
  onEditStep,
  onDeleteStep,
  onDrillDown,
  onViewChild,
  onEditGroup,
  onDeleteGroup,
  onComplete,
  childStepCounts,
}: StepsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [scAnswers, setScAnswers] = useState<Record<string, string>>({});
  const [scMultiAnswers, setScMultiAnswers] = useState<Record<string, string[]>>({});
  const [scMultiCustomTexts, setScMultiCustomTexts] = useState<Record<string, string>>({});
  const [showAdjustInput, setShowAdjustInput] = useState(false);
  const [adjustInput, setAdjustInput] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [pendingData, setPendingData] = useState<{
    steps: { order: number; title: string; description: string; type?: string; executable?: boolean; blocked_by?: number[]; reason_if_not_executable?: string; tool_hint?: string; group?: string }[];
    groups?: { id: string; title: string; description?: string; order: number; blocked_by?: number[] }[];
  } | null>(null);
  const config = useSettingsStore((s) => s.config);
  const triggered = useRef(false);
  const { t } = useI18n();

  const isGenerating = goalState === 'GENERATING_STEPS';
  const isClarifying = goalState === 'CLARIFYING_STEPS';
  const isStable = goalState === 'STEPS_STABLE' || goalState === 'COMPLETED';

  useEffect(() => {
    if (isGenerating && steps.length === 0 && !loading && !triggered.current && parentContextReady) {
      triggered.current = true;
      generateSteps();
    }
  }, [isGenerating, steps.length, parentContextReady]);

  const generateSteps = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalText,
          clarifications,
          stepClarifications: stepPlanningResolvedQa,
          feasibility,
          parentContext,
          compatType: config.compatType,
          baseURL: config.baseURL,
          apiKey: config.apiKey,
          model: config.model,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      const data = await res.json();

      if (data.steps?.length > 0) {
        await onStepsGenerated(data.steps, data.groups);
      } else {
        toast.error(t('stepsPanel.noStepsReturned'));
        triggered.current = false;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(t('common.aiRequestFailed', { msg: message }));
      triggered.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleClarificationSubmit = () => {
    if (!stepClarificationQuestions) return;
    const resolved: Record<string, string> = {};
    for (const q of stepClarificationQuestions) {
      if (q.type === 'multi_select') {
        const selected = scMultiAnswers[q.id] || [];
        const finalItems = selected
          .map((v) => (v === '__custom__' ? scMultiCustomTexts[q.id]?.trim() || '' : v))
          .filter(Boolean);
        resolved[q.id] = finalItems.join('、');
      } else {
        resolved[q.id] = scAnswers[q.id] || '';
      }
    }
    const allAnswered = stepClarificationQuestions.every((q) => resolved[q.id]?.trim());
    if (!allAnswered) {
      toast.warning(t('common.answerAllQuestions'));
      return;
    }
    onStepClarificationAnswered(resolved);
    setScAnswers({});
    setScMultiAnswers({});
    setScMultiCustomTexts({});
  };

  const handleAdjustSubmit = async () => {
    if (!adjustInput.trim()) {
      toast.warning(t('stepsPanel.adjustInputRequired'));
      return;
    }
    setAdjustLoading(true);
    try {
      const currentSteps = steps.map((s) => ({ order: s.order, title: s.title, description: s.description }));
      const res = await fetch('/api/ai/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalText,
          clarifications,
          stepClarifications: stepPlanningResolvedQa,
          feasibility,
          parentContext,
          adjustmentInstruction: adjustInput.trim(),
          currentSteps,
          compatType: config.compatType,
          baseURL: config.baseURL,
          apiKey: config.apiKey,
          model: config.model,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      const data = await res.json();
      if (data.steps?.length > 0) {
        setPendingData({ steps: data.steps, groups: data.groups });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(t('common.aiRequestFailed', { msg: message }));
    } finally {
      setAdjustLoading(false);
    }
  };

  const handleConfirmAdjust = () => {
    if (!pendingData) return;
    onStepsGenerated(pendingData.steps, pendingData.groups);
    setPendingData(null);
    setAdjustInput('');
    setShowAdjustInput(false);
  };

  const handleCancelAdjust = () => {
    setPendingData(null);
    setAdjustInput('');
    setShowAdjustInput(false);
  };

  const handleExport = () => {
    const data = buildExportJson({
      goalTitle: goalText.slice(0, 50),
      goalText,
      clarifications,
      feasibility,
      steps,
      stepGroups,
    });
    const date = new Date().toISOString().slice(0, 10);
    const slug = goalText.slice(0, 20).replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    downloadJson(data, `goal-${slug}-${date}.json`);
  };

  if (loading || (isGenerating && steps.length === 0)) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm text-muted-foreground">{t('stepsPanel.generating')}</span>
        </CardContent>
      </Card>
    );
  }

  const hasGroups = stepGroups.length > 0 && steps.some((s) => s.group);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ListChecks className="h-4 w-4" />
          {t('stepsPanel.title')}
          {steps.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              ({steps.filter((s) => s.status === 'completed').length}/{steps.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isClarifying && stepClarificationQuestions && stepClarificationQuestions.length > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800 p-4 space-y-3">
            <p className="text-sm font-medium">{t('stepsPanel.needsClarification')}</p>
            {stepClarificationQuestions.map((q) => (
              <div key={q.id} className="space-y-2">
                <Label className="text-sm">
                  {q.question}
                  {q.type === 'multi_select' && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t('common.multiSelectHint')}</span>
                  )}
                </Label>
                {q.type === 'multi_select' && q.options ? (
                  <div className="space-y-2">
                    {q.options.map((opt) => (
                      <div key={opt} className="flex items-center gap-2">
                        <Checkbox
                          id={`sc-multi-${q.id}-${opt}`}
                          checked={(scMultiAnswers[q.id] || []).includes(opt)}
                          onCheckedChange={(checked) => {
                            setScMultiAnswers((prev) => {
                              const current = prev[q.id] || [];
                              return {
                                ...prev,
                                [q.id]: checked
                                  ? [...current, opt]
                                  : current.filter((v) => v !== opt),
                              };
                            });
                          }}
                        />
                        <Label htmlFor={`sc-multi-${q.id}-${opt}`} className="text-sm font-normal cursor-pointer">
                          {opt}
                        </Label>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`sc-multi-${q.id}-__custom__`}
                        checked={(scMultiAnswers[q.id] || []).includes('__custom__')}
                        onCheckedChange={(checked) => {
                          setScMultiAnswers((prev) => {
                            const current = prev[q.id] || [];
                            return {
                              ...prev,
                              [q.id]: checked
                                ? [...current, '__custom__']
                                : current.filter((v) => v !== '__custom__'),
                            };
                          });
                        }}
                      />
                      <Input
                        placeholder={t('common.other')}
                        className="h-8 text-sm"
                        value={scMultiCustomTexts[q.id] || ''}
                        onFocus={() => {
                          setScMultiAnswers((prev) => {
                            const current = prev[q.id] || [];
                            if (!current.includes('__custom__')) {
                              return { ...prev, [q.id]: [...current, '__custom__'] };
                            }
                            return prev;
                          });
                        }}
                        onChange={(e) => {
                          setScMultiAnswers((prev) => {
                            const current = prev[q.id] || [];
                            if (!current.includes('__custom__')) {
                              return { ...prev, [q.id]: [...current, '__custom__'] };
                            }
                            return prev;
                          });
                          setScMultiCustomTexts((ct) => ({ ...ct, [q.id]: e.target.value }));
                        }}
                      />
                    </div>
                  </div>
                ) : q.type === 'select' && q.options ? (
                  <RadioGroup
                    value={scAnswers[q.id] || ''}
                    onValueChange={(v) => setScAnswers((a) => ({ ...a, [q.id]: v }))}
                  >
                    {q.options.map((opt) => (
                      <div key={opt} className="flex items-center gap-2">
                        <RadioGroupItem value={opt} id={`sc-${q.id}-${opt}`} />
                        <Label htmlFor={`sc-${q.id}-${opt}`} className="text-sm font-normal cursor-pointer">
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <Input
                    value={scAnswers[q.id] || ''}
                    onChange={(e) => setScAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    placeholder={t('common.yourAnswer')}
                  />
                )}
              </div>
            ))}
            <Button size="sm" onClick={handleClarificationSubmit}>
              {t('stepsPanel.submitContinue')}
            </Button>
          </div>
        )}

        {pendingData ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-3">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                {t('stepsPanel.adjustPreviewTitle')}
              </p>
              <div className="space-y-2">
                {pendingData.steps.map((step, i) => (
                  <div key={i} className="rounded-md bg-white dark:bg-background border p-2.5">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="gap-1.5" onClick={handleConfirmAdjust}>
                <Check className="h-3.5 w-3.5" />
                {t('stepsPanel.confirmAdjust')}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCancelAdjust}>
                <X className="h-3.5 w-3.5" />
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        ) : steps.length > 0 ? (
          hasGroups ? (
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="mb-3">
                <TabsTrigger value="list">{t('stepsPanel.viewList')}</TabsTrigger>
                <TabsTrigger value="graph">{t('stepsPanel.viewGraph')}</TabsTrigger>
              </TabsList>
              <TabsContent value="list">
                <StepGroupedView
                  steps={steps}
                  stepGroups={stepGroups}
                  onToggleStep={onToggleStep}
                  onEditStep={onEditStep}
                  onDeleteStep={onDeleteStep}
                  onDrillDown={onDrillDown}
                  onViewChild={onViewChild}
                  onEditGroup={onEditGroup}
                  onDeleteGroup={onDeleteGroup}
                  childStepCounts={childStepCounts}
                />
              </TabsContent>
              <TabsContent value="graph">
                <StepGraphView steps={steps} stepGroups={stepGroups} />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-2">
              {steps.map((step) => (
                <StepItem
                  key={step.id}
                  step={step}
                  index={step.order}
                  onToggleStatus={onToggleStep}
                  onEdit={onEditStep}
                  onDelete={onDeleteStep}
                  onDrillDown={onDrillDown}
                  onViewChild={onViewChild}
                  childStepCount={step.childGoalId ? childStepCounts?.[step.childGoalId] : undefined}
                  allSteps={steps}
                />
              ))}
            </div>
          )
        ) : null}

        {isActive && isStable && !pendingData && (
          <>
            {showAdjustInput && (
              <div className="rounded-lg border border-muted p-3 space-y-2 bg-muted/20">
                <p className="text-sm font-medium">{t('stepsPanel.adjustInputLabel')}</p>
                <Textarea
                  value={adjustInput}
                  onChange={(e) => setAdjustInput(e.target.value)}
                  placeholder={t('stepsPanel.adjustInputPlaceholder')}
                  className="min-h-[80px] text-sm resize-none"
                  disabled={adjustLoading}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={handleAdjustSubmit}
                    disabled={adjustLoading || !adjustInput.trim()}
                  >
                    {adjustLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Settings2 className="h-3.5 w-3.5" />
                    )}
                    {adjustLoading ? t('stepsPanel.adjusting') : t('stepsPanel.submitAdjust')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelAdjust}
                    disabled={adjustLoading}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowAdjustInput((v) => !v)}
              >
                <Settings2 className="h-3.5 w-3.5" />
                {t('stepsPanel.adjustSteps')}
              </Button>
              {steps.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleExport}
                >
                  <Download className="h-3.5 w-3.5" />
                  {t('stepsPanel.exportJson')}
                </Button>
              )}
              <Button size="sm" className="gap-1.5 ml-auto" onClick={onComplete}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('stepsPanel.complete')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
