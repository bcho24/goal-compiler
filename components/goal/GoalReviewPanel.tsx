'use client';

import { useState, useCallback } from 'react';
import { Loader2, Target, CheckCircle2, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { ClarifyQuestion, GoalAdjustment, GoalState } from '@/lib/types';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';

interface GoalReviewPanelProps {
  goalText: string;
  clarifications: { question: string; answer: string }[];
  goalAdjustments: GoalAdjustment[];
  isActive: boolean;
  currentState: GoalState;
  onConfirm: () => void;
  onAdjustStateStart: () => void;
  onGoalUpdated: (updatedText: string, summary: string) => void;
  onAddAdjustment: (data: Omit<GoalAdjustment, 'id'>) => Promise<GoalAdjustment>;
  onUpdateAdjustment: (id: string, updates: Partial<GoalAdjustment>) => Promise<void>;
}

export function GoalReviewPanel({
  goalText,
  clarifications,
  goalAdjustments,
  isActive,
  currentState,
  onConfirm,
  onAdjustStateStart,
  onGoalUpdated,
  onAddAdjustment,
  onUpdateAdjustment,
}: GoalReviewPanelProps) {
  const [showAdjustInput, setShowAdjustInput] = useState(false);
  const [adjustmentText, setAdjustmentText] = useState('');
  const [pendingQuestions, setPendingQuestions] = useState<ClarifyQuestion[]>([]);
  const [currentAdjustmentId, setCurrentAdjustmentId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});
  const [multiAnswers, setMultiAnswers] = useState<Record<string, string[]>>({});
  const [multiCustomTexts, setMultiCustomTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const config = useSettingsStore((s) => s.config);
  const { t } = useI18n();

  const appliedAdjustments = goalAdjustments.filter((a) => a.status === 'applied');

  const callAdjustAPI = useCallback(async (
    userRequest: string,
    adjustmentQA: { question: string; answer: string }[]
  ) => {
    const res = await fetch('/api/ai/adjust-goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goalText,
        clarifications,
        userRequest,
        adjustmentQA,
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
    return res.json();
  }, [goalText, clarifications, config]);

  const handleAdjustSubmit = async () => {
    const trimmed = adjustmentText.trim();
    if (!trimmed) return;

    onAdjustStateStart();
    setLoading(true);
    try {
      const data = await callAdjustAPI(trimmed, []);

      if (data.needsClarification && data.questions?.length > 0) {
        const adjustment = await onAddAdjustment({
          goalId: '',
          round: appliedAdjustments.length + 1,
          userRequest: trimmed,
          questions: data.questions,
          status: 'clarifying',
        });
        setCurrentAdjustmentId(adjustment.id);
        setPendingQuestions(data.questions);
      } else {
        const updated = data.updatedGoalText || goalText;
        const summary = data.goalSummary || updated.slice(0, 50);
        const adjustment = await onAddAdjustment({
          goalId: '',
          round: appliedAdjustments.length + 1,
          userRequest: trimmed,
          questions: [],
          status: 'applied',
        });
        await onUpdateAdjustment(adjustment.id, { status: 'applied' });
        setAdjustmentText('');
        setShowAdjustInput(false);
        onGoalUpdated(updated, summary);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(t('common.aiRequestFailed', { msg: message }));
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!currentAdjustmentId) return;

    const resolved: Record<string, string> = {};
    for (const q of pendingQuestions) {
      if (q.type === 'multi_select') {
        const selected = multiAnswers[q.id] || [];
        const finalItems = selected
          .map((v) => (v === '__custom__' ? multiCustomTexts[q.id]?.trim() || '' : v))
          .filter(Boolean);
        resolved[q.id] = finalItems.join('、');
      } else {
        const val = answers[q.id];
        resolved[q.id] = val === '__custom__' ? (customTexts[q.id]?.trim() || '') : (val || '');
      }
    }
    const allAnswered = pendingQuestions.every((q) => resolved[q.id]?.trim());
    if (!allAnswered) {
      toast.warning(t('common.answerAllQuestions'));
      return;
    }

    const updatedQuestions = pendingQuestions.map((q) => ({ ...q, answer: resolved[q.id] }));
    await onUpdateAdjustment(currentAdjustmentId, { questions: updatedQuestions });

    const adjustmentQA = updatedQuestions.map((q) => ({ question: q.question, answer: q.answer! }));
    const adjustment = goalAdjustments.find((a) => a.id === currentAdjustmentId);
    if (!adjustment) return;

    setLoading(true);
    setAnswers({});
    setCustomTexts({});
    setMultiAnswers({});
    setMultiCustomTexts({});
    try {
      const data = await callAdjustAPI(adjustment.userRequest, adjustmentQA);

      if (data.needsClarification && data.questions?.length > 0) {
        const newAdjustment = await onAddAdjustment({
          goalId: '',
          round: appliedAdjustments.length + 1,
          userRequest: adjustment.userRequest,
          questions: data.questions,
          status: 'clarifying',
        });
        setCurrentAdjustmentId(newAdjustment.id);
        setPendingQuestions(data.questions);
      } else {
        const updated = data.updatedGoalText || goalText;
        const summary = data.goalSummary || updated.slice(0, 50);
        await onUpdateAdjustment(currentAdjustmentId, { status: 'applied' });
        setPendingQuestions([]);
        setCurrentAdjustmentId(null);
        setAdjustmentText('');
        setShowAdjustInput(false);
        onGoalUpdated(updated, summary);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(t('common.aiRequestFailed', { msg: message }));
    } finally {
      setLoading(false);
    }
  };

  if (!isActive && goalAdjustments.length === 0) return null;

  const isAdjusting = currentState === 'ADJUSTING_GOAL';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          {t('goalReview.title')}
          {!isActive && appliedAdjustments.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {t('goalReview.adjustedCount', { n: appliedAdjustments.length })}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {appliedAdjustments.length > 0 && (
          <div className="space-y-1.5">
            {appliedAdjustments.map((adj) => (
              <div key={adj.id} className="rounded-md bg-muted/50 px-3 py-2 text-sm flex items-start gap-2">
                <PenLine className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{adj.userRequest}</span>
              </div>
            ))}
          </div>
        )}

        {isActive && (
          <>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-medium text-muted-foreground mb-1.5">{t('goalReview.currentGoal')}</p>
              <p className="text-sm leading-relaxed">{goalText}</p>
            </div>

            {!isAdjusting && !showAdjustInput && (
              <div className="flex gap-2">
                <Button onClick={onConfirm} className="flex-1">
                  {t('goalReview.confirm')}
                </Button>
                <Button
                  onClick={() => setShowAdjustInput(true)}
                  variant="outline"
                  className="flex-1"
                >
                  {t('goalReview.adjust')}
                </Button>
              </div>
            )}

            {!isAdjusting && showAdjustInput && (
              <div className="space-y-3 rounded-lg border p-4">
                <Label className="text-sm font-medium">{t('goalReview.adjustPrompt')}</Label>
                <Textarea
                  placeholder={t('goalReview.adjustPlaceholder')}
                  value={adjustmentText}
                  onChange={(e) => setAdjustmentText(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleAdjustSubmit();
                    }
                  }}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAdjustInput(false);
                      setAdjustmentText('');
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAdjustSubmit}
                    disabled={!adjustmentText.trim()}
                  >
                    {t('goalReview.submitAdjust')}
                  </Button>
                </div>
              </div>
            )}

            {isAdjusting && loading && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">{t('goalReview.adjusting')}</span>
              </div>
            )}

            {isAdjusting && !loading && pendingQuestions.length > 0 && (
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">{t('goalReview.aiFollowUp')}</p>
                {pendingQuestions.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <Label className="text-sm font-medium">
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
                              id={`adj-multi-${q.id}-${opt}`}
                              checked={(multiAnswers[q.id] || []).includes(opt)}
                              onCheckedChange={(checked) => {
                                setMultiAnswers((prev) => {
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
                            <Label htmlFor={`adj-multi-${q.id}-${opt}`} className="text-sm font-normal cursor-pointer">
                              {opt}
                            </Label>
                          </div>
                        ))}
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`adj-multi-${q.id}-__custom__`}
                            checked={(multiAnswers[q.id] || []).includes('__custom__')}
                            onCheckedChange={(checked) => {
                              setMultiAnswers((prev) => {
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
                            value={multiCustomTexts[q.id] || ''}
                            onFocus={() => {
                              setMultiAnswers((prev) => {
                                const current = prev[q.id] || [];
                                if (!current.includes('__custom__')) {
                                  return { ...prev, [q.id]: [...current, '__custom__'] };
                                }
                                return prev;
                              });
                            }}
                            onChange={(e) => {
                              setMultiAnswers((prev) => {
                                const current = prev[q.id] || [];
                                if (!current.includes('__custom__')) {
                                  return { ...prev, [q.id]: [...current, '__custom__'] };
                                }
                                return prev;
                              });
                              setMultiCustomTexts((ct) => ({ ...ct, [q.id]: e.target.value }));
                            }}
                          />
                        </div>
                      </div>
                    ) : q.type === 'select' && q.options ? (
                      <RadioGroup
                        value={answers[q.id] || ''}
                        onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                      >
                        {q.options.map((opt) => (
                          <div key={opt} className="flex items-center gap-2">
                            <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                            <Label htmlFor={`${q.id}-${opt}`} className="text-sm font-normal cursor-pointer">
                              {opt}
                            </Label>
                          </div>
                        ))}
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="__custom__" id={`${q.id}-custom`} />
                          <Input
                            placeholder={t('common.other')}
                            className="h-8 text-sm"
                            value={customTexts[q.id] || ''}
                            onFocus={() => setAnswers((a) => ({ ...a, [q.id]: '__custom__' }))}
                            onChange={(e) => {
                              setAnswers((a) => ({ ...a, [q.id]: '__custom__' }));
                              setCustomTexts((ct) => ({ ...ct, [q.id]: e.target.value }));
                            }}
                          />
                        </div>
                      </RadioGroup>
                    ) : (
                      <Input
                        placeholder={t('common.yourAnswer')}
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <Button onClick={handleAnswerSubmit} size="sm">
                    {t('clarify.submitAnswers')}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {!isActive && appliedAdjustments.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            {t('goalReview.confirmed')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
