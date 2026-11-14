/** Comma-separated flag values, shared by the commands that take them. */

import { InvalidArgumentError } from 'commander';
import { canonicalProviderId, isProviderId, PROVIDER_NAMES, type ProviderId } from '../oauth/provider-ids.ts';

/** The non-empty items of a comma-separated value, trimmed. */
export function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

/**
 * Names, comma-separated or repeated, each once. An empty value is a usage
 * error rather than an empty list: `--tag "$TAGS"` with the variable unset
 * must not select every test, and `--target ''` must not select every target.
 */
export function parseNames(noun: string): (value: string, previous?: string[]) => string[] {
  return (value, previous = []) => {
    const names = parseList(value);
    if (names.length === 0) throw new InvalidArgumentError(`must name at least one ${noun}`);
    return [...new Set([...previous, ...names])];
  };
}

/** A model `--model` names: an id a provider `e2e login` stores. */
export interface NamedModel {
  readonly provider: ProviderId;
  readonly modelId: string;
}

/**
 * Models `--model` names, comma-separated or repeated, each
 * `<provider>/<model-id>` for a provider `e2e login` stores, each once, an
 * alias stored as the provider it stands for. A malformed value fails here,
 * while the command line is read, the way `--workers abc` does, so
 * `doctor()` only ever sees typed names.
 */
export function parseModelNames(value: string, previous: NamedModel[] = []): NamedModel[] {
  const names = parseList(value);
  if (names.length === 0) throw new InvalidArgumentError('must name at least one model');
  const parsed = names.map((name) => {
    const slash = name.indexOf('/');
    const provider = canonicalProviderId(slash === -1 ? '' : name.slice(0, slash));
    const modelId = slash === -1 ? '' : name.slice(slash + 1);
    if (!isProviderId(provider) || modelId === '') {
      throw new InvalidArgumentError(`must be <provider>/<model-id> with provider one of ${PROVIDER_NAMES.join(', ')}, e.g. openai/gpt-6-luna`);
    }
    return { provider, modelId };
  });
  return [...new Map([...previous, ...parsed].map((model) => [`${model.provider}/${model.modelId}`, model])).values()];
}
