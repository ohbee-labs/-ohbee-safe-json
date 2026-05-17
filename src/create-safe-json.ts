import type { SafeJsonOptions, SafeJsonInstance } from "./types.js";
import { safeClone } from "./safe-clone.js";
import { safeStringify } from "./safe-stringify.js";
import { presets } from "./presets.js";

export function createSafeJson(base: SafeJsonOptions = {}): SafeJsonInstance {
  function merge(overrides?: SafeJsonOptions): SafeJsonOptions {
    if (!overrides) return base;
    const mergedKeys = [
      ...(base.redactKeys ?? []),
      ...(overrides.redactKeys ?? []),
    ];
    const mergedPatterns = [
      ...(base.redactByPattern ?? []),
      ...(overrides.redactByPattern ?? []),
    ];
    return {
      ...base,
      ...overrides,
      redactKeys: mergedKeys.length > 0 ? mergedKeys : undefined,
      redactByPattern: mergedPatterns.length > 0 ? mergedPatterns : undefined,
    };
  }

  return {
    stringify(value, overrides) {
      return safeStringify(value, merge(overrides));
    },
    clone(value, overrides) {
      return safeClone(value, merge(overrides));
    },
    forLog(value) {
      return safeClone(value, merge(presets.log));
    },
    forDebug(value) {
      return safeClone(value, merge(presets.debug));
    },
    forHttp(value) {
      return safeClone(value, merge(presets.http));
    },
    forAudit(value) {
      return safeClone(value, merge(presets.audit));
    },
  };
}
