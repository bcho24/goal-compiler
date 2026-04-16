'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2, HelpCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ClarifyQuestion } from '@/lib/types';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { toast } from 'sonner';

interface ClarifyQuestionsProps {
  goalText: string;
  aiUnderstanding: string | null;
  isActive: boolean;
  onAnswersSubmitted: (qa: { question: string; answer: string }[]) => void;
}

export function ClarifyQuestions({
  goalText,
  aiUnderstanding,
  isActive,
  onAnswersSubmitted,
}: ClarifyQuestionsProps) {
  const [questions, setQuestions] = useState<ClarifyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});
  const [multiAnswers, setMultiAnswers] = useState<Record<string, string[]>>({});
  const [multiCustomTexts, setMultiCustomTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const autoTriggered = useRef(false);
  const config = useSettingsStore((s) => s.config);

  const fetchQuestions = useCallback(async () => {
    if (!aiUnderstanding) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalText,
          aiUnderstanding,
          existingQA: [],
          mode: 'questions_only',
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
      setQuestions(data.questions || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`获取澄清问题失败: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [goalText, aiUnderstanding, config]);

  useEffect(() => {
    if (isActive && aiUnderstanding && !autoTriggered.current && !submitted) {
      autoTriggered.current = true;
      fetchQuestions();
    }
  }, [isActive, aiUnderstanding, fetchQuestions, submitted]);

  const handleSubmit = () => {
    const resolved: { question: string; answer: string }[] = [];
    for (const q of questions) {
      let answer = '';
      if (q.type === 'multi_select') {
        const selected = multiAnswers[q.id] || [];
        const finalItems = selected
          .map((v) => (v === '__custom__' ? multiCustomTexts[q.id]?.trim() || '' : v))
          .filter(Boolean);
        answer = finalItems.join('、');
      } else {
        const val = answers[q.id];
        if (val === '__custom__') {
          answer = customTexts[q.id]?.trim() || '';
        } else {
          answer = val || '';
        }
      }
      if (answer.trim()) {
        resolved.push({ question: q.question, answer });
      }
    }
    setSubmitted(true);
    onAnswersSubmitted(resolved);
  };

  const handleSkip = () => {
    setSubmitted(true);
    onAnswersSubmitted([]);
  };

  if (!isActive) return null;

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-2 py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">AI 正在分析关键模糊点...</span>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return null;
  }

  if (questions.length === 0) return null;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
          AI 关键问题 <span className="text-xs font-normal">（可跳过，直接编辑上方理解）</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="space-y-2">
            <Label className="text-sm font-medium">
              {q.question}
              {q.type === 'multi_select' && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">（可多选）</span>
              )}
            </Label>
            {q.type === 'multi_select' && q.options ? (
              <div className="space-y-1.5">
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
                            [q.id]: checked ? [...current, opt] : current.filter((v) => v !== opt),
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
                    id={`multi-${q.id}-custom`}
                    checked={(multiAnswers[q.id] || []).includes('__custom__')}
                    onCheckedChange={(checked) => {
                      setMultiAnswers((prev) => {
                        const current = prev[q.id] || [];
                        return {
                          ...prev,
                          [q.id]: checked ? [...current, '__custom__'] : current.filter((v) => v !== '__custom__'),
                        };
                      });
                    }}
                  />
                  <Input
                    placeholder="其他..."
                    className="h-7 text-sm"
                    value={multiCustomTexts[q.id] || ''}
                    onChange={(e) => setMultiCustomTexts((ct) => ({ ...ct, [q.id]: e.target.value }))}
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
                    placeholder="其他..."
                    className="h-7 text-sm"
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
                placeholder="输入你的回答..."
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              />
            )}
          </div>
        ))}

        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSubmit} className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            提交回答
          </Button>
          <Button size="sm" variant="ghost" onClick={handleSkip} className="text-muted-foreground text-xs">
            跳过，直接确认目标
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
