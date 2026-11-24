/** A provider key no pattern could hold is still redacted, literally and whole values only. */

import { describe, expect, it } from 'vitest';
import { SecretLedger, type SecretsBeside } from '@e2e-dev/core/lib/internal/redact';

const VALUE = 'no-pattern-value-0123456789';

function beside(refused: readonly (readonly [string, string])[]): SecretsBeside {
  return {
    revision: refused.length + 1,
    values: () => [],
    providerKeys: () => [],
    refusedProviderKeys: () => refused,
  };
}

describe('a provider key no pattern can hold', () => {
  it('is redacted as a whole value', () => {
    const ledger = new SecretLedger([], beside([['API_KEY', VALUE]]));
    expect(ledger.redact(`before ${VALUE} after`)).toBe('before <secret:API_KEY> after');
  });

  it('is not redacted in part, as a provider key never is', () => {
    const ledger = new SecretLedger([], beside([['API_KEY', VALUE]]));
    expect(ledger.redact('no-pattern-value-0123')).toBe('no-pattern-value-0123');
  });

  it('counts as something the ledger redacts, for its full length', () => {
    const ledger = new SecretLedger([], beside([['API_KEY', VALUE]]));
    expect(ledger.redactsAnything).toBe(true);
    expect(ledger.maxFormLength).toBe(VALUE.length);
  });

  it('is redacted in fragment scans and across a shortened cut', () => {
    const ledger = new SecretLedger([], beside([['API_KEY', VALUE]]));
    expect(ledger.redactFragments(`x ${VALUE} y`)).toBe('x <secret:API_KEY> y');
    expect(ledger.redactCut(`x ${VALUE}`)).toBe('x <secret:API_KEY>');
  });

  it('is redacted beside the values a pattern does cover', () => {
    const ledger = new SecretLedger([['member', 'hunter2']], beside([['API_KEY', VALUE]]));
    expect(ledger.redact(`hunter2 ${VALUE}`)).toBe('<secret:member> <secret:API_KEY>');
  });

  it('is held back whole by a stream that writes its prefix', () => {
    const ledger = new SecretLedger([], beside([['API_KEY', VALUE]]));
    const text = `${'x'.repeat(40)}no-pattern-valu`;
    expect(ledger.holdFrom(text)).toBeLessThanOrEqual(40);
  });

  it('leaves text alone while a key is not one of the refused ones', () => {
    const ledger = new SecretLedger([], beside([['API_KEY', 'another-value-0123456789']]));
    expect(ledger.redact(VALUE)).toBe(VALUE);
  });
});