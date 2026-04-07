'use client';

import { useEffect, useState } from 'react';
import { Target, Play } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { GoalCard } from '@/components/goal/GoalCard';
import { CreateGoalDialog } from '@/components/goal/CreateGoalDialog';
import { useGoalStore } from '@/lib/store/goalStore';
import { useI18n } from '@/lib/i18n';
import { db } from '@/lib/db';

export default function HomePage() {
  const { goals, loadGoals, deleteGoal } = useGoalStore();
  const [stepCounts, setStepCounts] = useState<Record<string, number>>({});
  const { t } = useI18n();

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  useEffect(() => {
    async function fetchStepCounts() {
      const counts: Record<string, number> = {};
      for (const goal of goals) {
        counts[goal.id] = await db.steps.where('goalId').equals(goal.id).count();
      }
      setStepCounts(counts);
    }
    if (goals.length > 0) fetchStepCounts();
  }, [goals]);

  const handleDelete = async (id: string) => {
    if (confirm(t('home.confirmDelete'))) {
      await deleteGoal(id);
    }
  };

  const topLevelGoals = goals.filter((g) => g.parentStepId === null);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{t('home.title')}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t('home.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/demo">
              <Button variant="outline" className="gap-2">
                <Play className="h-4 w-4" />
                {t('home.tryDemo')}
              </Button>
            </Link>
            <CreateGoalDialog />
          </div>
        </div>

        {topLevelGoals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Target className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium mb-2">{t('home.noGoals')}</h2>
            <p className="text-muted-foreground text-sm max-w-md">{t('home.noGoalsHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topLevelGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                stepCount={stepCounts[goal.id]}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
