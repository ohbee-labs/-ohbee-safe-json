import type { SafeJsonOptions } from "./types.js";
import { resolveOptions, safeCloneResolved } from "./safe-clone.js";

export function safeStringify(value: unknown, options?: SafeJsonOptions): string {
  const opts = resolveOptions(options);
  const cloned = safeCloneResolved(value, opts);
  const indent = opts.pretty === true ? 2 : opts.pretty === false ? undefined : opts.pretty;
  return JSON.stringify(cloned, null, indent) ?? "undefined";
}
