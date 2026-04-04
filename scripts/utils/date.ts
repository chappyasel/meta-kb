/** Parse a date string to YYYY-MM-DD, falling back to today. */
export function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString().split("T")[0]!;
  try {
    return new Date(raw).toISOString().split("T")[0]!;
  } catch {
    return new Date().toISOString().split("T")[0]!;
  }
}
