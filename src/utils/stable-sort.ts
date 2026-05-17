export function sortedKeys(obj: Record<string, unknown>): string[] {
  return Object.keys(obj).sort();
}
