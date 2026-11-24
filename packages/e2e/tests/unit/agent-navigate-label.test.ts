import { expect, it } from 'vitest';
import { describeAction } from '@e2e-dev/core/lib/agent/actions';

/** Redaction that changes nothing: these labels register no secret. */
const nothing = { redact: (text: string) => text, redactCut: (text: string) => text };

it('keeps a navigation credential and query out of its step label', () => {
  const described = describeAction(
    { name: 'navigate', url: 'https://preview:S3cret!@staging.example.com/reset?token=abc#done' },
    nothing,
  );
  expect(described.summary).toBe('navigate to "https://staging.example.com/reset"');
});

it('keeps a relative navigation query out of its step label', () => {
  const described = describeAction({ name: 'navigate', url: '/todos?token=abc' }, nothing);
  expect(described.summary).toBe('navigate to "/todos"');
});