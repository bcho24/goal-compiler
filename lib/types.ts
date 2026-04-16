export type GoalState =
  | 'VAGUE_GOAL'
  | 'AI_UNDERSTANDING'
  | 'GOAL_CLARIFYING'
  | 'FEASIBILITY_CHECK'
  | 'GOAL_CONFIRMED'
  | 'GENERATING_STEPS'
  | 'CLARIFYING_STEPS'
  | 'STEPS_STABLE'
  | 'COMPLETED'
  // V1 legacy states (kept for DB compatibility, no longer used in V2.1 flow)
  | 'CLARIFYING_GOAL'
  | 'GOAL_CLEAR'
  | 'GOAL_REVIEW'
  | 'ADJUSTING_GOAL';

export type StepStatus = 'pending' | 'in_progress' | 'completed';

export type StepType = 'research' | 'decision' | 'action' | 'creation';

export type AIProvider = string;

export type CompatType = 'openai' | 'anthropic';

export type QuestionType = 'text' | 'select' | 'multi_select';

export type FeasibilityLevel = 'high' | 'medium' | 'low';

export interface Goal {
  id: string;
  parentStepId: string | null;
  title: string;
  goalText: string;
  currentState: GoalState;
  version: number;
  aiUnderstanding: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ClarifyQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
  answer?: string;
}

export interface Clarification {
  id: string;
  goalId: string;
  round: number;
  questions: ClarifyQuestion[];
  status: 'pending' | 'answered';
}

export interface Feasibility {
  id: string;
  goalId: string;
  summary: string;
  level: FeasibilityLevel;
  assumptions: string[];
  risks: string[];
  userConfirmed: boolean;
}

export interface GoalAdjustment {
  id: string;
  goalId: string;
  round: number;
  userRequest: string;
  questions: ClarifyQuestion[];
  status: 'clarifying' | 'applied';
}

export interface StepGroup {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  order: number;
  blocked_by: string[];
}

export interface Step {
  id: string;
  goalId: string;
  order: number;
  title: string;
  description: string;
  childGoalId: string | null;
  status: StepStatus;
  type: StepType;
  executable: boolean;
  blocked_by: string[];
  reason_if_not_executable?: string;
  tool_hint?: string;
  group?: string;
  isComplexSubGoal?: boolean;
}

export interface AncestorContext {
  goalText: string;
  stepTitle: string;
  stepDescription: string;
}

export interface StepClarification {
  id: string;
  goalId: string;
  questions: ClarifyQuestion[];
  status: 'pending' | 'answered';
  /** Cumulative Q&A from prior step-planning clarify rounds (for regeneration prompt). */
  resolvedHistory?: { question: string; answer: string }[];
}

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseURL: string;
  compatType: CompatType;
}

export interface ProviderPreset {
  id: string;
  label: string;
  compatType: CompatType;
  defaultBaseURL: string;
  suggestedModels: { id: string; name: string }[];
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    compatType: 'openai',
    defaultBaseURL: 'https://api.openai.com/v1',
    suggestedModels: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'o3-mini', name: 'o3-mini' },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    compatType: 'anthropic',
    defaultBaseURL: 'https://api.anthropic.com',
    suggestedModels: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    ],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    compatType: 'openai',
    defaultBaseURL: 'https://api.deepseek.com/v1',
    suggestedModels: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
    ],
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    compatType: 'anthropic',
    defaultBaseURL: 'https://api.minimaxi.com/anthropic',
    suggestedModels: [
      { id: 'MiniMax-M1', name: 'MiniMax-M1' },
      { id: 'MiniMax-Text-01', name: 'MiniMax-Text-01' },
    ],
  },
  {
    id: 'custom',
    label: '自定义 / Custom',
    compatType: 'openai',
    defaultBaseURL: '',
    suggestedModels: [],
  },
];
