'use client';

import { useMemo } from 'react';
import { ArrowDown } from 'lucide-react';
import { StepGroupCard } from './StepGroupCard';
import { StepItem } from './StepItem';
import { useI18n } from '@/lib/i18n';
import type { Step, StepGroup } from '@/lib/types';

interface StepGroupedViewProps {
  steps: Step[];
  stepGroups: StepGroup[];
  onToggleStep: (stepId: string) => void;
  onEditStep: (stepId: string, title: string, description: string) => void;
  onDeleteStep?: (stepId: string) => void;
  onDrillDown: (step: Step) => void;
  onViewChild: (childGoalId: string) => void;
  onEditGroup?: (groupId: string, title: string, description?: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  childStepCounts?: Record<string, number>;
}

function topoSortGroups(groups: StepGroup[]): { layers: StepGroup[][] } {
  const visited = new Set<string>();
  const layers: StepGroup[][] = [];

  while (visited.size < groups.length) {
    const layer: StepGroup[] = [];
    for (const g of groups) {
      if (visited.has(g.id)) continue;
      const deps = g.blocked_by ?? [];
      if (deps.every((d) => visited.has(d))) layer.push(g);
    }
    if (layer.length === 0) {
      layers.push(groups.filter((g) => !visited.has(g.id)));
      break;
    }
    layer.sort((a, b) => a.order - b.order);
    for (const g of layer) visited.add(g.id);
    layers.push(layer);
  }

  return { layers };
}

export function StepGroupedView({
  steps,
  stepGroups,
  onToggleStep,
  onEditStep,
  onDeleteStep,
  onDrillDown,
  onViewChild,
  onEditGroup,
  onDeleteGroup,
  childStepCounts,
}: StepGroupedViewProps) {
  const { t } = useI18n();

  const hasGroups = stepGroups.length > 0 && steps.some((s) => s.group);

  const { layers } = useMemo(() => {
    if (!hasGroups) return { layers: [] };
    return topoSortGroups(stepGroups);
  }, [stepGroups, hasGroups]);

  if (!hasGroups) {
    return (
      <div className="space-y-2">
        {steps.map((step) => (
          <StepItem
            key={step.id}
            step={step}
            index={step.order}
            onToggleStatus={onToggleStep}
            onEdit={onEditStep}
            onDelete={onDeleteStep}
            onDrillDown={onDrillDown}
            onViewChild={onViewChild}
            childStepCount={step.childGoalId ? childStepCounts?.[step.childGoalId] : undefined}
            allSteps={steps}
          />
        ))}
      </div>
    );
  }

  const stepsByGroup = new Map<string, Step[]>();
  for (const s of steps) {
    const gid = s.group ?? '__ungrouped__';
    if (!stepsByGroup.has(gid)) stepsByGroup.set(gid, []);
    stepsByGroup.get(gid)!.push(s);
  }

  return (
    <div className="space-y-4">
      {layers.map((layer, li) => (
        <div key={li}>
          {li > 0 && (
            <div className="flex justify-center py-2">
              <ArrowDown className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="grid gap-4">
            {layer.map((group) => (
              <StepGroupCard
                key={group.id}
                group={group}
                steps={stepsByGroup.get(group.id) ?? []}
                allSteps={steps}
                onToggleStep={onToggleStep}
                onEditStep={onEditStep}
                onDeleteStep={onDeleteStep}
                onDrillDown={onDrillDown}
                onViewChild={onViewChild}
                onEditGroup={onEditGroup}
                onDeleteGroup={onDeleteGroup}
                childStepCounts={childStepCounts}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
