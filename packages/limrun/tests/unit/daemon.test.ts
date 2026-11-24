import { beforeEach, expect, it, vi } from 'vitest';
import { assertDriverVersion, stopDriver } from '../../src/daemon.ts';

const mocks = vi.hoisted(() => ({ manifest: {} as unknown }));
vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
  readFileSync: () => JSON.stringify(mocks.manifest),
}));

const child = vi.hoisted(() => ({ stdout: '' }));
vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  // `promisify(execFile)` resolves with the callback's single success value, which the real one passes as `{ stdout, stderr }`.
  execFile: (_file: unknown, _args: unknown, _options: unknown, callback: (error: null, result: { stdout: string; stderr: string }) => void) => {
    callback(null, { stdout: child.stdout, stderr: '' });
  },
}));

beforeEach(() => {
  mocks.manifest = { name: 'agent-device', version: '0.21.28', bin: { 'agent-device': 'bin/agent-device.mjs' } };
});

it('reads the version of the installed agent-device', () => {
  expect(() => assertDriverVersion('0.21.28')).not.toThrow();
  expect(() => assertDriverVersion('0.21.27')).toThrow('@e2e-dev/limrun uses agent-device 0.21.28, but @e2e-dev/mobile uses 0.21.27. Install matching versions.');
});

it('names an agent-device manifest without a version', () => {
  mocks.manifest = { name: 'agent-device', bin: { 'agent-device': 'bin/agent-device.mjs' } };
  expect(() => assertDriverVersion('0.21.28')).toThrow(/^Cannot find the installed agent-device CLI: .*package\.json declares no version or agent-device bin$/);
});

it('names an agent-device manifest without an agent-device bin', () => {
  mocks.manifest = { name: 'agent-device', version: '0.21.28', bin: { other: 'bin/other.mjs' } };
  expect(() => assertDriverVersion('0.21.28')).toThrow(/^Cannot find the installed agent-device CLI: .*package\.json declares no version or agent-device bin$/);
});

it('fails when a forced stop leaves a Limrun session unconfirmed', async () => {
  child.stdout = JSON.stringify({ success: true, data: { mode: 'forced', providerReleases: { status: 'unknown', released: [], pending: null } } });
  await expect(stopDriver('/state', {}, new AbortController().signal)).rejects.toThrow('agent-device could not confirm its Limrun sessions ended');
});

it('accepts a shutdown report that ended every session', async () => {
  child.stdout = JSON.stringify({ success: true, data: { mode: 'clean', providerReleases: { status: 'completed', released: [{ leaseId: 'slot-1' }], pending: [] } } });
  await expect(stopDriver('/state', {}, new AbortController().signal)).resolves.toBeUndefined();
});
