import type { Step, StepGroup, Feasibility } from '@/lib/types';

export interface GoalExport {
  schemaVersion: '1.0';
  exportedAt: string;
  goal: {
    title: string;
    text: string;
  };
  context: {
    clarifications: { question: string; answer: string }[];
    feasibility?: {
      summary: string;
      level: string;
      assumptions: string[];
      risks: string[];
    };
  };
  plan: {
    groups: {
      ref: string;
      title: string;
      description?: string;
      blocked_by: string[];
    }[];
    steps: {
      ref: string;
      group?: string;
      title: string;
      description: string;
      type: string;
      executable: boolean;
      tool_hint?: string;
      reason_if_not_executable?: string;
      blocked_by: string[];
    }[];
  };
}

interface BuildExportJsonParams {
  goalTitle: string;
  goalText: string;
  clarifications: { question: string; answer: string }[];
  feasibility: Feasibility | null;
  steps: Step[];
  stepGroups: StepGroup[];
}

export function buildExportJson(params: BuildExportJsonParams): GoalExport {
  const { goalTitle, goalText, clarifications, feasibility, steps, stepGroups } = params;

  // Build UUID → ref maps
  const stepRefMap = new Map<string, string>();
  steps.forEach((s, i) => {
    stepRefMap.set(s.id, `S${i + 1}`);
  });

  const groupRefMap = new Map<string, string>();
  stepGroups.forEach((g, i) => {
    groupRefMap.set(g.id, `G${i + 1}`);
  });

  const exportedGroups = stepGroups.map((g) => ({
    ref: groupRefMap.get(g.id)!,
    title: g.title,
    ...(g.description ? { description: g.description } : {}),
    blocked_by: g.blocked_by.map((ref) => groupRefMap.get(ref)).filter((r): r is string => r !== undefined),
  }));

  const exportedSteps = steps.map((s) => {
    const entry: GoalExport['plan']['steps'][number] = {
      ref: stepRefMap.get(s.id)!,
      title: s.title,
      description: s.description,
      type: s.type,
      executable: s.executable,
      blocked_by: s.blocked_by.map((ref) => stepRefMap.get(ref)).filter((r): r is string => r !== undefined),
    };

    if (s.group) {
      entry.group = groupRefMap.get(s.group) ?? s.group;
    }
    if (s.tool_hint) {
      entry.tool_hint = s.tool_hint;
    }
    if (s.reason_if_not_executable) {
      entry.reason_if_not_executable = s.reason_if_not_executable;
    }

    return entry;
  });

  const result: GoalExport = {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    goal: {
      title: goalTitle,
      text: goalText,
    },
    context: {
      clarifications: clarifications.filter((c) => c.answer?.trim()),
    },
    plan: {
      groups: exportedGroups,
      steps: exportedSteps,
    },
  };

  if (feasibility) {
    result.context.feasibility = {
      summary: feasibility.summary,
      level: feasibility.level,
      assumptions: feasibility.assumptions,
      risks: feasibility.risks,
    };
  }

  return result;
}

export function downloadJson(data: GoalExport, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
