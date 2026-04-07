import Dexie, { type EntityTable } from 'dexie';
import type { Goal, Clarification, Feasibility, GoalAdjustment, Step, StepGroup, StepClarification } from '@/lib/types';

const db = new Dexie('GoalToExecution') as Dexie & {
  goals: EntityTable<Goal, 'id'>;
  clarifications: EntityTable<Clarification, 'id'>;
  feasibilities: EntityTable<Feasibility, 'id'>;
  goalAdjustments: EntityTable<GoalAdjustment, 'id'>;
  steps: EntityTable<Step, 'id'>;
  stepGroups: EntityTable<StepGroup, 'id'>;
  stepClarifications: EntityTable<StepClarification, 'id'>;
};

db.version(1).stores({
  goals: 'id, parentStepId, currentState, updatedAt',
  clarifications: 'id, goalId, round',
  feasibilities: 'id, goalId',
  steps: 'id, goalId, order',
  stepClarifications: 'id, goalId',
});

db.version(2).stores({
  goals: 'id, parentStepId, currentState, updatedAt',
  clarifications: 'id, goalId, round',
  feasibilities: 'id, goalId',
  goalAdjustments: 'id, goalId, round',
  steps: 'id, goalId, order',
  stepClarifications: 'id, goalId',
});

db.version(3).stores({
  goals: 'id, parentStepId, currentState, updatedAt',
  clarifications: 'id, goalId, round',
  feasibilities: 'id, goalId',
  goalAdjustments: 'id, goalId, round',
  steps: 'id, goalId, order, type, executable, group',
  stepGroups: 'id, goalId, order',
  stepClarifications: 'id, goalId',
});

db.version(4).stores({
  goals: 'id, parentStepId, currentState, updatedAt',
  clarifications: 'id, goalId, round',
  feasibilities: 'id, goalId',
  goalAdjustments: 'id, goalId, round',
  steps: 'id, goalId, order, type, executable, group',
  stepGroups: 'id, goalId, order',
  stepClarifications: 'id, goalId',
}).upgrade((tx) => {
  return tx.table('stepGroups').toCollection().modify((group) => {
    if (!group.blocked_by) group.blocked_by = [];
  });
});

export { db };
