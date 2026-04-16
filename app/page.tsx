'use client';

import { useEffect } from 'react';
import { Target } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { CreateGoalDialog } from '@/components/goal/CreateGoalDialog';
import { useGoalStore } from '@/lib/store/goalStore';
import { useI18n } from '@/lib/i18n';

export default function HomePage() {
  const { goals, loadGoals, deleteGoal } = useGoalStore();
  const { t } = useI18n();

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleDelete = async (id: string) => {
    if (confirm(t('home.confirmDelete'))) {
      await deleteGoal(id);
    }
  };

  const topLevelGoals = goals.filter((g) => g.parentStepId === null);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-12">
        {/* Hero section */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Target className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">{t('home.title')}</h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">{t('home.subtitle')}</p>
          <div className="mt-6">
            <CreateGoalDialog />
          </div>
        </div>

        {/* Recent goals - minimal list */}
        {topLevelGoals.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">最近的目标</h2>
            <div className="space-y-2">
              {topLevelGoals.map((goal) => (
                <div key={goal.id} className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/50 transition-colors">
                  <Link href={`/goal/${goal.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{goal.title || goal.goalText}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t(`states.${goal.currentState}`)}
                    </p>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive shrink-0 ml-2"
                    onClick={() => handleDelete(goal.id)}
                  >
                    删除
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
