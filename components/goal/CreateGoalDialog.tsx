'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useGoalStore } from '@/lib/store/goalStore';
import { useI18n } from '@/lib/i18n';

export function CreateGoalDialog() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const router = useRouter();
  const createGoal = useGoalStore((s) => s.createGoal);
  const { t } = useI18n();

  const handleCreate = async () => {
    if (!text.trim()) return;
    const goal = await createGoal(text.trim());
    setText('');
    setOpen(false);
    router.push(`/goal/${goal.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="h-4 w-4" />
        {t('home.newGoal')}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('createGoal.title')}</DialogTitle>
          <DialogDescription>{t('createGoal.description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Textarea
            placeholder={t('createGoal.placeholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleCreate();
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={!text.trim()}>
              {t('createGoal.startPlanning')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
