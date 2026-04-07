import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import type { Goal, Clarification, Feasibility, GoalAdjustment, Step, StepGroup, StepClarification, GoalState } from '@/lib/types';
import { canTransition } from '@/lib/stateMachine';

interface GoalStore {
  goals: Goal[];
  currentGoal: Goal | null;
  clarifications: Clarification[];
  feasibility: Feasibility | null;
  goalAdjustments: GoalAdjustment[];
  steps: Step[];
  stepGroups: StepGroup[];
  stepClarification: StepClarification | null;
  loading: boolean;

  loadGoals: () => Promise<void>;
  loadGoal: (id: string) => Promise<void>;
  createGoal: (goalText: string, parentStepId?: string | null) => Promise<Goal>;
  updateGoalState: (goalId: string, newState: GoalState) => Promise<void>;
  updateGoalText: (goalId: string, text: string, title?: string) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;

  addClarification: (goalId: string, clarification: Omit<Clarification, 'id'>) => Promise<Clarification>;
  updateClarification: (clarificationId: string, updates: Partial<Clarification>) => Promise<void>;

  setFeasibility: (feasibility: Omit<Feasibility, 'id'>) => Promise<Feasibility>;
  confirmFeasibility: (feasibilityId: string) => Promise<void>;

  addGoalAdjustment: (data: Omit<GoalAdjustment, 'id'>) => Promise<GoalAdjustment>;
  updateGoalAdjustment: (id: string, updates: Partial<GoalAdjustment>) => Promise<void>;

  setSteps: (
    goalId: string,
    steps: Omit<Step, 'id' | 'goalId' | 'childGoalId' | 'status'>[],
    groups?: Omit<StepGroup, 'id' | 'goalId'>[] | { id: string; title: string; description?: string; order: number; blocked_by?: number[] }[]
  ) => Promise<void>;
  updateStep: (stepId: string, updates: Partial<Step>) => Promise<void>;
  deleteStep: (stepId: string) => Promise<void>;
  toggleStepStatus: (stepId: string) => Promise<void>;
  updateStepGroup: (groupId: string, updates: Partial<Pick<StepGroup, 'title' | 'description'>>) => Promise<void>;
  deleteStepGroup: (groupId: string) => Promise<void>;

  setStepClarification: (sc: Omit<StepClarification, 'id'>) => Promise<StepClarification>;
  updateStepClarification: (id: string, updates: Partial<StepClarification>) => Promise<void>;
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  goals: [],
  currentGoal: null,
  clarifications: [],
  feasibility: null,
  goalAdjustments: [],
  steps: [],
  stepGroups: [],
  stepClarification: null,
  loading: false,

  loadGoals: async () => {
    const goals = await db.goals.orderBy('updatedAt').reverse().toArray();
    set({ goals });
  },

  loadGoal: async (id: string) => {
    set({ loading: true });
    const goal = await db.goals.get(id);
    if (!goal) {
      set({ loading: false });
      return;
    }
    const clarifications = await db.clarifications.where('goalId').equals(id).sortBy('round');
    const feasibility = (await db.feasibilities.where('goalId').equals(id).first()) ?? null;
    const goalAdjustments = await db.goalAdjustments.where('goalId').equals(id).sortBy('round');
    const steps = await db.steps.where('goalId').equals(id).sortBy('order');
    const stepGroups = await db.stepGroups.where('goalId').equals(id).sortBy('order');
    const stepClarification = (await db.stepClarifications.where('goalId').equals(id).first()) ?? null;
    set({ currentGoal: goal, clarifications, feasibility, goalAdjustments, steps, stepGroups, stepClarification, loading: false });
  },

