'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { NodeStatus, NodeType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { nodeCreateSchema, type NodeCreateInput, evidenceKindEnum } from '@euclid/validation';

interface DependencyOption {
  id: string;
  title: string;
  type: NodeType;
}

interface CreateNodeFormProps {
  dependencies: DependencyOption[];
}

export function CreateNodeForm({ dependencies }: CreateNodeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<NodeCreateInput>({
    resolver: zodResolver(nodeCreateSchema),
    defaultValues: {
      title: '',
      statement: '',
      type: 'THEOREM',
      status: 'HYPOTHETICAL',
      metadata: {},
      dependencies: [],
      evidence: [],
    },
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  const evidenceFields = useFieldArray({ control, name: 'evidence' });

  const onSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to create node');
      }

      const body = await response.json();
      router.push(`/nodes/${body.id}`);
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : 'Unexpected error.');
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new knowledge node</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              <span>Title</span>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Euclid's parallel postulate"
                {...register('title')}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>Type</span>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('type')}
              >
                {Object.values(NodeType).map((option) => (
                  <option key={option} value={option}>
                    {option.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>Status</span>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('status')}
              >
                {Object.values(NodeStatus).map((option) => (
                  <option key={option} value={option}>
                    {option.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2 text-sm font-medium">
            <span>Statement</span>
            <textarea
              className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="State the formal statement or summary of this node."
              {...register('statement')}
            />
            {errors.statement && (
              <p className="text-xs text-destructive">{errors.statement.message}</p>
            )}
          </label>

          <label className="space-y-2 text-sm font-medium">
            <span>Dependencies</span>
            <select
              multiple
              className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register('dependencies')}
            >
              {dependencies.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title} ({option.type.toLowerCase()})
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Evidence
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  evidenceFields.append({ kind: 'FORMAL_PROOF', uri: '', summary: '' })
                }
              >
                Add evidence
              </Button>
            </div>
            {evidenceFields.fields.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Optional: attach supporting materials.
              </p>
            )}
            {evidenceFields.fields.map((field, index) => (
              <div key={field.id} className="rounded-md border border-border p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-xs font-medium">
                    <span>Kind</span>
                    <select
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                      {...register(`evidence.${index}.kind` as const)}
                    >
                      {evidenceKindEnum.options.map((option) => (
                        <option key={option} value={option}>
                          {option.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-medium">
                    <span>URI</span>
                    <input
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                      {...register(`evidence.${index}.uri` as const)}
                    />
                    {errors.evidence?.[index]?.uri && (
                      <p className="text-xs text-destructive">
                        {errors.evidence[index]?.uri?.message}
                      </p>
                    )}
                  </label>
                  <label className="space-y-1 text-xs font-medium md:col-span-2">
                    <span>Summary</span>
                    <textarea
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                      rows={3}
                      {...register(`evidence.${index}.summary` as const)}
                    />
                    {errors.evidence?.[index]?.summary && (
                      <p className="text-xs text-destructive">
                        {errors.evidence[index]?.summary?.message}
                      </p>
                    )}
                  </label>
                  <label className="space-y-1 text-xs font-medium">
                    <span>Hash (optional)</span>
                    <input
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                      {...register(`evidence.${index}.hash` as const)}
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium">
                    <span>Confidence (0-1)</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                      {...register(`evidence.${index}.confidence` as const, {
                        valueAsNumber: true,
                      })}
                    />
                  </label>
                </div>
                <div className="mt-3 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => evidenceFields.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create node'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
