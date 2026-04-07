'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Edit3, GitBranch, Check, X, FolderOpen, Zap, ZapOff, Link2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useI18n } from '@/lib/i18n';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Step, StepType } from '@/lib/types';

const STEP_TYPE_CONFIG: Record<StepType, { labelKey: string; className: string }> = {
  research: { labelKey: 'stepItem.typeResearch', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  decision: { labelKey: 'stepItem.typeDecision', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  action: { labelKey: 'stepItem.typeAction', className: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' },
  creation: { labelKey: 'stepItem.typeCreation', className: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
};

interface StepItemProps {
  step: Step;
  index: number;
  onToggleStatus: (stepId: string) => void;
  onEdit: (stepId: string, title: string, description: string) => void;
  onDelete?: (stepId: string) => void;
  onDrillDown: (step: Step) => void;
  onViewChild: (childGoalId: string) => void;
  childStepCount?: number;
  allSteps?: Step[];
}

export function StepItem({
  step,
  index,
  onToggleStatus,
  onEdit,
  onDelete,
  onDrillDown,
  onViewChild,
  childStepCount,
  allSteps = [],
}: StepItemProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(step.title);
  const [editDesc, setEditDesc] = useState(step.description);
  const [expanded, setExpanded] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { t } = useI18n();

  const handleSave = () => {
    onEdit(step.id, editTitle, editDesc);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(step.title);
    setEditDesc(step.description);
    setEditing(false);
  };

  const isCompleted = step.status === 'completed';
  const typeConfig = step.type ? STEP_TYPE_CONFIG[step.type] : null;
  const blockedBySteps = (step.blocked_by ?? [])
    .map((bid) => allSteps.find((s) => s.id === bid))
    .filter(Boolean) as Step[];

  return (
    <div className="group rounded-lg border p-3 transition-colors hover:bg-muted/30">
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2 pt-0.5">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => onToggleStatus(step.id)}
          />
          <span className="text-sm font-medium text-muted-foreground w-5">{index + 1}.</span>
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-8 text-sm font-medium"
                placeholder={t('stepItem.stepTitle')}
              />
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="text-sm resize-none"
                rows={2}
                placeholder={t('stepItem.stepDescription')}
              />
              <div className="flex gap-1.5">
                <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={handleSave}>
                  <Check className="h-3 w-3" /> {t('stepItem.save')}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleCancel}>
                  <X className="h-3 w-3" /> {t('stepItem.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <div className="flex items-center gap-2 flex-wrap">
                <CollapsibleTrigger
                  render={<button className="shrink-0 text-muted-foreground hover:text-foreground" />}
                >
                  {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </CollapsibleTrigger>
                <span className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                  {step.title}
                </span>
                {typeConfig && (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig.className}`}>
                    {t(typeConfig.labelKey)}
                  </span>
                )}
                {step.executable !== undefined && (
                  step.executable ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      title={step.tool_hint ? `${t('stepItem.executableHint')}: ${step.tool_hint}` : t('stepItem.executableHint')}
                    >
                      <Zap className="h-3 w-3" />
                      {t('stepItem.executable')}
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground"
                      title={step.reason_if_not_executable ?? t('stepItem.notExecutableHint')}
                    >
                      <ZapOff className="h-3 w-3" />
                      {t('stepItem.notExecutable')}
                    </span>
                  )
                )}
              </div>
              <CollapsibleContent>
                {step.description && (
                  <p className="text-sm text-muted-foreground mt-1 ml-5">{step.description}</p>
                )}
                {!step.executable && step.reason_if_not_executable && (
                  <p className="text-xs text-muted-foreground mt-1 ml-5 italic">
                    {t('stepItem.reason')}: {step.reason_if_not_executable}
                  </p>
                )}
                {step.executable && step.tool_hint && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 ml-5">
                    {t('stepItem.toolHint')}: <span className="font-mono">{step.tool_hint}</span>
                  </p>
                )}
                {blockedBySteps.length > 0 && (
                  <div className="flex items-start gap-1 mt-1.5 ml-5">
                    <Link2 className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground">
                      {t('stepItem.blockedBy')}:{' '}
                      {blockedBySteps.map((s, i) => (
                        <span key={s.id}>
                          {i > 0 && '、'}
                          <span className="font-medium text-foreground">{s.title}</span>
                        </span>
                      ))}
                    </span>
                  </div>
                )}
                {step.childGoalId && (
                  <div className="mt-2 ml-5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => onViewChild(step.childGoalId!)}
                    >
                      <FolderOpen className="h-3 w-3" />
                      {t('stepItem.viewSubPlan')}
                      {childStepCount !== undefined && (
                        <Badge variant="secondary" className="text-xs ml-1">
                          {t('common.nSteps', { n: childStepCount })}
                        </Badge>
                      )}
                    </Button>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {!editing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setEditing(true)}
              title={t('stepItem.edit')}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
            {!step.childGoalId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onDrillDown(step)}
                title={t('stepItem.drillDown')}
              >
                <GitBranch className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setConfirmOpen(true)}
                  title={t('common.delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <ConfirmDialog
                  open={confirmOpen}
                  title={t('stepItem.confirmDelete')}
                  onConfirm={() => { setConfirmOpen(false); onDelete(step.id); }}
                  onCancel={() => setConfirmOpen(false)}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
