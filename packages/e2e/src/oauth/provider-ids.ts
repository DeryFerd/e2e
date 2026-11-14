import type { ProviderId } from './providers.ts';

export type { ProviderId };

/** The built-in provider ids. Apart from the providers so the CLI lists them without constructing each one. */
export const PROVIDER_IDS = ['openai', 'github-copilot', 'opencode-console', 'spacexsi'] as const satisfies readonly ProviderId[];

const PROVIDER_ALIASES: ReadonlyMap<string, ProviderId> = new Map([
  ['spacexai', 'spacexsi'],
  ['grok', 'spacexsi'],
]);

export const PROVIDER_NAMES: readonly string[] = [...PROVIDER_IDS, ...PROVIDER_ALIASES.keys()];

export function canonicalProviderId(id: string): string {
  return PROVIDER_ALIASES.get(id) ?? id;
}

/**
 * Whether `id` names a built-in provider. Beside the ids, not the providers,
 * so a parser that types a value in does not load the providers (and their
 * zod) into the CLI's boot graph.
 */
export function isProviderId(id: string): id is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(id);
}
