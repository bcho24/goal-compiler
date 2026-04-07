'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { db } from '@/lib/db';
import type { Goal, Step } from '@/lib/types';

interface BreadcrumbItem {
  goalId: string;
  label: string;
}

interface GoalBreadcrumbProps {
  goalId: string;
}

export function GoalBreadcrumb({ goalId }: GoalBreadcrumbProps) {
  const [crumbs, setCrumbs] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    buildBreadcrumb(goalId).then(setCrumbs);
  }, [goalId]);

  if (crumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4 overflow-x-auto">
      <Link href="/" className="hover:text-foreground transition-colors shrink-0">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb, i) => (
        <div key={crumb.goalId} className="flex items-center gap-1 shrink-0">
          <ChevronRight className="h-3 w-3" />
          {i === crumbs.length - 1 ? (
            <span className="font-medium text-foreground truncate max-w-[200px]">{crumb.label}</span>
          ) : (
            <Link
              href={`/goal/${crumb.goalId}`}
              className="hover:text-foreground transition-colors truncate max-w-[200px]"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

async function buildBreadcrumb(goalId: string): Promise<BreadcrumbItem[]> {
  const path: BreadcrumbItem[] = [];
  let currentGoalId: string | null = goalId;

  while (currentGoalId) {
    const goal: Goal | undefined = await db.goals.get(currentGoalId);
    if (!goal) break;

    path.unshift({ goalId: goal.id, label: goal.title });

    if (goal.parentStepId) {
      const parentStep: Step | undefined = await db.steps.get(goal.parentStepId);
      if (parentStep) {
        currentGoalId = parentStep.goalId;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return path;
}
