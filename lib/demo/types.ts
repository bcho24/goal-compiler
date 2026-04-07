import type { GoalExport } from '@/lib/export';
import type { QuestionType, FeasibilityLevel } from '@/lib/types';

export interface DemoQuestion {
  question: string;
  type: QuestionType;
  options?: string[];
  answer: string;
}

export interface DemoScript {
  initialGoalText: string;
  refinedGoalText: string;
  clarificationRounds: {
    questions: DemoQuestion[];
  }[];
  feasibility?: {
    summary: string;
    level: FeasibilityLevel;
    assumptions: string[];
    risks: string[];
  };
  plan: {
    groups: GoalExport['plan']['groups'];
    steps: GoalExport['plan']['steps'];
  };
}

export function convertExportToDemoScript(
  exportJson: GoalExport,
  initialGoalText?: string,
): DemoScript {
  const questions: DemoQuestion[] = exportJson.context.clarifications.map((c) => ({
    question: c.question,
    type: 'text' as QuestionType,
    answer: c.answer,
  }));

  return {
    initialGoalText: initialGoalText ?? exportJson.goal.text,
    refinedGoalText: exportJson.goal.text,
    clarificationRounds: questions.length > 0 ? [{ questions }] : [],
    feasibility: exportJson.context.feasibility
      ? {
          summary: exportJson.context.feasibility.summary,
          level: exportJson.context.feasibility.level as FeasibilityLevel,
          assumptions: exportJson.context.feasibility.assumptions,
          risks: exportJson.context.feasibility.risks,
        }
      : undefined,
    plan: exportJson.plan,
  };
}
