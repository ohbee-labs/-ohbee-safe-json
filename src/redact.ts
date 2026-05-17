import type { SafeJsonOptions } from "./types.js";
import { safeClone } from "./safe-clone.js";

export type RedactOptions = {
  keys?: string[];
  pattern?: RegExp[];
  replacement?: string;
};

export function redact(value: unknown, options?: RedactOptions): unknown {
  const opts: SafeJsonOptions = {};
  if (options?.keys !== undefined) opts.redactKeys = options.keys;
  if (options?.pattern !== undefined) opts.redactByPattern = options.pattern;
  if (options?.replacement !== undefined) opts.replacement = options.replacement;
  return safeClone(value, opts);
}
