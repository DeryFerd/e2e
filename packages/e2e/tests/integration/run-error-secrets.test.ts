/**
 * A run-level error the runner records before any session opens — a test file
 * that throws while it is collected, an engine that fails to provision — has to
 * be redacted with the config's static secrets, not only with what a live
 * session has learned. The main runner process serializes these errors, and it
 * never opens a session first, so it must seed its own ledger the way a worker
 * seeds its own.
 */

import { describe, expect, it } from 'vitest';
import { runProjectWithConfigFile } from '../helpers/run-project.ts';

const SECRET = 'run-error-secret-Qx7W2p';
const MARKER = '<secret:probe>';

const CONFIG = `import type { E2EConfig } from 'e2e';
import { defineEngine } from 'e2e/engine';

const node = { ref: { id: 'n1', revision: '' }, role: 'button', name: 'Go', states: { hidden: false } };

export default {
  targets: [{ name: 'fake', platform: 'custom', engine: defineEngine({
    name: 'fake', version: '1.0.0', spiVersion: 1,
    async observe() { return { location: 'app://fake/Home', root: node, viewport: { width: 100, height: 100 } }; },
    async locate() { return [node]; },
  }) }],
  workers: 1,
  cache: 'off',
  secrets: { probe: ${JSON.stringify(SECRET)} },
} satisfies E2EConfig;
`;

const THROWS_AT_COLLECTION = `import { test } from 'e2e';

throw new Error('the app echoed ${SECRET}');

test('never runs', async () => {});
`;

describe('a run-level error recorded before any session opens', () => {
  it('redacts the config secrets from a collection failure', async () => {
    const { outcome, project } = await runProjectWithConfigFile(
      { 'tests/boom.e2e.ts': THROWS_AT_COLLECTION },
      { appUrl: 'http://127.0.0.1:9/', configSource: CONFIG },
    );
    try {
      const messages = outcome.report.run.errors.map((error) => error.message).join('\n');
      expect(messages).toContain(MARKER);
      expect(messages).not.toContain(SECRET);
    } finally {
      project.cleanup();
    }
  });
});
