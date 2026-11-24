import type { TestProject } from 'vitest/node';

/**
 * Loads the real `@/services/APIs` once, before any test worker starts, and provides the names of
 * its services and their methods to `apiMock`, which refuses names that do not exist.
 */
export default async function setup(project: TestProject): Promise<void> {
  const { default: api } = (await import('@/services/APIs')) as { default: Record<string, Record<string, unknown>> };
  const manifest: Record<string, string[]> = {};
  for (const [service, value] of Object.entries(api)) {
    if (value && typeof value === 'object') {
      const proto = Object.getPrototypeOf(value);
      const own = Object.getOwnPropertyNames(value);
      const inherited = proto && proto !== Object.prototype ? Object.getOwnPropertyNames(proto) : [];
      manifest[service] = [...new Set([...own, ...inherited])].filter(
        (name) => name !== 'constructor' && typeof (value as Record<string, unknown>)[name] === 'function',
      );
    }
  }
  project.provide('apiManifest', manifest);
}
