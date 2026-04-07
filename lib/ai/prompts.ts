import type { ClarifyQuestion, Feasibility } from '@/lib/types';

export function buildClarifyPrompt(goalText: string, existingQA: { question: string; answer: string }[]): string {
  const qaHistory = existingQA.length > 0
    ? `\n\nPrevious Q&A:\n${existingQA.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}`
    : '';

  return `You are an expert goal clarification assistant. The user has a goal they want to achieve. Your job is to ask clarifying questions to make the goal specific and actionable.

User's goal: "${goalText}"${qaHistory}

Rules:
- If the goal is already specific and actionable (e.g. "buy groceries", "write a function to sort a list"), immediately set isGoalClear to true with a goalSummary and NO questions.
- Only ask questions when critical information is truly missing and would significantly change the plan.
- For simple goals, ask 0 questions. For moderately complex goals, ask 1-2. For genuinely complex/ambiguous goals, ask 2-4 max.
- Each question should target a specific ambiguity.
- Provide options when helpful, but always allow free text.
- Questions should be in the same language as the user's goal.

Respond in this exact JSON format:
{
  "isGoalClear": boolean,
  "goalSummary": "string (only if isGoalClear is true - a refined, clear version of the goal)",
  "questions": [
    {
      "id": "q1",
      "question": "string",
      "type": "text" | "select" | "multi_select",
      "options": ["option1", "option2"] // required for select and multi_select types
    }
  ]
}

Question type guide:
- "text": open-ended, free-form answer
- "select": exactly ONE option applies (e.g. preferred programming language, target platform)
- "multi_select": MULTIPLE options can apply simultaneously (e.g. which features to include, which platforms to support, which skills to develop)

If the goal is already clear enough, set isGoalClear to true and return an empty questions array with a goalSummary.`;
}

export function buildFeasibilityPrompt(goalText: string, clarifications: { question: string; answer: string }[]): string {
  const qaText = clarifications.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n');

  return `You are an expert feasibility analyst. Evaluate whether the following goal is feasible and identify key assumptions and risks.

Goal: "${goalText}"

Clarification details:
${qaText}

Respond in this exact JSON format:
{
  "summary": "Brief feasibility assessment (2-3 sentences, in the same language as the goal)",
  "level": "high" | "medium" | "low",
  "assumptions": ["assumption1", "assumption2", ...],
  "risks": ["risk1", "risk2", ...]
}

Be realistic but constructive. Assumptions and risks should be in the same language as the goal.`;
}

export function buildStepsPrompt(
  goalText: string,
  clarifications: { question: string; answer: string }[],
  feasibility: Feasibility | null,
  parentContext?: { goalText: string; stepTitle: string; stepDescription: string }[] | null,
  adjustmentInstruction?: string | null,
  currentSteps?: { order: number; title: string; description: string }[] | null,
  stepClarifications?: { question: string; answer: string }[] | null,
): string {
  const qaText = clarifications.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n');

  let parentInfo = '';
  if (parentContext && parentContext.length > 0) {
    const hierarchyLines = parentContext.map((ctx, i) => {
      const levelLabel = i === 0 ? `[Level ${i + 1} - Root Goal]` : `[Level ${i + 1}]`;
      return `${levelLabel} Goal: "${ctx.goalText}"\n  → Step being broken down: "${ctx.stepTitle}" — ${ctx.stepDescription}`;
    });
    parentInfo = `\n\nThis is a nested sub-task. Full goal hierarchy:\n\n${hierarchyLines.join('\n\n')}\n\n[Current Goal - Level ${parentContext.length + 1}]: "${goalText}"\n\nGenerate steps specifically for the current goal, keeping parent context in mind.\n`;
  }

  const adjustmentInfo = adjustmentInstruction
    ? `\n\nThe user wants to adjust the current steps:\n${(currentSteps || []).map((s, i) => `${i + 1}. ${s.title}: ${s.description}`).join('\n')}\n\nAdjustment request: "${adjustmentInstruction}"\nRegenerate steps incorporating the changes while keeping unchanged parts intact.`
    : '';

  const stepQaText = stepClarifications && stepClarifications.length > 0
    ? `\n\nStep planning clarifications:\n${stepClarifications.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}`
    : '';

  return `You are an expert task planner. Generate structured steps to achieve the following goal.${parentInfo}

Goal: "${goalText}"

Clarification details:
${qaText}${stepQaText}
${feasibility ? `\nFeasibility: ${feasibility.summary}\nAssumptions: ${feasibility.assumptions.join(', ')}` : ''}${adjustmentInfo}

Rules:
- Generate as few or as many steps as needed based on complexity.
- Each step should be a logical, necessary milestone. Use the same language as the goal.
- If anything is uncertain, mark it with "[Assumption: ...]" in the description.

Step fields:
- "type": "research" | "decision" | "action" | "creation"
- "executable": true if an AI agent could fully execute this step; false if it requires human judgment.
- "blocked_by": array of step order numbers (integers) within the SAME group. Use [] if no intra-group dependency.
- "reason_if_not_executable": brief explanation when executable is false.
- "tool_hint": suggested tool when executable is true (e.g. "web_search", "code_generation").

Grouping:
- For simple goals (2-4 linear steps), set "groups" to [] and omit "group" from steps.
- For complex goals (5+ steps with parallel tracks), organize steps into groups (phases/modules).
- Each group has "id" (snake_case), "title", optional "description", "order", and "blocked_by" (array of other group order numbers).
- Group "blocked_by" expresses inter-phase dependencies. Groups with no dependency can execute in parallel.
- Step "blocked_by" is ONLY for intra-group ordering. Do NOT reference steps from other groups.

CRITICAL: Output ONLY valid JSON.

{
  "groups": [
    { "id": "group_id", "title": "Group title", "description": "...", "order": 0, "blocked_by": [] }
  ],
  "steps": [
    { "order": 0, "title": "Step title", "description": "...", "type": "action", "executable": true, "blocked_by": [], "reason_if_not_executable": "", "tool_hint": "", "group": "group_id" }
  ]
}`;
}

