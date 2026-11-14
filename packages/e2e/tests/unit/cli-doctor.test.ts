/**
 * `doctor()` in process: what the built CLI cannot show without waiting out
 * the engine budget.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { doctor, type DoctorOptions, type DoctorReport } from '../../src/cli/doctor.ts';
import { cancelledError } from '@e2e-dev/core/lib/internal/time';
import { withProcessOutput } from '../../src/run/process-output.ts';
import { processSecrets } from '@e2e-dev/core/lib/run/secrecy';
import { createProject, type FixtureProject } from '../helpers/run-project.ts';

/**
 * The AI SDK load, mocked through a flag so a test can drive the
 * missing-package path: set `aiSdkLoad.fail` to an error and every
 * `loadAiSdk` call rejects with it, clear it and the real loader runs.
 */
const aiSdkLoad = { fail: undefined as Error | undefined };
vi.mock('@e2e-dev/core/lib/agent/ai-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@e2e-dev/core/lib/agent/ai-sdk')>();
  return {
    ...actual,
    loadAiSdk: () => (aiSdkLoad.fail === undefined ? actual.loadAiSdk() : Promise.reject(aiSdkLoad.fail)),
  };
});

const projects: FixtureProject[] = [];

afterEach(() => {
  for (const project of projects.splice(0)) project.cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  aiSdkLoad.fail = undefined;
});

/** A project whose one target's engine checks until aborted, then closes its connection 200 ms later, marking `closed`. */
function slowProject(): FixtureProject {
  const project = createProject({
    'e2e.config.ts': `import { writeFileSync } from 'node:fs';
import { connectEngine, defineEngine, describeEngine, loopbackTransport, type EngineTransport } from '../../../src/engine/index.ts';
import { FAKE_APP } from '../../helpers/fake-engine.ts';

const hanging = defineEngine({
  name: 'slow',
  version: '1.0.0',
  spiVersion: 1,
  platform: 'fake',
  observe: async () => ({ root: { ref: { id: 'root', revision: '' }, role: 'root' }, viewport: { width: 1, height: 1 } }),
  doctor: (info) => new Promise((resolve) => info.signal.addEventListener('abort', () => resolve([]))),
});
const inner = loopbackTransport(hanging);
const transport: EngineTransport = {
  label: 'slow to close',
  async open(context) {
    const streams = await inner.open(context);
    return {
      ...streams,
      async close(timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        writeFileSync(\`\${context.cwd}/closed\`, '');
        await streams.close(timeoutMs);
      },
    };
  },
};
const slow = connectEngine({ manifest: describeEngine(hanging), transport });

export default { tests: 'tests/**/*.e2e.ts', targets: [{ name: 'slow', engine: slow, app: FAKE_APP }] };
`,
  });
  projects.push(project);
  return project;
}

/** Runs `doctor` on `project` with `signal` and any other options. */
function run(project: FixtureProject, signal: AbortSignal, extra: Partial<DoctorOptions> = {}): Promise<DoctorReport> {
  return withProcessOutput(processSecrets, (output) =>
    doctor({ version: '0.0.0', cwd: project.dir, env: process.env, headed: false, checkModel: false, signal, output, notice: () => {}, ...extra }),
  );
}

