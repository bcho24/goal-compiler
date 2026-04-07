'use client';

import Link from 'next/link';
import { ChevronRight, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { Goal } from '@/lib/types';

function getStateBadgeVariant(state: Goal['currentState']): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (state) {
    case 'COMPLETED':
      return 'default';
    case 'STEPS_STABLE':
      return 'secondary';
    default:
      return 'outline';
  }
}

interface GoalCardProps {
  goal: Goal;
  stepCount?: number;
  onDelete: (id: string) => void;
}

export function GoalCard({ goal, stepCount, onDelete }: GoalCardProps) {
  const { t } = useI18n();
  const isCompleted = goal.currentState === 'COMPLETED';

  const timeAgo = (ts: number): string => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('common.justNow');
    if (mins < 60) return t('common.minutesAgo', { n: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('common.hoursAgo', { n: hours });
    const days = Math.floor(hours / 24);
    return t('common.daysAgo', { n: days });
  };

  return (
    <Card className="group transition-all hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-medium truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
              {goal.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={getStateBadgeVariant(goal.currentState)} className="text-xs">
              {t(`states.${goal.currentState}`)}
            </Badge>
            {stepCount !== undefined && stepCount > 0 && (
              <span>{t('common.nSteps', { n: stepCount })}</span>
            )}
            <span>·</span>
            <span>{timeAgo(goal.updatedAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(goal.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Link href={`/goal/${goal.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
