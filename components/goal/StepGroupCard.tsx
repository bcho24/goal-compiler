'use client';

import { useState } from 'react';
import { Edit3, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StepItem } from './StepItem';
import { useI18n } from '@/lib/i18n';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Step, StepGroup } from '@/lib/types';

interface StepGroupCardProps {
  group: StepGroup;
  steps: Step[];
  allSteps: Step[];
  onToggleStep: (stepId: string) => void;
  onEditStep: (stepId: string, title: string, description: string) => void;
  onDeleteStep?: (stepId: string) => void;
  onDrillDown: (step: Step) => void;
  onViewChild: (childGoalId: string) => void;
  onEditGroup?: (groupId: string, title: string, description?: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  childStepCounts?: Record<string, number>;
}

export function StepGroupCard({
  group,
  steps,
  allSteps,
  onToggleStep,
  onEditStep,
  onDeleteStep,
  onDrillDown,
  onViewChild,
  onEditGroup,
  onDeleteGroup,
  childStepCounts,
}: StepGroupCardProps) {
  const { t } = useI18n();
  const done = steps.filter((s) => s.status === 'completed').length;
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(group.title);
  const [editDesc, setEditDesc] = useState(group.description ?? '');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSave = () => {
    onEditGroup?.(group.id, editTitle, editDesc || undefined);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(group.title);
    setEditDesc(group.description ?? '');
    setEditing(false);
  };

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden group/card">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40">
        {editing ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="h-7 text-sm font-semibold flex-1"
              placeholder={t('stepGroup.groupTitle')}
              autoFocus
            />
            <Input
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="h-7 text-xs flex-1 hidden sm:block"
              placeholder={t('stepGroup.groupDescription')}
            />
            <Button size="sm" variant="default" className="h-7 text-xs gap-1 shrink-0" onClick={handleSave}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 shrink-0" onClick={handleCancel}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-semibold truncate">{group.title}</h3>
              {group.description && (
                <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                  — {group.description}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {t('stepGroup.progress', { done, total: steps.length })}
              </span>
              {(onEditGroup || onDeleteGroup) && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity ml-1">
                  {onEditGroup && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setEditing(true)}
                      title={t('common.edit')}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  )}
                  {onDeleteGroup && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => setConfirmOpen(true)}
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <ConfirmDialog
                        open={confirmOpen}
                        title={t('stepGroup.confirmDelete')}
                        onConfirm={() => { setConfirmOpen(false); onDeleteGroup(group.id); }}
                        onCancel={() => setConfirmOpen(false)}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <div className="p-3 space-y-2">
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
            allSteps={allSteps}
          />
        ))}
      </div>
    </div>
  );
}
