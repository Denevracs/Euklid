'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';

const documentSchema = z.object({
  institutionName: z.string().trim().min(2, 'Institution or organization name is required'),
  role: z.string().trim().min(2, 'Please describe your affiliation role'),
  proofUrl: z.string().trim().url('Provide a valid URL to supporting documentation'),
  notes: z.string().trim().optional(),
});

const scholarlySchema = z
  .object({
    orcid: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => !value || /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(value),
        'Provide a valid ORCID identifier'
      ),
    scholar: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || /^https?:\/\//i.test(value), 'Provide a valid URL'),
  })
  .refine((value) => value.orcid || value.scholar, {
    message: 'Provide at least one scholarly identifier',
    path: ['orcid'],
  });

export type DocumentSubmissionValues = z.infer<typeof documentSchema>;
export type ScholarlySubmissionValues = z.infer<typeof scholarlySchema>;

type SubmissionFormProps = {
  variant: 'DOCUMENT_ORG' | 'SCHOLAR_PROFILE';
  onSubmit: (values: DocumentSubmissionValues | ScholarlySubmissionValues) => Promise<void> | void;
  isSubmitting?: boolean;
};

export function VerificationSubmissionForm({
  variant,
  onSubmit,
  isSubmitting,
}: SubmissionFormProps) {
  const schema = variant === 'DOCUMENT_ORG' ? documentSchema : scholarlySchema;
  const form = useForm<DocumentSubmissionValues | ScholarlySubmissionValues>({
    resolver: zodResolver(schema),
    defaultValues:
      variant === 'DOCUMENT_ORG'
        ? { institutionName: '', role: '', proofUrl: '', notes: '' }
        : { orcid: '', scholar: '' },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    form.reset();
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {variant === 'DOCUMENT_ORG' ? (
        <>
          <div className="space-y-1">
            <label htmlFor="institutionName" className="text-sm font-medium text-foreground">
              Institution or Organization
            </label>
            <input
              id="institutionName"
              type="text"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="Harvard University"
              {...form.register('institutionName')}
            />
            {form.formState.errors.institutionName ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.institutionName.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <label htmlFor="role" className="text-sm font-medium text-foreground">
              Affiliation Role
            </label>
            <input
              id="role"
              type="text"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="Research Fellow"
              {...form.register('role')}
            />
            {form.formState.errors.role ? (
              <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <label htmlFor="proofUrl" className="text-sm font-medium text-foreground">
              Proof URL
            </label>
            <input
              id="proofUrl"
              type="url"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="https://..."
              {...form.register('proofUrl')}
            />
            {form.formState.errors.proofUrl ? (
              <p className="text-sm text-destructive">{form.formState.errors.proofUrl.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <label htmlFor="notes" className="text-sm font-medium text-foreground">
              Additional Context (optional)
            </label>
            <textarea
              id="notes"
              className="h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="Include links, contact info, or verification references"
              {...form.register('notes')}
            />
            {form.formState.errors.notes ? (
              <p className="text-sm text-destructive">{form.formState.errors.notes.message}</p>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <label htmlFor="orcid" className="text-sm font-medium text-foreground">
              ORCID ID
            </label>
            <input
              id="orcid"
              type="text"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="0000-0000-0000-0000"
              {...form.register('orcid')}
            />
            {form.formState.errors.orcid ? (
              <p className="text-sm text-destructive">{form.formState.errors.orcid.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <label htmlFor="scholar" className="text-sm font-medium text-foreground">
              Google Scholar Profile
            </label>
            <input
              id="scholar"
              type="url"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="https://scholar.google.com/..."
              {...form.register('scholar')}
            />
            {form.formState.errors.scholar ? (
              <p className="text-sm text-destructive">{form.formState.errors.scholar.message}</p>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Share scholarly identifiers so peers and moderators can verify your publication history.
          </p>
        </>
      )}

      <div className="pt-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Submit verification'}
        </Button>
      </div>
    </form>
  );
}
