import type { StaticLov } from '@/services/lov.service';

/** A dropdown option projected from a LOV row: the code as the value, the description as the label. */
export interface ValueTextOption {
  value: string;
  text: string;
}

/**
 * Maps static LOV rows to `{ value, text }` dropdown options: drops rows without a code and falls
 * back to the code when a row has no description. Shared by the simple (code + description) LOV
 * dropdowns; richer projections (e.g. appointment types carrying extra attributes) map their own.
 */
export function toValueTextOptions(items: StaticLov[]): ValueTextOption[] {
  return items
    .filter((item) => item.code)
    .map((item) => ({
      value: String(item.code ?? ''),
      text: String(item.description ?? item.code ?? ''),
    }));
}
