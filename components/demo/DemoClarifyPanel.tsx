'use client';

import { Loader2, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { DemoQuestion } from '@/lib/demo/types';

interface DemoClarifyPanelProps {
  questions: DemoQuestion[];
  filledAnswers: Record<number, string>;
  aiThinking: boolean;
  isSubmitting: boolean;
}

export function DemoClarifyPanel({
  questions,
  filledAnswers,
  aiThinking,
  isSubmitting,
}: DemoClarifyPanelProps) {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t('clarify.title')}</CardTitle>
          </div>
          {isSubmitting && (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('clarify.aiAnalyzing')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {aiThinking && questions.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t('clarify.aiAnalyzing')}</span>
          </div>
        )}

        {questions.map((q, idx) => {
          const answered = filledAnswers[idx] !== undefined;
          return (
            <div
              key={idx}
              className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <Label className="text-sm font-medium">
                {idx + 1}. {q.question}
              </Label>

              {q.type === 'select' && q.options ? (
                <RadioGroup value={answered ? q.answer : ''} className="space-y-1.5">
                  {q.options.map((opt) => (
                    <div key={opt} className="flex items-center gap-2">
                      <RadioGroupItem value={opt} id={`q${idx}-${opt}`} disabled />
                      <Label htmlFor={`q${idx}-${opt}`} className="text-sm font-normal">
                        {opt}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <Input
                  value={answered ? filledAnswers[idx] : ''}
                  readOnly
                  placeholder={t('common.yourAnswer')}
                  className="text-sm"
                />
              )}

              {answered && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                </div>
              )}
            </div>
          );
        })}

        {questions.length > 0 && !isSubmitting && (
          <div className="flex justify-end pt-2">
            <Button disabled className="gap-2">
              {t('clarify.submitAnswers')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