export type ClarifyResponse = {
  isGoalClear: boolean;
  goalSummary?: string;
  questions: ClarifyQuestion[];
};

export type AdjustGoalResponse = {
  needsClarification: boolean;
  questions: ClarifyQuestion[];
  updatedGoalText?: string;
  goalSummary?: string;
};

export function buildAdjustGoalPrompt(
  goalText: string,
  clarifications: { question: string; answer: string }[],
  userRequest: string,
  adjustmentQA: { question: string; answer: string }[]
): string {
  const clarifyHistory = clarifications.length > 0
    ? `\n\nInitial clarification Q&A:\n${clarifications.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}`
    : '';

  const adjustHistory = adjustmentQA.length > 0
    ? `\n\nFollow-up Q&A during adjustment:\n${adjustmentQA.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}`
    : '';

  return `You are an expert goal refinement assistant. The user has a well-clarified goal and wants to adjust it based on their feedback.

Current goal: "${goalText}"${clarifyHistory}

User's adjustment request: "${userRequest}"${adjustHistory}

Your task:
- If you have enough information to update the goal, produce an updated version that incorporates the user's adjustment.
- If the adjustment request is ambiguous or requires more information, ask 1-3 targeted follow-up questions using the same option-based format.
- Keep the updated goal specific, actionable, and in the same language as the original goal.
- Preserve all parts of the original goal that the user did NOT ask to change.

Respond in this exact JSON format:
{
  "needsClarification": boolean,
  "questions": [
    {
      "id": "aq1",
      "question": "string",
      "type": "text" | "select" | "multi_select",
      "options": ["option1", "option2"] // required for select and multi_select types
    }
  ],
  "updatedGoalText": "string (only if needsClarification is false - the full updated goal)",
  "goalSummary": "string (only if needsClarification is false - a short title, max 50 chars)"
}

Question type guide:
- "text": open-ended, free-form answer
- "select": exactly ONE option applies
- "multi_select": MULTIPLE options can apply simultaneously

If needsClarification is false, set questions to [] and provide updatedGoalText and goalSummary.
If needsClarification is true, set questions to the follow-up questions and omit updatedGoalText and goalSummary.`;
}

export type FeasibilityResponse = Omit<Feasibility, 'id' | 'goalId' | 'userConfirmed'>;

export type StepsResponse = {
  groups: { id: string; title: string; description?: string; order: number; blocked_by: number[] }[];
  steps: {
    order: number;
    title: string;
    description: string;
    type: string;
    executable: boolean;
    blocked_by: number[];
    reason_if_not_executable?: string;
    tool_hint?: string;
    group?: string;
  }[];
};
