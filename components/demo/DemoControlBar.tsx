'use client';

import { Play, Pause, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { DemoPhase } from '@/lib/demo/useDemoPlayer';

interface DemoControlBarProps {
  phase: DemoPhase;
  paused: boolean;
  onTogglePause: () => void;
  onStop: () => void;
}

const PHASE_PROGRESS: Record<DemoPhase, number> = {
  IDLE: 0,
  TYPING_GOAL: 5,
  SUBMITTING_GOAL: 10,
  AI_CLARIFY: 15,
  SHOWING_QUESTIONS: 25,
  FILLING_ANSWERS: 35,
  SUBMITTING_ANSWERS: 40,
  AI_REVIEW: 45,
  SHOWING_REVIEW: 55,
  CONFIRMING_GOAL: 60,
  AI_FEASIBILITY: 65,
  SHOWING_FEASIBILITY: 75,
  CONFIRMING_FEASIBILITY: 80,
  AI_STEPS: 85,
  SHOWING_STEPS: 95,
  COMPLETED: 100,
};

export function DemoControlBar({ phase, paused, onTogglePause, onStop }: DemoControlBarProps) {
  const { t } = useI18n();
  const progress = PHASE_PROGRESS[phase];
  const isComplete = phase === 'COMPLETED';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mx-auto flex h-12 max-w-4xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-primary">{t('demo.title')}</span>
          {isComplete && (
            <span className="text-xs text-muted-foreground">{t('demo.completed')}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isComplete && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onTogglePause}>
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onStop}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
