'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, MessageCircle, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { PhaseIndicator } from '@/components/goal/PhaseIndicator';
import { GoalInput } from '@/components/goal/GoalInput';
import { GoalUnderstandingPanel } from '@/components/goal/GoalUnderstandingPanel';
import { ClarifyQuestions } from '@/components/goal/ClarifyQuestions';
import { FeasibilityPanel } from '@/components/goal/FeasibilityPanel';
import { StepsPanel } from '@/components/goal/StepsPanel';
import { FreeChatPanel } from '@/components/goal/FreeChatPanel';
import { GoalBreadcrumb } from '@/components/goal/GoalBreadcrumb';
import { useGoalStore } from '@/lib/store/goalStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useChatStore } from '@/lib/store/chatStore';
import { useI18n } from '@/lib/i18n';
import { getPhaseNumber } from '@/lib/stateMachine';
import type { Feasibility, Step, StepGroup, StepClarification, AncestorContext, StepType, ClarifyQuestion } from '@/lib/types';
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
    steps,
    stepGroups,
    stepClarification,
    loading,
    loadGoal,
    updateGoalState,
    updateGoalText,
    updateAiUnderstanding,
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
  const { clearMessages } = useChatStore();

  const [childStepCounts, setChildStepCounts] = useState<Record<string, number>>({});
  const [ancestorChain, setAncestorChain] = useState<AncestorContext[]>([]);
  const [ancestorChainReady, setAncestorChainReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);

  useEffect(() => {
    initConfig();
  }, [initConfig]);

  useEffect(() => {
    loadGoal(id);
    clearMessages();
  }, [id, loadGoal, clearMessages]);

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

  // V2.1 main flow: submit goal -> AI_UNDERSTANDING -> GOAL_CLARIFYING
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
      await updateGoalState(currentGoal.id, 'AI_UNDERSTANDING');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(t('common.aiRequestFailed', { msg: message }));
    } finally {
      setSubmitting(false);
    }
  }, [currentGoal, isConfigured, router, updateGoalText, updateGoalState, t]);

  // Called by GoalUnderstandingPanel when AI generates understanding
  const handleUnderstandingGenerated = useCallback(async (understanding: string) => {
    if (!currentGoal) return;
    await updateAiUnderstanding(currentGoal.id, understanding);
    await updateGoalState(currentGoal.id, 'GOAL_CLARIFYING');
  }, [currentGoal, updateAiUnderstanding, updateGoalState]);

  const handleUnderstandingUpdated = useCallback(async (understanding: string) => {
    if (!currentGoal) return;
    await updateAiUnderstanding(currentGoal.id, understanding);
  }, [currentGoal, updateAiUnderstanding]);

  // Called when user confirms goal understanding -> proceed to feasibility
  const handleConfirmGoal = useCallback(async () => {
    if (!currentGoal) return;
    await updateGoalState(currentGoal.id, 'FEASIBILITY_CHECK');
  }, [currentGoal, updateGoalState]);

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
        <main className="mx-auto max-w-5xl px-4 py-8">
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
  const isClarifyingPhase = phase === 2;

  // Build QA list from clarifications for downstream use
  const allQA = clarifications
    .filter((c) => c.status === 'answered')
    .flatMap((c) => c.questions.filter((q) => q.answer).map((q) => ({ question: q.question, answer: q.answer! })));

  // Determine if understanding is confirmed (moved past GOAL_CLARIFYING)
  const isUnderstandingConfirmed = phase > 2;

  // Determine if goal text display should show (when past input phase)
  const showGoalTextBanner = phase > 1 && currentGoal.currentState !== 'VAGUE_GOAL' && currentGoal.currentState !== 'AI_UNDERSTANDING';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
        <GoalBreadcrumb goalId={currentGoal.id} />

        {/* Page header */}
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
          {/* Toggle right panel button - only shown during clarifying phase */}
          {isClarifyingPhase && (
            <Button
              variant={showRightPanel ? 'secondary' : 'outline'}
              size="sm"
              className="gap-1.5 text-xs shrink-0"
              onClick={() => setShowRightPanel(!showRightPanel)}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {showRightPanel ? '收起提问' : '自由提问'}
            </Button>
          )}
        </div>

        <PhaseIndicator currentState={currentGoal.currentState} />

        {/* Dual-panel layout */}
        <div className={`mt-6 flex gap-4 ${isClarifyingPhase && showRightPanel ? 'items-start' : ''}`}>
          {/* Left side: main flow */}
          <div className={`flex-1 min-w-0 space-y-4 ${isClarifyingPhase && showRightPanel ? 'max-w-[60%]' : 'w-full'}`}>
            {/* Phase 1: Goal input */}
            {currentGoal.currentState === 'VAGUE_GOAL' && (
              <GoalInput
                initialText={currentGoal.goalText}
                onSubmit={handleGoalSubmit}
                isModifying={currentGoal.version > 1}
                isLoading={submitting}
              />
            )}

            {/* Goal text banner (shown when past input phase, during clarifying) */}
            {showGoalTextBanner && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm">
                  <span className="font-medium text-muted-foreground">目标：</span>
                  {currentGoal.goalText}
                </p>
              </div>
            )}

            {/* Phase 2: AI Understanding + Clarify questions (V2.1 core) */}
            {(currentGoal.currentState === 'AI_UNDERSTANDING' || currentGoal.currentState === 'GOAL_CLARIFYING' || isUnderstandingConfirmed) && (
              <GoalUnderstandingPanel
                goalText={currentGoal.goalText}
                goalId={currentGoal.id}
                aiUnderstanding={currentGoal.aiUnderstanding}
                isActive={currentGoal.currentState === 'AI_UNDERSTANDING' || currentGoal.currentState === 'GOAL_CLARIFYING'}
                isConfirmed={isUnderstandingConfirmed}
                onUnderstandingGenerated={handleUnderstandingGenerated}
                onUnderstandingUpdated={handleUnderstandingUpdated}
                onConfirm={handleConfirmGoal}
              />
            )}

            {/* Clarify questions - shown in GOAL_CLARIFYING only */}
            {currentGoal.currentState === 'GOAL_CLARIFYING' && (
              <ClarifyQuestions
                goalText={currentGoal.goalText}
                aiUnderstanding={currentGoal.aiUnderstanding}
                isActive={true}
                onUnderstandingUpdated={handleUnderstandingUpdated}
                onSkip={handleConfirmGoal}
              />
            )}

            {/* Feasibility analysis */}
            {(feasibility != null || currentGoal.currentState === 'FEASIBILITY_CHECK' || currentGoal.currentState === 'GOAL_CONFIRMED') && (
              <FeasibilityPanel
                goalText={currentGoal.aiUnderstanding
                  ? (() => {
                      try {
                        const parsed = JSON.parse(currentGoal.aiUnderstanding);
                        return parsed.summary || currentGoal.goalText;
                      } catch {
                        return currentGoal.goalText;
                      }
                    })()
                  : currentGoal.goalText}
                clarifications={allQA}
                feasibility={feasibility}
                isActive={currentGoal.currentState === 'FEASIBILITY_CHECK'}
                onFeasibilityGenerated={handleFeasibilityGenerated}
                onConfirm={handleConfirmFeasibility}
              />
            )}

            {/* Steps */}
            {phase >= 4 && (
              <StepsPanel
                goalText={currentGoal.aiUnderstanding
                  ? (() => {
                      try {
                        const parsed = JSON.parse(currentGoal.aiUnderstanding);
                        return `${parsed.summary}\n\n${parsed.blocks?.map((b: { title: string; content: string }) => `${b.title}: ${b.content}`).join('\n') ?? ''}`;
                      } catch {
                        return currentGoal.goalText;
                      }
                    })()
                  : currentGoal.goalText}
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

            {/* Completed state */}
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

          {/* Right side: free chat panel (only during clarifying phase) */}
          {isClarifyingPhase && showRightPanel && (
            <div className="w-[40%] shrink-0 sticky top-6 h-[calc(100vh-120px)] rounded-lg border overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0">
                <div className="flex flex-col">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" />
                    自由提问区
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    辅助澄清，不影响左侧主流程
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 self-start"
                  onClick={() => setShowRightPanel(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex-1 min-h-0">
                <FreeChatPanel
                  goalText={currentGoal.goalText}
                  aiUnderstanding={currentGoal.aiUnderstanding}
                  isVisible={true}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
