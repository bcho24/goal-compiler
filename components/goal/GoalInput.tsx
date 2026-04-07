'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';

interface GoalInputProps {
  initialText?: string;
  onSubmit: (text: string) => void;
  isModifying?: boolean;
  isLoading?: boolean;
}

export function GoalInput({ initialText = '', onSubmit, isModifying = false, isLoading = false }: GoalInputProps) {
  const [text, setText] = useState(initialText);
  const { t } = useI18n();

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {isModifying ? t('goalInput.modifyGoal') : t('goalInput.describeGoal')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder={t('goalInput.placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="resize-none"
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
          }}
        />
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={!text.trim() || isLoading} className="gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isModifying ? t('goalInput.restart') : t('goalInput.startPlanning')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
