import type { Feedback, FeedbackInput } from '../../packages/core/validation';
import { element } from './ui';

export function findingReview(saved: Feedback | undefined, submit: (input: FeedbackInput) => Promise<Feedback>, isCurrent: () => boolean) {
  const form = element('form', '', 'finding-review');
  const savedLabel = element('p', '', 'muted');
  const labels = { open: 'Open', fixed: 'Fixed', accepted_risk: 'Accepted risk', false_positive: 'False positive' };
  const verdict = element('select'); verdict.setAttribute('aria-label', 'Review decision');
  for (const [value, label] of Object.entries(labels)) { const option = element('option', label); option.value = value; verdict.append(option); }
  verdict.value = saved?.verdict ?? 'open';
  const verdictLabel = element('label', 'Review decision'); verdictLabel.append(verdict);
  const notes = element('textarea'); notes.setAttribute('aria-label', 'Review notes'); notes.maxLength = 1000; notes.rows = 3; notes.value = saved?.notes ?? '';
  notes.placeholder = 'Add context without secrets.';
  const notesLabel = element('label', 'Review notes'); notesLabel.append(notes);
  const button = element('button', 'Save decision'); button.type = 'submit';
  const message = element('p', '', 'review-status'); message.setAttribute('role', 'status');
  const updateSaved = (feedback?: Feedback) => { savedLabel.textContent = 'Saved decision: ' + labels[feedback?.verdict ?? 'open'] + (feedback ? ' / ' + new Date(feedback.updatedAt).toLocaleString() : ''); };
  updateSaved(saved);
  form.append(element('h3', 'Review this finding'), savedLabel, verdictLabel, notesLabel,
    element('p', 'Your assessment is saved separately from the original evidence. Verify remediation with a fresh scan.', 'muted'), button, message);
  let pending = false;
  form.onsubmit = async event => {
    event.preventDefault(); if (pending || !isCurrent()) return;
    pending = true; button.disabled = verdict.disabled = notes.disabled = true;
    message.textContent = 'Saving decision…';
    try {
      const feedback = await submit({ verdict: verdict.value as FeedbackInput['verdict'], notes: notes.value });
      if (!isCurrent()) return;
      updateSaved(feedback); message.textContent = 'Review decision saved. Original evidence and score are unchanged.';
    } catch (error) { if (isCurrent()) message.textContent = error instanceof Error ? error.message : 'Could not save the decision. Your draft is still here.'; }
    finally { pending = false; if (isCurrent()) button.disabled = verdict.disabled = notes.disabled = false; }
  };
  return form;
}
