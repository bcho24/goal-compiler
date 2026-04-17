import type { ClarifyQuestion, Feasibility } from '@/lib/types';

// Shared rules injected into every prompt
const GLOBAL_RULES = `Rules: respond in the same language as the user's goal. Output ONLY valid JSON — no markdown fences, no prose before or after.`;

const QUESTION_TYPE_GUIDE = `Question types: "text"=open answer, "select"=pick ONE option, "multi_select"=pick MULTIPLE options. Always include "options" for select/multi_select.`;

export function buildUnderstandPrompt(
  goalText: string,
  previousUnderstanding?: string | null,
  userNote?: string | null,
  latestRoundQA?: { question: string; answer: string }[]
): string {
  const context = previousUnderstanding
    ? `\n\nPrevious understanding (may be user-edited):\n${previousUnderstanding}`
    : '';
  const note = userNote ? `\n\nUser note: "${userNote}"` : '';
  const qaContext = latestRoundQA && latestRoundQA.length > 0
    ? `\n\nNew answers to incorporate:\n${latestRoundQA.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}`
    : '';

  return `Role: Goal analyst. ${GLOBAL_RULES}

Goal: "${goalText}"${context}${qaContext}${note}

Generate a structured understanding incorporating all context above. Keep it concise — the user will edit it.
- Write a 2-3 sentence summary first.
- Add blocks with a title and content. Suggested titles: Current Goal, Current Focus, Known Context, Key Constraints, Open Questions.
- "Open Questions" lists unclear/missing info briefly. If QA was provided, fold answers into relevant blocks and remove resolved items from Open Questions.
- Do NOT ask questions in this response.

{"summary":"...","blocks":[{"title":"...","content":"..."}]}`;
}

export function buildClarifyQuestionsPrompt(goalText: string, understanding: string, existingQA: { question: string; answer: string }[]): string {
  const qaHistory = existingQA.length > 0
    ? `\n\nAlready answered:\n${existingQA.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}`
    : '';

  return `Role: Goal clarification assistant. ${GLOBAL_RULES}

Goal: "${goalText}"

Understanding:\n${understanding}${qaHistory}

Identify the most critical ambiguities that MUST be resolved before generating a reliable plan. Ask at most 2-3 questions — fewer is better. Only ask about things that change the implementation path, solution choice, or cost/time/feasibility. Skip execution details that can be decided later.

${QUESTION_TYPE_GUIDE}

{"questions":[{"id":"q1","question":"...","type":"text|select|multi_select","options":["..."]}]}

If no critical ambiguities, return {"questions":[]}`;
}

export function buildClarifyPrompt(goalText: string, existingQA: { question: string; answer: string }[]): string {
  const qaHistory = existingQA.length > 0
    ? `\n\nPrevious Q&A:\n${existingQA.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}`
    : '';

  return `Role: Goal clarification assistant. ${GLOBAL_RULES}

Goal: "${goalText}"${qaHistory}

If the goal is already specific and actionable, set isGoalClear=true with a goalSummary and empty questions. Otherwise ask only the questions where missing info would significantly change the plan — 0 for simple goals, 1-2 for moderate, 2-4 max for complex.

${QUESTION_TYPE_GUIDE}

{"isGoalClear":boolean,"goalSummary":"(only if clear)","questions":[{"id":"q1","question":"...","type":"text|select|multi_select","options":["..."]}]}`;
}

export function buildFeasibilityPrompt(goalText: string, clarifications: { question: string; answer: string }[]): string {
  const qaText = clarifications.length > 0
    ? clarifications.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')
    : '(none)';

  return `Role: Feasibility analyst. ${GLOBAL_RULES}

Goal: "${goalText}"

Clarifications:\n${qaText}

Evaluate feasibility. Be realistic but constructive.

{"summary":"2-3 sentence assessment","level":"high|medium|low","assumptions":["..."],"risks":["..."]}`;
}

