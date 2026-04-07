'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { PhaseIndicator } from '@/components/goal/PhaseIndicator';
import { StepsPanel } from '@/components/goal/StepsPanel';
import { DemoGoalInput } from '@/components/demo/DemoGoalInput';
import { DemoClarifyPanel } from '@/components/demo/DemoClarifyPanel';
import { DemoReviewPanel } from '@/components/demo/DemoReviewPanel';
import { DemoFeasibilityPanel } from '@/components/demo/DemoFeasibilityPanel';
import { DemoControlBar } from '@/components/demo/DemoControlBar';
import { useDemoPlayer } from '@/lib/demo/useDemoPlayer';
import { PIANO_DEMO } from '@/lib/demo/sampleData';
import { useI18n } from '@/lib/i18n';
import { getPhaseNumber } from '@/lib/stateMachine';
import type { Step, StepGroup, StepType } from '@/lib/types';

function buildDemoSteps(script: typeof PIANO_DEMO): { steps: Step[]; stepGroups: StepGroup[] } {
  const goalId = 'demo';

  const groupRefToId = new Map<string, string>();
  const stepRefToId = new Map<string, string>();

  const stepGroups: StepGroup[] = script.plan.groups.map((g, i) => {
    const id = `demo-group-${i}`;
    groupRefToId.set(g.ref, id);
    return {
      id,
      goalId,
      title: g.title,
      description: g.description,
      order: i,
      blocked_by: [],
    };
  });

  // second pass for group blocked_by
  script.plan.groups.forEach((g, i) => {
    stepGroups[i].blocked_by = g.blocked_by
      .map((ref) => groupRefToId.get(ref))
      .filter((v): v is string => !!v);
  });

  // first pass: build id map
  script.plan.steps.forEach((s, i) => {
    stepRefToId.set(s.ref, `demo-step-${i}`);
  });

  const steps: Step[] = script.plan.steps.map((s, i) => ({
    id: stepRefToId.get(s.ref)!,
    goalId,
    order: i,
    title: s.title,
    description: s.description,
    childGoalId: null,
    status: 'pending' as const,
    type: (s.type ?? 'action') as StepType,
    executable: s.executable,
    blocked_by: s.blocked_by
      .map((ref) => stepRefToId.get(ref))
      .filter((v): v is string => !!v),
    reason_if_not_executable: s.reason_if_not_executable,
    tool_hint: s.tool_hint,
    group: s.group ? groupRefToId.get(s.group) : undefined,
  }));

  return { steps, stepGroups };
}

const noop = () => {};
const noopAsync = async () => {};

export default function DemoPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { state, paused, start, togglePause, stop } = useDemoPlayer(PIANO_DEMO);

  useEffect(() => {
    start();
  }, [start]);

  const handleStop = () => {
    stop();
    router.push('/');
  };

  const { steps, stepGroups } = useMemo(() => buildDemoSteps(PIANO_DEMO), []);

  const phase = getPhaseNumber(state.goalState);
  const showSteps = state.showStepsPanel && state.phase !== 'AI_STEPS';

  return (
    <div className="min-h-screen bg-background pb-16">
      <Header />

      {/* Demo mode banner */}
      <div className="border-b bg-primary/5">
        <div className="mx-auto max-w-3xl px-4 py-2 flex items-center justify-center gap-2">
          <Badge variant="outline" className="text-primary border-primary/30">
            {t('demo.title')}
          </Badge>
          <span className="text-xs text-muted-foreground">{t('demo.banner')}</span>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold truncate">
              {state.displayedGoalText || PIANO_DEMO.initialGoalText.slice(0, 50)}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-xs">
                {t(`states.${state.goalState}`)}
              </Badge>
            </div>
          </div>
        </div>

        <PhaseIndicator currentState={state.goalState} />

        <div className="space-y-4 mt-6 pointer-events-none select-none">
          {state.showGoalInput && (
            <DemoGoalInput
              displayedText={state.displayedGoalText}
              isSubmitting={state.phase === 'SUBMITTING_GOAL'}
            />
          )}

          {state.showGoalTextBanner && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm">
                <span className="font-medium text-muted-foreground">
                  {t('goalWorkspace.goalLabel')}:{' '}
                </span>
                {state.fullGoalText}
              </p>
            </div>
          )}

          {state.showClarifyPanel && (
            <DemoClarifyPanel
              questions={state.visibleQuestions}
              filledAnswers={state.filledAnswers}
              aiThinking={state.aiThinking && state.phase === 'AI_CLARIFY'}
              isSubmitting={state.phase === 'SUBMITTING_ANSWERS'}
            />
          )}

          {state.showReviewPanel && (
            <DemoReviewPanel
              goalText={state.fullGoalText}
              isConfirming={
                state.phase === 'CONFIRMING_GOAL' ||
                phase > 2
              }
            />
          )}

          {state.showFeasibilityPanel && (
            <DemoFeasibilityPanel
              feasibility={
                state.phase === 'AI_FEASIBILITY' ? null : PIANO_DEMO.feasibility ?? null
              }
              aiThinking={state.phase === 'AI_FEASIBILITY'}
              isConfirming={
                state.phase === 'CONFIRMING_FEASIBILITY' ||
                phase > 3
              }
            />
          )}

          {state.showStepsPanel && (
            showSteps ? (
              <StepsPanel
                goalText={PIANO_DEMO.refinedGoalText}
                goalState="STEPS_STABLE"
                clarifications={[]}
                stepPlanningResolvedQa={[]}
                feasibility={null}
                steps={steps}
                stepGroups={stepGroups}
                parentContext={null}
                parentContextReady
                stepClarificationQuestions={null}
                isActive={false}
                onStepsGenerated={noopAsync}
                onStepClarificationNeeded={noopAsync}
                onStepClarificationAnswered={noop}
                onToggleStep={noop}
                onEditStep={noop}
                onDeleteStep={noop}
                onDrillDown={noop}
                onViewChild={noop}
                onEditGroup={noop}
                onDeleteGroup={noop}
                onComplete={noop}
              />
            ) : (
              <div className="rounded-lg border bg-card p-8 flex items-center justify-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">{t('stepsPanel.generating')}</span>
              </div>
            )
          )}

          {state.phase === 'COMPLETED' && (
            <div className="rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-4 text-center">
              <p className="font-medium text-green-700 dark:text-green-300 mb-2">
                🎉 {t('demo.demoComplete')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('demo.demoCompleteHint')}
              </p>
            </div>
          )}
        </div>
      </main>

      <DemoControlBar
        phase={state.phase}
        paused={paused}
        onTogglePause={togglePause}
        onStop={handleStop}
      />
    </div>
  );
}
