declare global {
  var config: Record<string, string | undefined> | undefined;
}

export const env: Record<string, string> = { ...import.meta.env, ...globalThis.config };
