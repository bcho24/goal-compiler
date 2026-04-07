'use client';

import { Check, Circle, Loader2 } from 'lucide-react';
import type { GoalState } from '@/lib/types';
import { getPhaseNumber, isPhaseComplete, isPhaseActive } from '@/lib/stateMachine';
import { useI18n } from '@/lib/i18n';

const PHASE_KEYS = [
  { num: 1, key: 'phases.defineGoal' },
  { num: 2, key: 'phases.clarify' },
  { num: 3, key: 'phases.feasibility' },
  { num: 4, key: 'phases.steps' },
  { num: 5, key: 'phases.done' },
];

interface PhaseIndicatorProps {
  currentState: GoalState;
}

export function PhaseIndicator({ currentState }: PhaseIndicatorProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-1 overflow-x-auto p-1">
      {PHASE_KEYS.map((phase, i) => {
        const completed = isPhaseComplete(currentState, phase.num);
        const active = isPhaseActive(currentState, phase.num);
        const isLast = i === PHASE_KEYS.length - 1;

        return (
          <div key={phase.num} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  completed
                    ? 'bg-primary text-primary-foreground'
                    : active
                    ? 'bg-primary/10 text-primary ring-2 ring-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {completed ? (
                  <Check className="h-3.5 w-3.5" />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </div>
              <span
                className={`text-xs whitespace-nowrap ${
                  active ? 'font-medium text-primary' : completed ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {t(phase.key)}
              </span>
            </div>
            {!isLast && (
              <div className={`mx-2 h-px w-6 ${completed ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
