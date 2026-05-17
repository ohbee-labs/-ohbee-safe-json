import type { SafeJsonOptions } from "./types.js";
import { safeClone } from "./safe-clone.js";

export type RedactOptions = {
  keys?: string[];
  pattern?: RegExp[];
  replacement?: string;
};

export function redact(value: unknown, options?: RedactOptions): unknown {
  const opts: SafeJsonOptions = {
    redactKeys: options?.keys,
    redactByPattern: options?.pattern,
    replacement: options?.replacement,
  };
  return safeClone(value, opts);
}
