import type { ResolvedOptions, SafeJsonOptions } from "./types.js";
import { isPlainObject } from "./utils/is-plain-object.js";
import { sortedKeys } from "./utils/stable-sort.js";

const DEFAULT_REDACT_KEYS = [
  "password",
  "pass",
  "pwd",
  "secret",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "cookie",
  "set-cookie",
  "apikey",
  "privatekey",
  "otp",
  "pin",
  "cardnumber",
  "cvv",
];

const DEFAULTS: ResolvedOptions = {
  redactKeys: DEFAULT_REDACT_KEYS,
  redactByPattern: [],
  replacement: "[REDACTED]",
  maxDepth: 6,
  maxArrayLength: 100,
  maxObjectKeys: 100,
  maxStringLength: 4000,
  includeErrorStack: false,
  stable: false,
  pretty: false,
  handleBigInt: "string",
  handleFunction: "omit",
  handleSymbol: "omit",
  onCircular: "placeholder",
};

export function resolveOptions(options?: SafeJsonOptions): ResolvedOptions {
  if (!options) return DEFAULTS;

  const userKeys = options.redactKeys?.map((k) => k.toLowerCase()) ?? [];
  const mergedKeys = [...DEFAULT_REDACT_KEYS, ...userKeys];

  return {
    redactKeys: mergedKeys,
    redactByPattern: options.redactByPattern ?? DEFAULTS.redactByPattern,
    replacement: options.replacement ?? DEFAULTS.replacement,
    maxDepth: options.maxDepth ?? DEFAULTS.maxDepth,
    maxArrayLength: options.maxArrayLength ?? DEFAULTS.maxArrayLength,
    maxObjectKeys: options.maxObjectKeys ?? DEFAULTS.maxObjectKeys,
    maxStringLength: options.maxStringLength ?? DEFAULTS.maxStringLength,
    includeErrorStack: options.includeErrorStack ?? DEFAULTS.includeErrorStack,
    stable: options.stable ?? DEFAULTS.stable,
    pretty: options.pretty ?? DEFAULTS.pretty,
    handleBigInt: options.handleBigInt ?? DEFAULTS.handleBigInt,
    handleFunction: options.handleFunction ?? DEFAULTS.handleFunction,
    handleSymbol: options.handleSymbol ?? DEFAULTS.handleSymbol,
    onCircular: options.onCircular ?? DEFAULTS.onCircular,
  };
}

function isRedactedKey(key: string, opts: ResolvedOptions): boolean {
  const lower = key.toLowerCase();
  if (opts.redactKeys.includes(lower)) return true;
  for (const pattern of opts.redactByPattern) {
    if (pattern.test(key)) return true;
  }
  return false;
}

function circularRef(
  opts: ResolvedOptions,
  seen: WeakMap<object, string>,
  obj: object
): string {
  if (opts.onCircular === "path") {
    return `[Circular: ${seen.get(obj) ?? "?"}]`;
  }
  return "[Circular]";
}

function serializeError(
  err: Error,
  opts: ResolvedOptions,
  seen: WeakMap<object, string>,
  depth: number,
  path: string
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    name: err.name,
    message: err.message,
  };

  if (opts.includeErrorStack && err.stack) {
    result["stack"] =
      err.stack.length > opts.maxStringLength
        ? err.stack.slice(0, opts.maxStringLength) + "...[Truncated]"
        : err.stack;
  }

  if (err.cause !== undefined) {
    result["cause"] = walk(err.cause, opts, seen, depth + 1, `${path}.cause`);
  }

  for (const key of Object.keys(err)) {
    if (key in result) continue;
    if (isRedactedKey(key, opts)) {
      result[key] = opts.replacement;
    } else {
      result[key] = walk(
        (err as unknown as Record<string, unknown>)[key],
        opts,
        seen,
        depth + 1,
        `${path}.${key}`
      );
    }
  }

  return result;
}

