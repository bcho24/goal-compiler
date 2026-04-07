'use client';

import { Target, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';

interface DemoReviewPanelProps {
  goalText: string;
  isConfirming: boolean;
}

export function DemoReviewPanel({ goalText, isConfirming }: DemoReviewPanelProps) {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t('goalReview.title')}</CardTitle>
          </div>
          {isConfirming && (
            <Badge variant="outline" className="gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              {t('goalReview.confirmed')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {t('goalReview.currentGoal')}
          </p>
          <p className="text-sm leading-relaxed bg-muted/50 rounded-md p-3">{goalText}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button disabled variant="outline" size="sm">
            {t('goalReview.adjust')}
          </Button>
          <Button disabled size="sm">
            {t('goalReview.confirm')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
