'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2, MessageSquare, CheckCircle2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { Clarification, ClarifyQuestion } from '@/lib/types';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';

interface ClarifyPanelProps {
  goalText: string;
  clarifications: Clarification[];
  isActive: boolean;
  onSubmitAnswers: (answers: Record<string, string>) => void;
  onEditRoundAnswers: (roundId: string, answers: Record<string, string>) => void;
  onClarificationComplete: (summary: string) => void;
  goalId: string;
  onNewQuestions: (questions: ClarifyQuestion[], goalSummary?: string) => void;
}

export function ClarifyPanel({
  goalText,
  clarifications,
  isActive,
  onSubmitAnswers,
  onEditRoundAnswers,
  onClarificationComplete,
  goalId,
  onNewQuestions,
}: ClarifyPanelProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});
  const [multiAnswers, setMultiAnswers] = useState<Record<string, string[]>>({});
  const [multiCustomTexts, setMultiCustomTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [editAnswers, setEditAnswers] = useState<Record<string, string>>({});
  const [editCustomTexts, setEditCustomTexts] = useState<Record<string, string>>({});
  const [editMultiAnswers, setEditMultiAnswers] = useState<Record<string, string[]>>({});
  const [editMultiCustomTexts, setEditMultiCustomTexts] = useState<Record<string, string>>({});

  const config = useSettingsStore((s) => s.config);
  const { t } = useI18n();

  const latestPending = clarifications.find((c) => c.status === 'pending');
  const answeredRounds = clarifications.filter((c) => c.status === 'answered');
  const autoTriggered = useRef(false);

  const requestClarification = useCallback(async () => {
    setLoading(true);
    try {
      const existingQA = answeredRounds.flatMap((c) =>
        c.questions.filter((q) => q.answer).map((q) => ({ question: q.question, answer: q.answer! }))
      );

      const res = await fetch('/api/ai/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalText,
          existingQA,
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

      if (data.isGoalClear) {
        onClarificationComplete(data.goalSummary || goalText);
      } else {
        onNewQuestions(data.questions, data.goalSummary);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(t('common.aiRequestFailed', { msg: message }));
    } finally {
      setLoading(false);
    }
  }, [goalText, answeredRounds, config, onClarificationComplete, onNewQuestions, t]);

  useEffect(() => {
    if (isActive && clarifications.length === 0 && !loading && !autoTriggered.current) {
      autoTriggered.current = true;
      requestClarification();
    }
  }, [isActive, clarifications.length, loading, requestClarification]);

  const handleSubmit = () => {
    if (!latestPending) return;
    const resolved: Record<string, string> = {};
    for (const q of latestPending.questions) {
      if (q.type === 'multi_select') {
        const selected = multiAnswers[q.id] || [];
        const finalItems = selected
          .map((v) => (v === '__custom__' ? multiCustomTexts[q.id]?.trim() || '' : v))
          .filter(Boolean);
        resolved[q.id] = finalItems.join('、');
      } else {
        const val = answers[q.id];
        if (val === '__custom__') {
          resolved[q.id] = customTexts[q.id]?.trim() || '';
        } else {
          resolved[q.id] = val || '';
        }
      }
    }
    const allAnswered = latestPending.questions.every((q) => resolved[q.id]?.trim());
    if (!allAnswered) {
      toast.warning(t('common.answerAllQuestions'));
      return;
    }
    onSubmitAnswers(resolved);
    setAnswers({});
    setCustomTexts({});
    setMultiAnswers({});
    setMultiCustomTexts({});
  };

  const handleStartEdit = (round: Clarification) => {
    const initial: Record<string, string> = {};
    const initialCustom: Record<string, string> = {};
    const initialMulti: Record<string, string[]> = {};
    const initialMultiCustom: Record<string, string> = {};
    for (const q of round.questions) {
      if (q.answer) {
        if (q.type === 'multi_select') {
          const parts = q.answer.split('、').map((s) => s.trim()).filter(Boolean);
          const knownOptions = q.options || [];
          const selectedKnown = parts.filter((p) => knownOptions.includes(p));
          const customParts = parts.filter((p) => !knownOptions.includes(p));
          initialMulti[q.id] = customParts.length > 0
            ? [...selectedKnown, '__custom__']
            : selectedKnown;
          if (customParts.length > 0) {
            initialMultiCustom[q.id] = customParts.join('、');
          }
        } else if (q.type === 'select') {
          const isOption = q.options?.includes(q.answer);
          if (isOption) {
            initial[q.id] = q.answer;
          } else {
            initial[q.id] = '__custom__';
            initialCustom[q.id] = q.answer;
          }
        } else {
          initial[q.id] = q.answer;
        }
      }
    }
    setEditAnswers(initial);
    setEditCustomTexts(initialCustom);
    setEditMultiAnswers(initialMulti);
    setEditMultiCustomTexts(initialMultiCustom);
    setEditingRoundId(round.id);
  };

  const handleEditSave = (round: Clarification) => {
    const resolved: Record<string, string> = {};
    for (const q of round.questions) {
      if (q.type === 'multi_select') {
        const selected = editMultiAnswers[q.id] || [];
        const finalItems = selected
          .map((v) => (v === '__custom__' ? editMultiCustomTexts[q.id]?.trim() || '' : v))
          .filter(Boolean);
        resolved[q.id] = finalItems.join('、');
      } else {
        const val = editAnswers[q.id];
        if (val === '__custom__') {
          resolved[q.id] = editCustomTexts[q.id]?.trim() || '';
        } else {
          resolved[q.id] = val || '';
        }
      }
    }
    const allAnswered = round.questions.every((q) => resolved[q.id]?.trim());
    if (!allAnswered) {
      toast.warning(t('common.answerAllQuestions'));
      return;
    }
    onEditRoundAnswers(round.id, resolved);
    setEditingRoundId(null);
    setEditAnswers({});
    setEditCustomTexts({});
    setEditMultiAnswers({});
    setEditMultiCustomTexts({});
  };

  const handleEditCancel = () => {
    setEditingRoundId(null);
    setEditAnswers({});
    setEditCustomTexts({});
    setEditMultiAnswers({});
    setEditMultiCustomTexts({});
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {t('clarify.title')}
          {!isActive && answeredRounds.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {t('clarify.roundsComplete', { n: answeredRounds.length })}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {answeredRounds.map((round) =>
          editingRoundId === round.id ? (
            <div key={round.id} className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-800 p-4">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">{t('clarify.editing')}</p>
              {round.questions.map((q) => (
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
                            id={`edit-multi-${q.id}-${opt}`}
                            checked={(editMultiAnswers[q.id] || []).includes(opt)}
                            onCheckedChange={(checked) => {
                              setEditMultiAnswers((prev) => {
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
                          <Label htmlFor={`edit-multi-${q.id}-${opt}`} className="text-sm font-normal cursor-pointer">
                            {opt}
                          </Label>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`edit-multi-${q.id}-__custom__`}
                          checked={(editMultiAnswers[q.id] || []).includes('__custom__')}
                          onCheckedChange={(checked) => {
                            setEditMultiAnswers((prev) => {
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
                          value={editMultiCustomTexts[q.id] || ''}
                          onFocus={() => {
                            setEditMultiAnswers((prev) => {
                              const current = prev[q.id] || [];
                              if (!current.includes('__custom__')) {
                                return { ...prev, [q.id]: [...current, '__custom__'] };
                              }
                              return prev;
                            });
                          }}
                          onChange={(e) => {
                            setEditMultiAnswers((prev) => {
                              const current = prev[q.id] || [];
                              if (!current.includes('__custom__')) {
                                return { ...prev, [q.id]: [...current, '__custom__'] };
                              }
                              return prev;
                            });
                            setEditMultiCustomTexts((ct) => ({ ...ct, [q.id]: e.target.value }));
                          }}
                        />
                      </div>
                    </div>
                  ) : q.type === 'select' && q.options ? (
                    <RadioGroup
                      value={editAnswers[q.id] || ''}
                      onValueChange={(v) => setEditAnswers((a) => ({ ...a, [q.id]: v }))}
                    >
                      {q.options.map((opt) => (
                        <div key={opt} className="flex items-center gap-2">
                          <RadioGroupItem value={opt} id={`edit-${q.id}-${opt}`} />
                          <Label htmlFor={`edit-${q.id}-${opt}`} className="text-sm font-normal cursor-pointer">
                            {opt}
                          </Label>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="__custom__" id={`edit-${q.id}-custom`} />
                        <Input
                          placeholder={t('common.other')}
                          className="h-8 text-sm"
                          value={editCustomTexts[q.id] || ''}
                          onFocus={() => setEditAnswers((a) => ({ ...a, [q.id]: '__custom__' }))}
                          onChange={(e) => {
                            setEditAnswers((a) => ({ ...a, [q.id]: '__custom__' }));
                            setEditCustomTexts((ct) => ({ ...ct, [q.id]: e.target.value }));
                          }}
                        />
                      </div>
                    </RadioGroup>
                  ) : (
                    <Input
                      placeholder={t('common.yourAnswer')}
                      value={editAnswers[q.id] || ''}
                      onChange={(e) => setEditAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => handleEditSave(round)}>
                  {t('common.save')}
                </Button>
                <Button size="sm" variant="outline" onClick={handleEditCancel}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div key={round.id} className="space-y-2 rounded-lg bg-muted/50 p-3">
              {round.questions.map((q) => (
                <div key={q.id} className="text-sm">
                  <p className="font-medium text-muted-foreground">{q.question}</p>
                  <p className="mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    {q.answer}
                  </p>
                </div>
              ))}
              {isActive && !latestPending && (
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-xs text-muted-foreground"
                    onClick={() => handleStartEdit(round)}
                  >
                    <Pencil className="h-3 w-3" />
                    {t('clarify.editAnswers')}
                  </Button>
                </div>
              )}
            </div>
          )
        )}

        {isActive && latestPending && (
          <div className="space-y-3 rounded-lg border p-4">
            {latestPending.questions.map((q) => (
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
                          id={`multi-${q.id}-${opt}`}
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
                        <Label htmlFor={`multi-${q.id}-${opt}`} className="text-sm font-normal cursor-pointer">
                          {opt}
                        </Label>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`multi-${q.id}-__custom__`}
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
              <Button onClick={handleSubmit} size="sm">
                {t('clarify.submitAnswers')}
              </Button>
            </div>
          </div>
        )}

        {isActive && !latestPending && !editingRoundId && (
          <div className="flex justify-center">
            {loading ? (
              <Button disabled className="gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('clarify.aiAnalyzing')}
              </Button>
            ) : (
              <Button onClick={requestClarification} variant="outline" className="gap-2">
                {clarifications.length === 0
                  ? t('clarify.startClarification')
                  : t('clarify.continueClarify')}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