describe('doctor', () => {
  it('waits for a cancelled engine to close its connection before it reports', async () => {
    const project = slowProject();
    const controller = new AbortController();
    setTimeout(() => controller.abort(cancelledError()), 200);
    const report = await run(project, controller.signal);
    expect(existsSync(path.join(project.dir, 'closed'))).toBe(true);
    expect(report.checks.find((check) => check.target === 'slow')).toMatchObject({ id: 'engine', status: 'fail', code: 'CANCELLED' });
  });

  it('fails an engine that outlives its budget as ENGINE_FAILURE, after its connection closed', async () => {
    const project = slowProject();
    const report = await run(project, new AbortController().signal, { engineTimeoutMs: 100 });
    expect(existsSync(path.join(project.dir, 'closed'))).toBe(true);
    expect(report.checks.find((check) => check.target === 'slow')).toMatchObject({
      id: 'engine',
      status: 'fail',
      code: 'ENGINE_FAILURE',
      message: 'engine "slow" did not finish its checks within 100ms',
    });
  });

  it('checks the models --model names even when no config loads', async () => {
    const project = createProject({ 'README.md': '' });
    projects.push(project);
    vi.stubEnv('XDG_CONFIG_HOME', path.join(project.dir, '.config'));
    vi.stubEnv('E2E_OAUTH_CREDENTIALS', '');
    const absent = await run(project, new AbortController().signal, { models: [{ provider: 'openai', modelId: 'gpt-6-luna' }] });
    expect(absent.checks.map(({ id, status, code }) => ({ id, status, code }))).toEqual([
      { id: 'node', status: 'pass', code: undefined },
      { id: 'config', status: 'fail', code: 'CONFIG_NOT_FOUND' },
      { id: 'model', status: 'fail', code: 'MODEL_UNAVAILABLE' },
    ]);
    expect(absent.checks.at(-1)).toMatchObject({
      id: 'model',
      status: 'fail',
      login: 'openai',
      code: 'MODEL_UNAVAILABLE',
      model: { modelId: 'gpt-6-luna' },
    });
    // Without a login the credential fails first, so --check-model never reaches the network.
    const called = await run(project, new AbortController().signal, { models: [{ provider: 'openai', modelId: 'gpt-6-luna' }], checkModel: true });
    expect(called.checks.at(-1)).toMatchObject({ id: 'model', status: 'fail', code: 'MODEL_UNAVAILABLE' });
  });

  it('checks a named model after a config that loads and after one whose target names nothing', async () => {
    const project = createProject({
      'e2e.config.ts': `import { createFakeEngine, FAKE_APP } from '../../helpers/fake-engine.ts';
export default { tests: 'tests/**/*.e2e.ts', targets: [{ name: 'fake', platform: 'fake', engine: createFakeEngine({}).engine, app: FAKE_APP }] };
`,
    });
    projects.push(project);
    vi.stubEnv('XDG_CONFIG_HOME', path.join(project.dir, '.config'));
    vi.stubEnv('E2E_OAUTH_CREDENTIALS', '');
    const loaded = await run(project, new AbortController().signal, { models: [{ provider: 'openai', modelId: 'gpt-6-luna' }] });
    expect(loaded.checks.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: 'node', status: 'pass' },
      { id: 'config', status: 'pass' },
      { id: 'engine', status: 'skip' },
      { id: 'model', status: 'skip' },
      { id: 'model', status: 'fail' },
    ]);
    // The named checks run on the failure path too, after a --target that names nothing.
    const unknownTarget = await run(project, new AbortController().signal, { targets: ['nope'], models: [{ provider: 'openai', modelId: 'gpt-6-luna' }] });
    expect(unknownTarget.checks.map(({ id, status, code }) => ({ id, status, code }))).toEqual([
      { id: 'node', status: 'pass' },
      { id: 'config', status: 'fail', code: 'UNKNOWN_TARGET' },
      { id: 'model', status: 'fail', code: 'MODEL_UNAVAILABLE' },
    ]);
  });

  it('fails a named model whose constructor cannot load, with the error it threw, naming the model and its login', async () => {
    // A missing optional peer, as `@ai-sdk/openai` is on a CLI-only install.
    vi.doMock('../../src/oauth/chatgpt.ts', () => ({
      chatgpt: () => {
        throw new Error('Cannot find package @ai-sdk/openai');
      },
    }));
    try {
      const project = createProject({ 'README.md': '' });
      projects.push(project);
      vi.stubEnv('XDG_CONFIG_HOME', path.join(project.dir, '.config'));
      const report = await run(project, new AbortController().signal, { models: [{ provider: 'openai', modelId: 'gpt-6-luna' }] });
      expect(report.checks.at(-1)).toMatchObject({
        id: 'model',
        status: 'fail',
        model: { provider: 'openai', modelId: 'gpt-6-luna' },
        login: 'openai',
        message: 'Cannot find package @ai-sdk/openai',
      });
    } finally {
      vi.doUnmock('../../src/oauth/chatgpt.ts');
    }
  });

  it('fails the model checks with the AI SDK load error, for an agent and for a named model', async () => {
    // A run with agent steps needs the optional package: a missing one fails every model check, like main does.
    aiSdkLoad.fail = new Error('Cannot find package ai');
    const project = createProject({
      'e2e.config.ts': `import { createFakeEngine, FAKE_APP } from '../../helpers/fake-engine.ts';
import { createScriptedInstance, scriptedResult } from '../../helpers/scripted-model.ts';
export default {
  tests: 'tests/**/*.e2e.ts',
  targets: [{ name: 'fake', platform: 'fake', engine: createFakeEngine({}).engine, app: FAKE_APP }],
  agents: { default: { model: createScriptedInstance('fake', 'scripted', async () => scriptedResult([{ type: 'text', text: 'OK' }], 'stop')) } },
};
`,
    });
    projects.push(project);
    vi.stubEnv('XDG_CONFIG_HOME', path.join(project.dir, '.config'));
    const report = await run(project, new AbortController().signal, { models: [{ provider: 'openai', modelId: 'gpt-6-luna' }] });
    const modelChecks = report.checks.filter((check) => check.id === 'model');
    expect(modelChecks).toHaveLength(2);
    expect(modelChecks[0]).toMatchObject({ status: 'fail', agent: 'default', message: 'Cannot find package ai' });
    expect(modelChecks[1]).toMatchObject({ status: 'fail', model: { modelId: 'gpt-6-luna' }, login: 'openai', message: 'Cannot find package ai' });
  });

  it('passes a named model whose provider key is set, without calling it', async () => {
    const project = createProject({ 'README.md': '' });
    projects.push(project);
    vi.stubEnv('XDG_CONFIG_HOME', path.join(project.dir, '.config'));
    vi.stubEnv('OPENCODE_API_KEY', 'test-key');
    const report = await run(project, new AbortController().signal, { models: [{ provider: 'opencode-console', modelId: 'deepseek-v4.1-flash' }] });
    expect(report.checks.at(-1)).toMatchObject({
      id: 'model',
      status: 'pass',
      login: 'opencode-console',
      model: { modelId: 'deepseek-v4.1-flash' },
      message: 'OPENCODE_API_KEY is set',
    });
  });

  it('calls a named model with --check-model when the login is stored, and passes when it answers', async () => {
    const project = createProject({ 'README.md': '' });
    projects.push(project);
    vi.stubEnv('XDG_CONFIG_HOME', path.join(project.dir, '.config'));
    vi.stubEnv('E2E_OAUTH_CREDENTIALS', JSON.stringify({ openai: { access: 'a', refresh: 'r', expires: Date.now() + 3_600_000 } }));
    const fetchMock = vi.fn(async (_input: unknown) =>
      new Response(
        JSON.stringify({
          id: 'resp_1',
          object: 'response',
          status: 'completed',
          output: [{ type: 'message', id: 'msg_1', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: '{"ok": true}', annotations: [] }] }],
          usage: { input_tokens: 4, output_tokens: 4, total_tokens: 8 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const report = await run(project, new AbortController().signal, { models: [{ provider: 'openai', modelId: 'gpt-6-luna' }], checkModel: true });
    const [call] = fetchMock.mock.calls[0] ?? [];
    expect(String(call instanceof Request ? call.url : call)).toContain('/responses');
    expect(report.checks.at(-1)).toMatchObject({ id: 'model', status: 'pass', login: 'openai', message: 'answered' });
  });
});
