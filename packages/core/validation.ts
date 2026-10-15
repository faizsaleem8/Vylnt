import { z } from 'zod';
import { createReport, safeUrl, securityHeaders } from './index';

const httpUrl = z.string().max(4096).url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol), 'HTTP(S) URL required').transform(safeUrl);
const cookie = z.object({ name: z.string().min(1).max(100), secure: z.boolean(), httpOnly: z.boolean(),
  sameSite: z.enum(['no_restriction', 'lax', 'strict', 'unspecified']), session: z.boolean() }).strict();
export const observationSchema = z.object({
  url: httpUrl, scannedAt: z.iso.datetime(),
  headers: z.record(z.string().max(100), z.string().max(8192)).optional().transform(headers => headers === undefined ? undefined : securityHeaders(Object.entries(headers).map(([name, value]) => ({ name, value })))),
  cookies: z.array(cookie).max(100).optional(),
  resources: z.array(z.object({ url: httpUrl, type: z.string().max(30), outcome: z.enum(['referenced', 'requested', 'completed', 'failed']) }).strict()).max(600),
  scripts: z.array(z.object({ url: httpUrl, integrity: z.boolean() }).strict()).max(150),
  domCollected: z.boolean()
}).strict();
export const submissionSchema = z.object({ scanId: z.uuid(), observation: observationSchema }).strict();
export const feedbackSchema = z.object({ verdict: z.enum(['open', 'fixed', 'accepted_risk', 'false_positive']), notes: z.string().trim().max(1000).default('') }).strict();
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export interface Feedback extends FeedbackInput { findingId: string; updatedAt: string }

export function parseSubmission(input: unknown) {
  const parsed = submissionSchema.parse(input);
  // Caller-supplied findings, score, owner and ruleset are never trusted.
  return createReport(parsed.scanId, parsed.observation);
}
