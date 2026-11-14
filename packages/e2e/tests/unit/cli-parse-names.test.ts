/**
 * `--model` parsing, in process: what `e2e doctor` is handed, without running it.
 */

import { describe, expect, it } from 'vitest';
import { parseModelNames, parseNames } from '../../src/cli/parse-names.ts';

describe('parseModelNames', () => {
  it('reads a comma-separated list into provider and model id pairs', () => {
    expect(parseModelNames('openai/gpt-6-luna,spacexsi/grok-4')).toEqual([
      { provider: 'openai', modelId: 'gpt-6-luna' },
      { provider: 'spacexsi', modelId: 'grok-4' },
    ]);
  });

  it('stores an alias as the provider it stands for', () => {
    expect(parseModelNames('spacexai/grok-4,grok/grok-5')).toEqual([
      { provider: 'spacexsi', modelId: 'grok-4' },
      { provider: 'spacexsi', modelId: 'grok-5' },
    ]);
  });

  it('adds repeated flags to the list, dropping a model named twice', () => {
    const once = parseModelNames('openai/gpt-6-luna');
    expect(parseModelNames('opencode-console/deepseek-v4.1-flash,openai/gpt-6-luna', once)).toEqual([
      { provider: 'openai', modelId: 'gpt-6-luna' },
      { provider: 'opencode-console', modelId: 'deepseek-v4.1-flash' },
    ]);
    expect(parseModelNames('openai/gpt-6-luna', once)).toEqual([{ provider: 'openai', modelId: 'gpt-6-luna' }]);
  });

  it('keeps one model id per provider, so the same id on another provider stays', () => {
    expect(parseModelNames('openai/shared,github-copilot/shared')).toEqual([
      { provider: 'openai', modelId: 'shared' },
      { provider: 'github-copilot', modelId: 'shared' },
    ]);
  });

  it.each(['bogus', 'other/gpt-6', 'openai/', '/gpt-6'])('refuses %s with the provider list', (value) => {
    expect(() => parseModelNames(value)).toThrow(
      expect.objectContaining({
        message: `must be <provider>/<model-id> with provider one of openai, github-copilot, opencode-console, spacexsi, spacexai, grok, e.g. openai/gpt-6-luna`,
      }),
    );
  });

  it('refuses an empty value rather than answering an empty list', () => {
    expect(() => parseModelNames(' , ')).toThrow(expect.objectContaining({ message: 'must name at least one model' }));
  });
});

describe('parseNames', () => {
  it('still reads plain names, comma-separated or repeated, each once', () => {
    expect(parseNames('tag')('smoke, slow', ['fast', 'smoke'])).toEqual(['fast', 'smoke', 'slow']);
  });
});
