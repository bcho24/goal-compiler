'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { PhaseIndicator } from '@/components/goal/PhaseIndicator';
import { GoalInput } from '@/components/goal/GoalInput';
import { ClarifyPanel } from '@/components/goal/ClarifyPanel';
import { GoalReviewPanel } from '@/components/goal/GoalReviewPanel';
import { FeasibilityPanel } from '@/components/goal/FeasibilityPanel';
import { StepsPanel } from '@/components/goal/StepsPanel';
import { GoalBreadcrumb } from '@/components/goal/GoalBreadcrumb';
import { useGoalStore } from '@/lib/store/goalStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useI18n } from '@/lib/i18n';
import { getPhaseNumber } from '@/lib/stateMachine';
import type { ClarifyQuestion, Step, StepGroup, Feasibility, GoalAdjustment, AncestorContext, StepType } from '@/lib/types';
import { db } from '@/lib/db';
import { toast } from 'sonner';

export default function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useI18n();

  const {
    currentGoal,
    clarifications,
    feasibility,
    goalAdjustments,
    steps,
    stepGroups,
    stepClarification,
    loading,
    loadGoal,
    updateGoalState,
    updateGoalText,
    addClarification,
    updateClarification,
    setFeasibility,
    confirmFeasibility,
    addGoalAdjustment,
    updateGoalAdjustment,
    setSteps,
    updateStep,
    deleteStep,
    toggleStepStatus,
    updateStepGroup,
    deleteStepGroup,
    setStepClarification,
    updateStepClarification,
    createGoal,
  } = useGoalStore();

  const { initConfig, isConfigured } = useSettingsStore();

  const [childStepCounts, setChildStepCounts] = useState<Record<string, number>>({});
  const [ancestorChain, setAncestorChain] = useState<AncestorContext[]>([]);
  const [ancestorChainReady, setAncestorChainReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    initConfig();
  }, [initConfig]);

  useEffect(() => {
    loadGoal(id);
  }, [id, loadGoal]);

  useEffect(() => {
    async function fetchChildCounts() {
      const counts: Record<string, number> = {};
      for (const step of steps) {
        if (step.childGoalId) {
          counts[step.childGoalId] = await db.steps.where('goalId').equals(step.childGoalId).count();
        }
      }
      setChildStepCounts(counts);
    }
    if (steps.some((s) => s.childGoalId)) fetchChildCounts();
  }, [steps]);

  useEffect(() => {
    if (!currentGoal?.parentStepId) {
      setAncestorChain([]);
      setAncestorChainReady(true);
      return;
    }
    setAncestorChainReady(false);
    async function buildAncestorChain() {
      const chain: AncestorContext[] = [];
      let parentStepId = currentGoal!.parentStepId;
      while (parentStepId) {
        const step = await db.steps.get(parentStepId);
        if (!step) break;
        const parentGoal = await db.goals.get(step.goalId);
        if (!parentGoal) break;
        chain.unshift({
          goalText: parentGoal.goalText,
          stepTitle: step.title,
          stepDescription: step.description,
        });
        parentStepId = parentGoal.parentStepId;
      }
      setAncestorChain(chain);
      setAncestorChainReady(true);
    }
    buildAncestorChain();
  }, [currentGoal?.parentStepId]);

  const handleGoalSubmit = useCallback(async (text: string) => {
    if (!currentGoal) return;
    if (!isConfigured()) {
      toast.error(t('common.apiKeyNotConfigured'));
      router.push('/settings');
      return;
    }
    setSubmitting(true);
    try {
      await updateGoalText(currentGoal.id, text);
      const config = useSettingsStore.getState().config;
      const res = await fetch('/api/ai/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalText: text,
          existingQA: [],
          compatType: config.compatType,
          baseURL: config.baseURL,
          apiKey: config.apiKey,
          model: config.model,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }
      const data = await res.json();
      if (data.isGoalClear) {
        const summary = data.goalSummary || text;
        await updateGoalText(currentGoal.id, summary);
        await updateGoalState(currentGoal.id, 'GENERATING_STEPS');
      } else {
        await addClarification(currentGoal.id, {
          goalId: currentGoal.id,
          round: 1,
          questions: data.questions,
          status: 'pending',
        });
        await updateGoalState(currentGoal.id, 'CLARIFYING_GOAL');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(t('common.aiRequestFailed', { msg: message }));
    } finally {
      setSubmitting(false);
    }
  }, [currentGoal, isConfigured, router, updateGoalText, updateGoalState, addClarification, t]);

  const handleNewQuestions = useCallback(async (questions: ClarifyQuestion[]) => {
    if (!currentGoal) return;
    const round = clarifications.length + 1;
    await addClarification(currentGoal.id, {
      goalId: currentGoal.id,
      round,
      questions,
      status: 'pending',
    });
  }, [currentGoal, clarifications, addClarification]);

  const handleSubmitAnswers = useCallback(async (answers: Record<string, string>) => {
    if (!currentGoal) return;
    const pending = clarifications.find((c) => c.status === 'pending');
    if (!pending) return;
    const updated = pending.questions.map((q) => ({ ...q, answer: answers[q.id] || '' }));
    await updateClarification(pending.id, { questions: updated, status: 'answered' });
  }, [currentGoal, clarifications, updateClarification]);

  const handleEditRoundAnswers = useCallback(async (roundId: string, answers: Record<string, string>) => {
    const round = clarifications.find((c) => c.id === roundId);
    if (!round) return;
    const updated = round.questions.map((q) => ({ ...q, answer: answers[q.id] || '' }));
    await updateClarification(roundId, { questions: updated });
  }, [clarifications, updateClarification]);

  const handleClarificationComplete = useCallback(async (summary: string) => {
    if (!currentGoal) return;
    await updateGoalText(currentGoal.id, summary);
    await updateGoalState(currentGoal.id, 'GOAL_CLEAR');
    setTimeout(async () => {
      await updateGoalState(currentGoal.id, 'GOAL_REVIEW');
    }, 300);
  }, [currentGoal, updateGoalText, updateGoalState]);

  const handleGoalReviewConfirm = useCallback(async () => {
    if (!currentGoal) return;
    await updateGoalState(currentGoal.id, 'FEASIBILITY_CHECK');
  }, [currentGoal, updateGoalState]);

  const handleAdjustStateStart = useCallback(async () => {
    if (!currentGoal) return;
    await updateGoalState(currentGoal.id, 'ADJUSTING_GOAL');
  }, [currentGoal, updateGoalState]);

  const handleGoalUpdated = useCallback(async (updatedText: string, _summary: string) => {
    if (!currentGoal) return;
    await updateGoalText(currentGoal.id, updatedText);
    await updateGoalState(currentGoal.id, 'GOAL_REVIEW');
  }, [currentGoal, updateGoalText, updateGoalState]);

  const handleAddAdjustment = useCallback(async (data: Omit<GoalAdjustment, 'id'>) => {
    if (!currentGoal) return { id: '', goalId: '', round: 0, userRequest: '', questions: [], status: 'clarifying' as const };
    return addGoalAdjustment({ ...data, goalId: currentGoal.id });
  }, [currentGoal, addGoalAdjustment]);

  const handleFeasibilityGenerated = useCallback(async (data: Omit<Feasibility, 'id' | 'goalId' | 'userConfirmed'>) => {
    if (!currentGoal) return;
    await setFeasibility({ goalId: currentGoal.id, ...data, userConfirmed: false });
  }, [currentGoal, setFeasibility]);

  const handleConfirmFeasibility = useCallback(async () => {
    if (!currentGoal || !feasibility) return;
    await confirmFeasibility(feasibility.id);
    await updateGoalState(currentGoal.id, 'GOAL_CONFIRMED');
    setTimeout(async () => {
      await updateGoalState(currentGoal.id, 'GENERATING_STEPS');
    }, 300);
  }, [currentGoal, feasibility, confirmFeasibility, updateGoalState]);

  const handleStepsGenerated = useCallback(async (
    stepsData: {
      order: number; title: string; description: string;
      type?: string; executable?: boolean; blocked_by?: number[];
      reason_if_not_executable?: string; tool_hint?: string; group?: string;
    }[],
    groups?: { id: string; title: string; description?: string; order: number; blocked_by?: number[] }[]
  ) => {
    if (!currentGoal) return;
    const mapped = stepsData.map((s) => ({
      ...s,
      type: (s.type ?? 'action') as StepType,
      executable: s.executable ?? false,
      blocked_by: (s.blocked_by ?? []).map(String),
      reason_if_not_executable: s.reason_if_not_executable,
      tool_hint: s.tool_hint,
      group: s.group,
    }));
    await setSteps(currentGoal.id, mapped, groups);
    await updateGoalState(currentGoal.id, 'STEPS_STABLE');
  }, [currentGoal, setSteps, updateGoalState]);

  const handleStepClarificationNeeded = useCallback(async (questions: ClarifyQuestion[]) => {
    if (!currentGoal) return;
    const resolvedHistory = stepClarification?.resolvedHistory ?? [];
    await setStepClarification({
      goalId: currentGoal.id,
      questions,
      status: 'pending',
      resolvedHistory,
    });
    await updateGoalState(currentGoal.id, 'CLARIFYING_STEPS');
  }, [currentGoal, stepClarification, setStepClarification, updateGoalState]);

  const handleStepClarificationAnswered = useCallback(async (answers: Record<string, string>) => {
    if (!currentGoal || !stepClarification) return;
    const updated = stepClarification.questions.map((q) => ({ ...q, answer: answers[q.id] || '' }));
    const roundPairs = stepClarification.questions.map((q) => ({
      question: q.question,
      answer: (answers[q.id] || '').trim(),
    }));
    const resolvedHistory = [...(stepClarification.resolvedHistory ?? []), ...roundPairs];
    await updateStepClarification(stepClarification.id, {
      questions: updated,
      status: 'answered',
      resolvedHistory,
    });
    await setSteps(currentGoal.id, []);
    await updateGoalState(currentGoal.id, 'GENERATING_STEPS');
  }, [currentGoal, stepClarification, updateStepClarification, updateGoalState, setSteps]);

  const handleToggleStep = useCallback(async (stepId: string) => {
    await toggleStepStatus(stepId);
  }, [toggleStepStatus]);

  const handleEditStep = useCallback(async (stepId: string, title: string, description: string) => {
    await updateStep(stepId, { title, description });
  }, [updateStep]);

  const handleDeleteStep = useCallback(async (stepId: string) => {
    await deleteStep(stepId);
  }, [deleteStep]);

  const handleEditGroup = useCallback(async (groupId: string, title: string, description?: string) => {
    await updateStepGroup(groupId, { title, description });
  }, [updateStepGroup]);

  const handleDeleteGroup = useCallback(async (groupId: string) => {
    await deleteStepGroup(groupId);
  }, [deleteStepGroup]);

  const handleDrillDown = useCallback(async (step: Step) => {
    if (!currentGoal) return;
    if (!isConfigured()) {
      toast.error(t('common.apiKeyNotConfigured'));
      router.push('/settings');
      return;
    }
    const childGoal = await createGoal(`${step.title}: ${step.description}`, step.id);
    await updateStep(step.id, { childGoalId: childGoal.id });
    router.push(`/goal/${childGoal.id}`);
  }, [currentGoal, isConfigured, router, createGoal, updateStep, t]);

  const handleViewChild = useCallback((childGoalId: string) => {
    router.push(`/goal/${childGoalId}`);
  }, [router]);

  const handleComplete = useCallback(async () => {
    if (!currentGoal) return;
    await updateGoalState(currentGoal.id, 'COMPLETED');
    toast.success(t('goalWorkspace.goalCompleted'));
  }, [currentGoal, updateGoalState, t]);

  const handleResume = useCallback(async () => {
    if (!currentGoal) return;
    await updateGoalState(currentGoal.id, 'STEPS_STABLE');
  }, [currentGoal, updateGoalState]);

  if (loading || !currentGoal) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-8 w-64 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </main>
      </div>
    );
  }

  const phase = getPhaseNumber(currentGoal.currentState);

  const allQA = clarifications
    .filter((c) => c.status === 'answered')
    .flatMap((c) => c.questions.filter((q) => q.answer).map((q) => ({ question: q.question, answer: q.answer! })));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <GoalBreadcrumb goalId={currentGoal.id} />

        <div className="flex items-center gap-3 mb-4">
          <Link href={currentGoal.parentStepId ? '#' : '/'}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold truncate">{currentGoal.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-xs">
                {t(`states.${currentGoal.currentState}`)}
              </Badge>
              <span className="text-xs text-muted-foreground">v{currentGoal.version}</span>
            </div>
          </div>
        </div>

        <PhaseIndicator currentState={currentGoal.currentState} />

        <div className="space-y-4 mt-6">
          {currentGoal.currentState === 'VAGUE_GOAL' && (
            <GoalInput
              initialText={currentGoal.goalText}
              onSubmit={handleGoalSubmit}
              isModifying={currentGoal.version > 1}
              isLoading={submitting}
            />
          )}

          {phase > 1 && currentGoal.currentState !== 'VAGUE_GOAL' && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm">
                <span className="font-medium text-muted-foreground">{t('goalWorkspace.goalLabel')}: </span>
                {currentGoal.goalText}
              </p>
            </div>
          )}

          {(currentGoal.currentState === 'CLARIFYING_GOAL' || clarifications.length > 0) && (
            <ClarifyPanel
              goalText={currentGoal.goalText}
              clarifications={clarifications}
              isActive={currentGoal.currentState === 'CLARIFYING_GOAL'}
              onSubmitAnswers={handleSubmitAnswers}
              onEditRoundAnswers={handleEditRoundAnswers}
              onClarificationComplete={handleClarificationComplete}
              goalId={currentGoal.id}
              onNewQuestions={handleNewQuestions}
            />
          )}

          {(currentGoal.currentState === 'GOAL_REVIEW' ||
            currentGoal.currentState === 'ADJUSTING_GOAL' ||
            goalAdjustments.length > 0 ||
            phase >= 3) && (
            <GoalReviewPanel
              goalText={currentGoal.goalText}
              clarifications={allQA}
              goalAdjustments={goalAdjustments}
              isActive={
                currentGoal.currentState === 'GOAL_REVIEW' ||
                currentGoal.currentState === 'ADJUSTING_GOAL'
              }
              currentState={currentGoal.currentState}
              onConfirm={handleGoalReviewConfirm}
              onAdjustStateStart={handleAdjustStateStart}
              onGoalUpdated={handleGoalUpdated}
              onAddAdjustment={handleAddAdjustment}
              onUpdateAdjustment={updateGoalAdjustment}
            />
          )}

          {(feasibility != null || currentGoal.currentState === 'FEASIBILITY_CHECK' || currentGoal.currentState === 'GOAL_CONFIRMED') && (
            <FeasibilityPanel
              goalText={currentGoal.goalText}
              clarifications={allQA}
              feasibility={feasibility}
              isActive={currentGoal.currentState === 'FEASIBILITY_CHECK'}
              onFeasibilityGenerated={handleFeasibilityGenerated}
              onConfirm={handleConfirmFeasibility}
            />
          )}

          {phase >= 4 && (
            <StepsPanel
              goalText={currentGoal.goalText}
              goalState={currentGoal.currentState}
              clarifications={allQA}
              stepPlanningResolvedQa={stepClarification?.resolvedHistory ?? []}
              feasibility={feasibility}
              steps={steps}
              stepGroups={stepGroups}
              parentContext={ancestorChain.length > 0 ? ancestorChain : null}
              parentContextReady={ancestorChainReady}
              stepClarificationQuestions={stepClarification?.questions ?? null}
              isActive={phase === 4}
              onStepsGenerated={handleStepsGenerated}
              onStepClarificationNeeded={handleStepClarificationNeeded}
              onStepClarificationAnswered={handleStepClarificationAnswered}
              onToggleStep={handleToggleStep}
              onEditStep={handleEditStep}
              onDeleteStep={handleDeleteStep}
              onDrillDown={handleDrillDown}
              onViewChild={handleViewChild}
              onEditGroup={handleEditGroup}
              onDeleteGroup={handleDeleteGroup}
              onComplete={handleComplete}
              childStepCounts={childStepCounts}
            />
          )}

          {currentGoal.currentState === 'COMPLETED' && (
            <div className="rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-4 text-center">
              <p className="font-medium text-green-700 dark:text-green-300 mb-2">
                🎉 {t('goalWorkspace.goalCompleted')}
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                {t('goalWorkspace.goalCompletedHint')}
              </p>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleResume}>
                <Play className="h-3.5 w-3.5" />
                {t('goalWorkspace.resumeEditing')}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