  createGoal: async (goalText: string, parentStepId: string | null = null) => {
    const goal: Goal = {
      id: uuidv4(),
      parentStepId,
      title: goalText.slice(0, 50),
      goalText,
      currentState: 'VAGUE_GOAL',
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.goals.add(goal);
    set((s) => ({ goals: [goal, ...s.goals] }));
    return goal;
  },

  updateGoalState: async (goalId: string, newState: GoalState) => {
    const goal = await db.goals.get(goalId);
    if (!goal) return;
    if (!canTransition(goal.currentState, newState)) {
      console.warn(`Invalid transition: ${goal.currentState} -> ${newState}`);
      return;
    }
    const updated = { ...goal, currentState: newState, updatedAt: Date.now() };
    await db.goals.put(updated);
    set((s) => ({
      currentGoal: s.currentGoal?.id === goalId ? updated : s.currentGoal,
      goals: s.goals.map((g) => (g.id === goalId ? updated : g)),
    }));
  },

  updateGoalText: async (goalId: string, text: string, title?: string) => {
    const goal = await db.goals.get(goalId);
    if (!goal) return;
    const updated = {
      ...goal,
      goalText: text,
      title: title ?? goal.title,
      version: goal.version + 1,
      updatedAt: Date.now(),
    };
    await db.goals.put(updated);
    set((s) => ({
      currentGoal: s.currentGoal?.id === goalId ? updated : s.currentGoal,
      goals: s.goals.map((g) => (g.id === goalId ? updated : g)),
    }));
  },

  deleteGoal: async (goalId: string) => {
    await db.goals.delete(goalId);
    await db.clarifications.where('goalId').equals(goalId).delete();
    await db.feasibilities.where('goalId').equals(goalId).delete();
    await db.goalAdjustments.where('goalId').equals(goalId).delete();
    const steps = await db.steps.where('goalId').equals(goalId).toArray();
    for (const step of steps) {
      if (step.childGoalId) {
        await get().deleteGoal(step.childGoalId);
      }
    }
    await db.steps.where('goalId').equals(goalId).delete();
    await db.stepGroups.where('goalId').equals(goalId).delete();
    await db.stepClarifications.where('goalId').equals(goalId).delete();
    set((s) => ({
      goals: s.goals.filter((g) => g.id !== goalId),
      currentGoal: s.currentGoal?.id === goalId ? null : s.currentGoal,
    }));
  },

  addClarification: async (goalId: string, data: Omit<Clarification, 'id'>) => {
    const clarification: Clarification = { ...data, id: uuidv4() };
    await db.clarifications.add(clarification);
    set((s) => ({ clarifications: [...s.clarifications, clarification] }));
    return clarification;
  },

  updateClarification: async (clarificationId: string, updates: Partial<Clarification>) => {
    await db.clarifications.update(clarificationId, updates);
    set((s) => ({
      clarifications: s.clarifications.map((c) =>
        c.id === clarificationId ? { ...c, ...updates } : c
      ),
    }));
  },

  setFeasibility: async (data: Omit<Feasibility, 'id'>) => {
    const existing = await db.feasibilities.where('goalId').equals(data.goalId).first();
    if (existing) {
      await db.feasibilities.delete(existing.id);
    }
    const feasibility: Feasibility = { ...data, id: uuidv4() };
    await db.feasibilities.add(feasibility);
    set({ feasibility });
    return feasibility;
  },

  confirmFeasibility: async (feasibilityId: string) => {
    await db.feasibilities.update(feasibilityId, { userConfirmed: true });
    set((s) => ({
      feasibility: s.feasibility?.id === feasibilityId
        ? { ...s.feasibility, userConfirmed: true }
        : s.feasibility,
    }));
  },

  addGoalAdjustment: async (data: Omit<GoalAdjustment, 'id'>) => {
    const adjustment: GoalAdjustment = { ...data, id: uuidv4() };
    await db.goalAdjustments.add(adjustment);
    set((s) => ({ goalAdjustments: [...s.goalAdjustments, adjustment] }));
    return adjustment;
  },

  updateGoalAdjustment: async (id: string, updates: Partial<GoalAdjustment>) => {
    await db.goalAdjustments.update(id, updates);
    set((s) => ({
      goalAdjustments: s.goalAdjustments.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }));
  },

  setSteps: async (
    goalId: string,
    stepsData: Omit<Step, 'id' | 'goalId' | 'childGoalId' | 'status'>[],
    groups?: Omit<StepGroup, 'id' | 'goalId'>[] | { id: string; title: string; description?: string; order: number; blocked_by?: number[] }[]
  ) => {
    await db.steps.where('goalId').equals(goalId).delete();

    const aiGroupIdToUuid = new Map<string, string>();
    let stepGroups: StepGroup[] = [];
    if (groups && groups.length > 0) {
      await db.stepGroups.where('goalId').equals(goalId).delete();
      const groupsWithIds = groups.map((g) => {
        const aiId = (g as { id?: string }).id;
        const newId = uuidv4();
        if (aiId) aiGroupIdToUuid.set(aiId, newId);
        return {
          ...g,
          id: newId,
          goalId,
          blocked_by: ((g as { blocked_by?: number[] }).blocked_by ?? []).map(String),
        };
      });
      const groupOrderToId = new Map(groupsWithIds.map((g) => [String(g.order), g.id]));
      stepGroups = groupsWithIds.map((g) => ({
        ...g,
        blocked_by: g.blocked_by.map((ref: string) => groupOrderToId.get(ref) ?? ref),
      }));
      await db.stepGroups.bulkAdd(stepGroups);
    }

    const stepsWithIds = stepsData.map((s, i) => ({
      ...s,
      id: uuidv4(),
      goalId,
      order: s.order ?? i,
      childGoalId: null,
      status: 'pending' as const,
      type: s.type ?? 'action' as const,
      executable: s.executable ?? false,
      blocked_by: s.blocked_by ?? [],
      group: s.group ? (aiGroupIdToUuid.get(s.group) ?? s.group) : s.group,
    }));

    const orderToId = new Map(stepsWithIds.map((s) => [String(s.order), s.id]));
    const steps: Step[] = stepsWithIds.map((s) => ({
      ...s,
      blocked_by: s.blocked_by.map((ref: string) => orderToId.get(String(ref)) ?? ref),
    }));
    await db.steps.bulkAdd(steps);

    set({ steps, stepGroups });
  },

  updateStep: async (stepId: string, updates: Partial<Step>) => {
    await db.steps.update(stepId, updates);
    set((s) => ({
      steps: s.steps.map((st) => (st.id === stepId ? { ...st, ...updates } : st)),
    }));
  },

  deleteStep: async (stepId: string) => {
    const step = await db.steps.get(stepId);
    if (!step) return;
    if (step.childGoalId) {
      await get().deleteGoal(step.childGoalId);
    }
    await db.steps.delete(stepId);
    const remaining = get().steps.filter((s) => s.id !== stepId);
    const cleaned = remaining
      .sort((a, b) => a.order - b.order)
      .map((s, i) => ({
        ...s,
        order: i,
        blocked_by: s.blocked_by.filter((bid) => bid !== stepId),
      }));
    for (const s of cleaned) {
      const original = remaining.find((r) => r.id === s.id);
      const needsUpdate =
        s.order !== original?.order ||
        s.blocked_by.length !== (original?.blocked_by.length ?? 0);
      if (needsUpdate) {
        await db.steps.update(s.id, { order: s.order, blocked_by: s.blocked_by });
      }
    }
    set({ steps: cleaned });
  },

  toggleStepStatus: async (stepId: string) => {
    const step = await db.steps.get(stepId);
    if (!step) return;
    const newStatus = step.status === 'completed' ? 'pending' : 'completed';
    await db.steps.update(stepId, { status: newStatus });
    set((s) => ({
      steps: s.steps.map((st) => (st.id === stepId ? { ...st, status: newStatus } : st)),
    }));
  },

  updateStepGroup: async (groupId: string, updates: Partial<Pick<StepGroup, 'title' | 'description'>>) => {
    await db.stepGroups.update(groupId, updates);
    set((s) => ({
      stepGroups: s.stepGroups.map((g) => (g.id === groupId ? { ...g, ...updates } : g)),
    }));
  },

  deleteStepGroup: async (groupId: string) => {
    const stepsInGroup = get().steps.filter((s) => s.group === groupId);
    const removedIds = new Set(stepsInGroup.map((s) => s.id));

    for (const step of stepsInGroup) {
      if (step.childGoalId) {
        await get().deleteGoal(step.childGoalId);
      }
      await db.steps.delete(step.id);
    }

    await db.stepGroups.delete(groupId);

    const remaining = get().steps.filter((s) => !removedIds.has(s.id));
    const cleaned = remaining
      .sort((a, b) => a.order - b.order)
      .map((s, i) => ({
        ...s,
        order: i,
        blocked_by: s.blocked_by.filter((bid) => !removedIds.has(bid)),
      }));
    for (const s of cleaned) {
      const original = remaining.find((r) => r.id === s.id);
      const needsUpdate =
        s.order !== original?.order ||
        s.blocked_by.length !== (original?.blocked_by.length ?? 0);
      if (needsUpdate) {
        await db.steps.update(s.id, { order: s.order, blocked_by: s.blocked_by });
      }
    }

    set((prev) => ({
      steps: cleaned,
      stepGroups: prev.stepGroups.filter((g) => g.id !== groupId),
    }));
  },

  setStepClarification: async (data: Omit<StepClarification, 'id'>) => {
    const existing = await db.stepClarifications.where('goalId').equals(data.goalId).first();
    if (existing) {
      await db.stepClarifications.delete(existing.id);
    }
    const sc: StepClarification = {
      ...data,
      id: uuidv4(),
      resolvedHistory: data.resolvedHistory ?? [],
    };
    await db.stepClarifications.add(sc);
    set({ stepClarification: sc });
    return sc;
  },

  updateStepClarification: async (id: string, updates: Partial<StepClarification>) => {
    await db.stepClarifications.update(id, updates);
    set((s) => ({
      stepClarification: s.stepClarification?.id === id
        ? { ...s.stepClarification, ...updates }
        : s.stepClarification,
    }));
  },
}));
