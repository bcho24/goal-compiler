import type { GoalState } from '@/lib/types';

type Transition = {
  from: GoalState;
  to: GoalState;
  trigger: string;
};

const transitions: Transition[] = [
  // V2.1 main flow
  { from: 'VAGUE_GOAL', to: 'AI_UNDERSTANDING', trigger: 'SUBMIT_GOAL' },
  { from: 'AI_UNDERSTANDING', to: 'GOAL_CLARIFYING', trigger: 'UNDERSTANDING_READY' },
  { from: 'GOAL_CLARIFYING', to: 'GOAL_CLARIFYING', trigger: 'UPDATE_UNDERSTANDING' },
  { from: 'GOAL_CLARIFYING', to: 'FEASIBILITY_CHECK', trigger: 'CONFIRM_GOAL' },
  { from: 'FEASIBILITY_CHECK', to: 'GOAL_CONFIRMED', trigger: 'CONFIRM_GOAL' },
  { from: 'GOAL_CONFIRMED', to: 'GENERATING_STEPS', trigger: 'GENERATE_STEPS' },
  { from: 'GENERATING_STEPS', to: 'CLARIFYING_STEPS', trigger: 'STEPS_NEED_CLARIFY' },
  { from: 'GENERATING_STEPS', to: 'STEPS_STABLE', trigger: 'STEPS_READY' },
  { from: 'CLARIFYING_STEPS', to: 'CLARIFYING_STEPS', trigger: 'CONTINUE_CLARIFY_STEPS' },
  { from: 'CLARIFYING_STEPS', to: 'GENERATING_STEPS', trigger: 'REGENERATE_STEPS' },
  { from: 'STEPS_STABLE', to: 'COMPLETED', trigger: 'COMPLETE' },
  { from: 'STEPS_STABLE', to: 'GENERATING_STEPS', trigger: 'REGENERATE_STEPS' },
  { from: 'COMPLETED', to: 'STEPS_STABLE', trigger: 'RESUME_EDIT' },

  // V1 legacy transitions (for backward compatibility with existing DB records)
  { from: 'VAGUE_GOAL', to: 'CLARIFYING_GOAL', trigger: 'SUBMIT_GOAL_LEGACY' },
  { from: 'VAGUE_GOAL', to: 'GENERATING_STEPS', trigger: 'SIMPLE_GOAL' },
  { from: 'CLARIFYING_GOAL', to: 'CLARIFYING_GOAL', trigger: 'CONTINUE_CLARIFY' },
  { from: 'CLARIFYING_GOAL', to: 'GOAL_CLEAR', trigger: 'GOAL_IS_CLEAR' },
  { from: 'GOAL_CLEAR', to: 'GOAL_REVIEW', trigger: 'SHOW_REVIEW' },
  { from: 'GOAL_REVIEW', to: 'ADJUSTING_GOAL', trigger: 'SUBMIT_ADJUSTMENT' },
  { from: 'ADJUSTING_GOAL', to: 'ADJUSTING_GOAL', trigger: 'CONTINUE_ADJUST' },
  { from: 'ADJUSTING_GOAL', to: 'GOAL_REVIEW', trigger: 'GOAL_UPDATED' },
  { from: 'GOAL_REVIEW', to: 'FEASIBILITY_CHECK', trigger: 'CONFIRM_GOAL_LEGACY' },
  // Allow legacy states to reach feasibility check
  { from: 'CLARIFYING_GOAL', to: 'FEASIBILITY_CHECK', trigger: 'CONFIRM_GOAL' },
  { from: 'GOAL_CLEAR', to: 'FEASIBILITY_CHECK', trigger: 'CONFIRM_GOAL' },
  { from: 'GOAL_REVIEW', to: 'FEASIBILITY_CHECK', trigger: 'CONFIRM_GOAL' },
  { from: 'ADJUSTING_GOAL', to: 'FEASIBILITY_CHECK', trigger: 'CONFIRM_GOAL' },
];

export function canTransition(from: GoalState, to: GoalState): boolean {
  return transitions.some((t) => t.from === from && t.to === to);
}

export function getValidTransitions(from: GoalState): { to: GoalState; trigger: string }[] {
  return transitions.filter((t) => t.from === from).map((t) => ({ to: t.to, trigger: t.trigger }));
}

export function getPhaseNumber(state: GoalState): number {
  switch (state) {
    case 'VAGUE_GOAL':
      return 1;
    case 'AI_UNDERSTANDING':
    case 'GOAL_CLARIFYING':
    // V1 legacy
    case 'CLARIFYING_GOAL':
    case 'GOAL_CLEAR':
    case 'GOAL_REVIEW':
    case 'ADJUSTING_GOAL':
      return 2;
    case 'FEASIBILITY_CHECK':
    case 'GOAL_CONFIRMED':
      return 3;
    case 'GENERATING_STEPS':
    case 'CLARIFYING_STEPS':
    case 'STEPS_STABLE':
      return 4;
    case 'COMPLETED':
      return 5;
  }
}

export function isPhaseComplete(state: GoalState, phase: number): boolean {
  return getPhaseNumber(state) > phase;
}

export function isPhaseActive(state: GoalState, phase: number): boolean {
  return getPhaseNumber(state) === phase;
}
