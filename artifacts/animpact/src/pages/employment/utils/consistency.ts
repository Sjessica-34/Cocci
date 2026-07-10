export interface ConsistencyCheck {
  /** Sum of the detail fields to compare against the reference total. */
  sum: number | null;
  /** Reference total (usually the total headcount). */
  total: number | null | undefined;
  /** Human-readable label of the group being checked, used in the warning message. */
  label: string;
  /** Label of the reference total, used in the warning message (defaults to "l'effectif total"). */
  totalLabel?: string;
}

/**
 * Sums a list of optional numeric fields, ignoring null/undefined values.
 * Returns null if every value is null/undefined (nothing entered yet).
 */
export function sumFields(values: Array<number | null | undefined>): number | null {
  const provided = values.filter((v): v is number => v != null && !Number.isNaN(v));
  if (provided.length === 0) return null;
  return provided.reduce((acc, v) => acc + v, 0);
}

/**
 * Compares a group sum against a reference total (e.g. total headcount) and returns
 * a warning message when the sum exceeds the total. Returns null when everything is
 * consistent or when there isn't enough data to compare.
 */
export function checkNotExceeding({ sum, total, label, totalLabel }: ConsistencyCheck): string | null {
  if (sum == null || total == null) return null;
  if (sum > total) {
    return `${label} (${sum}) dépasse ${totalLabel ?? "l'effectif total"} (${total}).`;
  }
  return null;
}
