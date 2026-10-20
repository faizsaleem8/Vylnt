import { z } from 'zod';

export const annotationSchema = z.object({
  familyId: z.string().min(1).max(200),
  label: z.enum(['actionable', 'contextual', 'unreviewed']),
  provenance: z.enum(['synthetic', 'reviewed']),
  reason: z.enum(['security-impact-confirmed', 'intended-configuration', 'insufficient-evidence']),
}).strict().superRefine((item, ctx) => {
  if (item.reason !== annotationReasons[item.label]) ctx.addIssue({ code: 'custom', message: 'Label and adjudication reason disagree' });
});
export const annotationReasons = { actionable: 'security-impact-confirmed', contextual: 'intended-configuration', unreviewed: 'insufficient-evidence' } as const;
export type Annotation = z.infer<typeof annotationSchema>;
