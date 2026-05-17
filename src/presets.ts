import type { SafeJsonOptions } from "./types.js";

export const presets = {
  log: {
    maxDepth: 5,
    maxArrayLength: 50,
    maxStringLength: 2000,
    includeErrorStack: false,
    stable: false,
  } satisfies SafeJsonOptions,

  debug: {
    maxDepth: 8,
    maxArrayLength: 200,
    maxStringLength: 8000,
    includeErrorStack: true,
    stable: false,
  } satisfies SafeJsonOptions,

  http: {
    maxDepth: 5,
    maxArrayLength: 50,
    maxStringLength: 2000,
    includeErrorStack: false,
    stable: false,
    redactKeys: ["headers", "cookie", "set-cookie", "authorization"],
  } satisfies SafeJsonOptions,

  audit: {
    maxDepth: 5,
    maxArrayLength: 100,
    maxStringLength: 4000,
    includeErrorStack: false,
    stable: true,
  } satisfies SafeJsonOptions,
} as const;
