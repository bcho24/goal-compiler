'use client';

import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';

interface DemoGoalInputProps {
  displayedText: string;
  isSubmitting: boolean;
}

export function DemoGoalInput({ displayedText, isSubmitting }: DemoGoalInputProps) {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('goalInput.describeGoal')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={displayedText}
          readOnly
          rows={3}
          className="resize-none"
          placeholder={t('goalInput.placeholder')}
        />
        <div className="flex justify-end">
          <Button disabled className="gap-2">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t('goalInput.startPlanning')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
