import { useState, useCallback, useRef, useEffect } from 'react';
import type { DemoScript, DemoQuestion } from './types';
import type { GoalState } from '@/lib/types';

export type DemoPhase =
  | 'IDLE'
  | 'TYPING_GOAL'
  | 'SUBMITTING_GOAL'
  | 'AI_CLARIFY'
  | 'SHOWING_QUESTIONS'
  | 'FILLING_ANSWERS'
  | 'SUBMITTING_ANSWERS'
  | 'AI_REVIEW'
  | 'SHOWING_REVIEW'
  | 'CONFIRMING_GOAL'
  | 'AI_FEASIBILITY'
  | 'SHOWING_FEASIBILITY'
  | 'CONFIRMING_FEASIBILITY'
  | 'AI_STEPS'
  | 'SHOWING_STEPS'
  | 'COMPLETED';

interface DemoState {
  phase: DemoPhase;
  goalState: GoalState;
  displayedGoalText: string;
  fullGoalText: string;
  showGoalInput: boolean;
  showGoalTextBanner: boolean;
  clarificationRound: number;
  visibleQuestions: DemoQuestion[];
  filledAnswers: Record<number, string>;
  showClarifyPanel: boolean;
  showReviewPanel: boolean;
  showFeasibilityPanel: boolean;
  showStepsPanel: boolean;
  aiThinking: boolean;
}

const INITIAL_STATE: DemoState = {
  phase: 'IDLE',
  goalState: 'VAGUE_GOAL',
  displayedGoalText: '',
  fullGoalText: '',
  showGoalInput: true,
  showGoalTextBanner: false,
  clarificationRound: 0,
  visibleQuestions: [],
  filledAnswers: {},
  showClarifyPanel: false,
  showReviewPanel: false,
  showFeasibilityPanel: false,
  showStepsPanel: false,
  aiThinking: false,
};

const AI_DELAY = 1500;
const TYPING_SPEED = 35;
const ANSWER_FILL_DELAY = 600;
const PHASE_GAP = 800;

export function useDemoPlayer(script: DemoScript) {
  const [state, setState] = useState<DemoState>(INITIAL_STATE);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const abortRef = useRef(false);
  const runningRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const sleep = useCallback((ms: number) => {
    return new Promise<void>((resolve, reject) => {
      const check = () => {
        if (abortRef.current) {
          reject(new Error('aborted'));
          return;
        }
        if (pausedRef.current) {
          setTimeout(check, 100);
          return;
        }
        resolve();
      };
      setTimeout(check, ms);
    });
  }, []);

  const update = useCallback((partial: Partial<DemoState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const runDemo = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    abortRef.current = false;

    try {
      // Phase 1: Type goal text
      update({ phase: 'TYPING_GOAL', goalState: 'VAGUE_GOAL', showGoalInput: true });

      const goalChars = script.initialGoalText.split('');
      for (let i = 0; i <= goalChars.length; i++) {
        if (abortRef.current) return;
        update({ displayedGoalText: goalChars.slice(0, i).join('') });
        await sleep(TYPING_SPEED);
      }
      update({ fullGoalText: script.initialGoalText });

      await sleep(PHASE_GAP);

      // Submit goal
      update({ phase: 'SUBMITTING_GOAL', aiThinking: true });
      await sleep(AI_DELAY);

      // Phase 2: Clarification (if rounds exist)
      if (script.clarificationRounds.length > 0) {
        update({
          phase: 'AI_CLARIFY',
          goalState: 'CLARIFYING_GOAL',
          showGoalInput: false,
          showGoalTextBanner: true,
          showClarifyPanel: true,
          aiThinking: false,
        });

        for (let roundIdx = 0; roundIdx < script.clarificationRounds.length; roundIdx++) {
          if (abortRef.current) return;
          const round = script.clarificationRounds[roundIdx];

          // Show questions one by one
          update({ phase: 'SHOWING_QUESTIONS', clarificationRound: roundIdx, visibleQuestions: [], filledAnswers: {} });
          for (let qi = 0; qi < round.questions.length; qi++) {
            if (abortRef.current) return;
            await sleep(300);
            update({ visibleQuestions: round.questions.slice(0, qi + 1) });
          }

          await sleep(PHASE_GAP);

          // Fill answers one by one
          update({ phase: 'FILLING_ANSWERS' });
          for (let ai = 0; ai < round.questions.length; ai++) {
            if (abortRef.current) return;
            await sleep(ANSWER_FILL_DELAY);
            setState((prev) => ({
              ...prev,
              filledAnswers: { ...prev.filledAnswers, [ai]: round.questions[ai].answer },
            }));
          }

          await sleep(PHASE_GAP);

          // Submit answers
          update({ phase: 'SUBMITTING_ANSWERS', aiThinking: true });
          await sleep(AI_DELAY);
          update({ aiThinking: false });
        }

        // Goal is now clear -> Review
        update({
          phase: 'AI_REVIEW',
          goalState: 'GOAL_REVIEW',
          showReviewPanel: true,
          fullGoalText: script.refinedGoalText,
          displayedGoalText: script.refinedGoalText,
        });

        await sleep(PHASE_GAP);

        // Show review
        update({ phase: 'SHOWING_REVIEW' });
        await sleep(PHASE_GAP * 2);

        // Confirm goal
        update({ phase: 'CONFIRMING_GOAL', aiThinking: true });
        await sleep(AI_DELAY);
      } else {
        // No clarification - direct path
        update({
          showGoalInput: false,
          showGoalTextBanner: true,
          aiThinking: false,
          goalState: 'GOAL_REVIEW',
          showReviewPanel: true,
          phase: 'SHOWING_REVIEW',
          fullGoalText: script.refinedGoalText,
          displayedGoalText: script.refinedGoalText,
        });
        await sleep(PHASE_GAP * 2);
        update({ phase: 'CONFIRMING_GOAL', aiThinking: true });
        await sleep(AI_DELAY);
      }

      // Phase 3: Feasibility
      if (script.feasibility) {
        update({
          phase: 'AI_FEASIBILITY',
          goalState: 'FEASIBILITY_CHECK',
          showFeasibilityPanel: true,
          aiThinking: true,
        });
        await sleep(AI_DELAY);

        update({ phase: 'SHOWING_FEASIBILITY', aiThinking: false });
        await sleep(PHASE_GAP * 3);

        update({ phase: 'CONFIRMING_FEASIBILITY', aiThinking: true, goalState: 'GOAL_CONFIRMED' });
        await sleep(AI_DELAY);
      }

      // Phase 4: Steps
      update({
        phase: 'AI_STEPS',
        goalState: 'GENERATING_STEPS',
        showStepsPanel: true,
        aiThinking: true,
      });
      await sleep(AI_DELAY);

      update({
        phase: 'SHOWING_STEPS',
        goalState: 'STEPS_STABLE',
        aiThinking: false,
      });
      await sleep(PHASE_GAP * 2);

      // Done
      update({
        phase: 'COMPLETED',
        goalState: 'COMPLETED',
      });
    } catch {
      // aborted
    } finally {
      runningRef.current = false;
    }
  }, [script, sleep, update]);

  const start = useCallback(() => {
    setState(INITIAL_STATE);
    setPaused(false);
    runDemo();
  }, [runDemo]);

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

  const stop = useCallback(() => {
    abortRef.current = true;
    runningRef.current = false;
    setState(INITIAL_STATE);
    setPaused(false);
  }, []);

  return {
    state,
    paused,
    start,
    togglePause,
    stop,
    isRunning: runningRef.current || state.phase !== 'IDLE',
  };
}