function walk(
  value: unknown,
  opts: ResolvedOptions,
  seen: WeakMap<object, string>,
  depth: number,
  path: string
): unknown {
  // primitives
  if (value === null) return null;
  if (value === undefined) return undefined;

  if (typeof value === "boolean" || typeof value === "number") return value;

  if (typeof value === "string") {
    if (value.length > opts.maxStringLength) {
      return value.slice(0, opts.maxStringLength) + "...[Truncated]";
    }
    return value;
  }

  if (typeof value === "bigint") {
    if (opts.handleBigInt === "redact") return opts.replacement;
    if (opts.handleBigInt === "number") return Number(value);
    return value.toString();
  }

  if (typeof value === "function") {
    if (opts.handleFunction === "omit") return undefined;
    if (opts.handleFunction === "name")
      return value.name ? `[Function: ${value.name}]` : "[Function]";
    return "[Function]";
  }

  if (typeof value === "symbol") {
    if (opts.handleSymbol === "omit") return undefined;
    if (opts.handleSymbol === "description")
      return value.description ?? "[Symbol]";
    return "[Symbol]";
  }

  // objects
  if (depth > opts.maxDepth) return "[MaxDepth]";

  if (value instanceof Date) return value.toISOString();

  if (value instanceof Error) {
    if (seen.has(value)) return circularRef(opts, seen, value);
    seen.set(value, path);
    const result = serializeError(value, opts, seen, depth, path);
    seen.delete(value);
    return result;
  }

  if (value instanceof Map) {
    if (seen.has(value)) return circularRef(opts, seen, value);
    seen.set(value, path);
    const obj: Record<string, unknown> = {};
    let keyCount = 0;
    for (const [k, v] of value) {
      if (keyCount >= opts.maxObjectKeys) break;
      const keyStr = String(k);
      obj[keyStr] = isRedactedKey(keyStr, opts)
        ? opts.replacement
        : walk(v, opts, seen, depth + 1, `${path}.${keyStr}`);
      keyCount++;
    }
    seen.delete(value);
    return obj;
  }

  if (value instanceof Set) {
    if (seen.has(value)) return circularRef(opts, seen, value);
    seen.set(value, path);
    const arr = [...value].slice(0, opts.maxArrayLength);
    const result = arr.map((v, i) => walk(v, opts, seen, depth + 1, `${path}[${i}]`));
    if (value.size > opts.maxArrayLength) {
      result.push(`[Truncated ${value.size - opts.maxArrayLength} more items]`);
    }
    seen.delete(value);
    return result;
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) return circularRef(opts, seen, value);
    seen.set(value, path);
    const slice = value.slice(0, opts.maxArrayLength);
    const result = slice.map((v, i) => walk(v, opts, seen, depth + 1, `${path}[${i}]`));
    if (value.length > opts.maxArrayLength) {
      result.push(`[Truncated ${value.length - opts.maxArrayLength} more items]`);
    }
    seen.delete(value);
    return result;
  }

  if (isPlainObject(value)) {
    if (seen.has(value)) return circularRef(opts, seen, value);
    seen.set(value, path);

    const keys = opts.stable ? sortedKeys(value) : Object.keys(value);
    const result: Record<string, unknown> = {};
    let keyCount = 0;

    for (const key of keys) {
      if (keyCount >= opts.maxObjectKeys) break;
      if (isRedactedKey(key, opts)) {
        result[key] = opts.replacement;
      } else {
        const walked = walk(value[key], opts, seen, depth + 1, `${path}.${key}`);
        if (walked !== undefined) {
          result[key] = walked;
        }
      }
      keyCount++;
    }

    seen.delete(value);
    return result;
  }

  // non-plain objects (class instances) — treat as plain, extract own enumerable keys
  if (typeof value === "object") {
    if (seen.has(value as object)) return circularRef(opts, seen, value as object);
    seen.set(value as object, path);

    const keys = opts.stable
      ? Object.keys(value as object).sort()
      : Object.keys(value as object);
    const result: Record<string, unknown> = {};
    let keyCount = 0;

    for (const key of keys) {
      if (keyCount >= opts.maxObjectKeys) break;
      if (isRedactedKey(key, opts)) {
        result[key] = opts.replacement;
      } else {
        const walked = walk(
          (value as Record<string, unknown>)[key],
          opts,
          seen,
          depth + 1,
          `${path}.${key}`
        );
        if (walked !== undefined) {
          result[key] = walked;
        }
      }
      keyCount++;
    }

    seen.delete(value as object);
    return result;
  }

  return value;
}

export function safeCloneResolved(value: unknown, opts: ResolvedOptions): unknown {
  const seen = new WeakMap<object, string>();
  return walk(value, opts, seen, 0, "$");
}

export function safeClone(value: unknown, options?: SafeJsonOptions): unknown {
  return safeCloneResolved(value, resolveOptions(options));
}