export function buildClarifyIteratePrompt(
  goalText: string,
  previousUnderstanding: string,
  latestRoundQA: { question: string; answer: string }[]
): string {
  const qaText = latestRoundQA.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n');

  return `Role: Goal analyst and clarification assistant. ${GLOBAL_RULES}

Goal: "${goalText}"

Current understanding:\n${previousUnderstanding}

User just answered:\n${qaText}

Do two things in one response:
1. Update the understanding to incorporate the new answers. Fold answers into relevant blocks; remove resolved Open Questions.
2. Decide if more clarification is needed. Only ask if there are remaining critical ambiguities that change the implementation path. At most 2 questions. If none remain, set isSufficient=true and nextQuestions=[].

${QUESTION_TYPE_GUIDE}

{"updatedUnderstanding":{"summary":"...","blocks":[{"title":"...","content":"..."}]},"isSufficient":boolean,"nextQuestions":[{"id":"q1","question":"...","type":"text|select|multi_select","options":["..."]}]}`;
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
  const qaText = clarifications.length > 0
    ? clarifications.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')
    : '(none)';

  let parentInfo = '';
  if (parentContext && parentContext.length > 0) {
    const hierarchyLines = parentContext.map((ctx, i) => {
      const label = i === 0 ? `[Level ${i + 1} - Root]` : `[Level ${i + 1}]`;
      return `${label} "${ctx.goalText}" → breaking down: "${ctx.stepTitle}" — ${ctx.stepDescription}`;
    });
    parentInfo = `\n\nNested sub-task. Hierarchy:\n${hierarchyLines.join('\n')}\n[Current - Level ${parentContext.length + 1}]: "${goalText}"\nGenerate steps for the current goal only, keeping parent context in mind.\n`;
  }

  const adjustmentInfo = adjustmentInstruction
    ? `\n\nAdjust existing steps:\n${(currentSteps || []).map((s, i) => `${i + 1}. ${s.title}: ${s.description}`).join('\n')}\nRequest: "${adjustmentInstruction}"\nRegenerate incorporating changes; keep unchanged parts intact.`
    : '';

  const stepQaText = stepClarifications && stepClarifications.length > 0
    ? `\n\nStep clarifications:\n${stepClarifications.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}`
    : '';

  return `Role: Task planner. ${GLOBAL_RULES}${parentInfo}

Goal: "${goalText}"

Clarifications:\n${qaText}${stepQaText}
${feasibility ? `Feasibility: ${feasibility.summary}\nAssumptions: ${feasibility.assumptions.join(', ')}` : ''}${adjustmentInfo}

SIMPLE goal (clear, bounded): 1-5 detailed executable steps, "groups":[].
COMPLEX goal (multi-phase): 3-7 high-level milestones; mark complex sub-goals with "isComplexSubGoal":true — do NOT expand them.
Mark uncertain items "[Assumption: ...]". Fewer solid steps > many uncertain ones.

Step fields (omit empty optionals): type("research"|"decision"|"action"|"creation"), executable(bool), blocked_by([order ints, intra-group only]), reason_if_not_executable, tool_hint, isComplexSubGoal.
Grouping: simple→"groups":[], no "group" on steps. Complex→groups with snake_case id, title, order, blocked_by(inter-group).

{"groups":[{"id":"g1","title":"...","order":0,"blocked_by":[]}],"steps":[{"order":0,"title":"...","description":"...","type":"action","executable":true,"blocked_by":[],"group":"g1"}]}`;
}

export function buildAdjustGoalPrompt(
  goalText: string,
  clarifications: { question: string; answer: string }[],
  userRequest: string,
  adjustmentQA: { question: string; answer: string }[]
): string {
  const clarifyHistory = clarifications.length > 0
    ? `\n\nInitial clarifications:\n${clarifications.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}`
    : '';

  const adjustHistory = adjustmentQA.length > 0
    ? `\n\nFollow-up Q&A:\n${adjustmentQA.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}`
    : '';

  return `Role: Goal refinement assistant. ${GLOBAL_RULES}

Goal: "${goalText}"${clarifyHistory}

Adjustment request: "${userRequest}"${adjustHistory}

If you have enough info, produce an updated goal incorporating the request. Preserve unchanged parts. If ambiguous, ask 1-3 targeted follow-up questions.

${QUESTION_TYPE_GUIDE}

{"needsClarification":boolean,"questions":[{"id":"aq1","question":"...","type":"text|select|multi_select","options":["..."]}],"updatedGoalText":"(if not clarifying)","goalSummary":"(≤50 chars, if not clarifying)"}`;
}

export function buildFreeChatPrompt(
  goalText: string,
  aiUnderstanding: string | null,
  messages: { role: 'user' | 'assistant'; content: string }[]
): string {
  const understandingContext = aiUnderstanding
    ? `\n\nCurrent understanding:\n${aiUnderstanding}`
    : '';

  const conversationHistory = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  return `Role: Goal clarification assistant. Respond in the same language as the user. Be concise but thorough.

Goal being clarified: "${goalText}"${understandingContext}

Answer questions honestly and helpfully. Stay focused on goal clarification. Gently note if the user drifts far off-topic. Do NOT modify the left-panel understanding — the user does that manually.

${conversationHistory}

Respond to the user's latest message.`;
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

export type ClarifyIterateResponse = {
  updatedUnderstanding: { summary: string; blocks: { title: string; content: string }[] };
  isSufficient: boolean;
  nextQuestions: ClarifyQuestion[];
};

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
    isComplexSubGoal?: boolean;
  }[];
};

export type UnderstandResponse = {
  summary: string;
  blocks: { title: string; content: string }[];
};
