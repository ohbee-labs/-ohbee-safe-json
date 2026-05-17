import { describe, it, expect } from "vitest";
import { safeClone } from "../src/index.js";

describe("depth limit", () => {
  it("truncates at maxDepth", () => {
    const deep = { a: { b: { c: { d: { e: { f: "deep" } } } } } };
    const result = safeClone(deep, { maxDepth: 3 }) as Record<string, unknown>;
    const a = result["a"] as Record<string, unknown>;
    const b = a["b"] as Record<string, unknown>;
    const c = b["c"] as Record<string, unknown>;
    expect(c["d"]).toBe("[MaxDepth]");
  });

  it("does not truncate within maxDepth", () => {
    const obj = { a: { b: "ok" } };
    const result = safeClone(obj, { maxDepth: 5 }) as Record<string, unknown>;
    expect((result["a"] as Record<string, unknown>)["b"]).toBe("ok");
  });
});

describe("array length limit", () => {
  it("truncates long arrays", () => {
    const arr = Array.from({ length: 200 }, (_, i) => i);
    const result = safeClone(arr, { maxArrayLength: 10 }) as unknown[];
    expect(result).toHaveLength(11); // 10 items + sentinel
    expect(result[10]).toBe("[Truncated 190 more items]");
  });

  it("does not truncate arrays within limit", () => {
    const arr = [1, 2, 3];
    const result = safeClone(arr, { maxArrayLength: 10 }) as unknown[];
    expect(result).toHaveLength(3);
  });

  it("truncates Set as array", () => {
    const set = new Set(Array.from({ length: 20 }, (_, i) => i));
    const result = safeClone(set, { maxArrayLength: 5 }) as unknown[];
    expect(result).toHaveLength(6);
    expect(result[5]).toBe("[Truncated 15 more items]");
  });
});

describe("string length limit", () => {
  it("truncates long strings", () => {
    const long = "x".repeat(5000);
    const result = safeClone(long, { maxStringLength: 100 }) as string;
    expect(result.startsWith("x".repeat(100))).toBe(true);
    expect(result.endsWith("...[Truncated]")).toBe(true);
  });

  it("does not truncate strings within limit", () => {
    const result = safeClone("hello", { maxStringLength: 100 }) as string;
    expect(result).toBe("hello");
  });
});

describe("object key limit", () => {
  it("limits number of keys", () => {
    const obj: Record<string, number> = {};
    for (let i = 0; i < 20; i++) obj[`key${i}`] = i;
    const result = safeClone(obj, { maxObjectKeys: 5 }) as Record<string, unknown>;
    expect(Object.keys(result)).toHaveLength(5);
  });
});

describe("special type handling", () => {
  it("converts Date to ISO string", () => {
    const d = new Date("2024-01-01T00:00:00.000Z");
    const result = safeClone(d);
    expect(result).toBe("2024-01-01T00:00:00.000Z");
  });

  it("converts BigInt to string by default", () => {
    const result = safeClone(9007199254740993n);
    expect(result).toBe("9007199254740993");
  });

  it("converts BigInt to number when handleBigInt: number", () => {
    const result = safeClone(BigInt(42), { handleBigInt: "number" });
    expect(result).toBe(42);
  });

  it("redacts BigInt when handleBigInt: redact", () => {
    const result = safeClone(BigInt(42), { handleBigInt: "redact" });
    expect(result).toBe("[REDACTED]");
  });

  it("omits functions by default", () => {
    const obj = { fn: () => "hello", name: "bob" };
    const result = safeClone(obj) as Record<string, unknown>;
    expect("fn" in result).toBe(false);
    expect(result["name"]).toBe("bob");
  });

  it("converts function to name placeholder", () => {
    function myFunc() { return 1; }
    const result = safeClone(myFunc, { handleFunction: "name" });
    expect(result).toBe("[Function: myFunc]");
  });

  it("omits symbols by default", () => {
    const sym = Symbol("test");
    const obj = { [sym]: "hidden", name: "visible" };
    const result = safeClone(obj) as Record<string, unknown>;
    expect(result["name"]).toBe("visible");
    // symbol keys not enumerable via Object.keys — won't appear
    expect(Object.getOwnPropertySymbols(result)).toHaveLength(0);
  });

  it("converts Map to object", () => {
    const map = new Map([["key", "value"], ["num", 42]]);
    const result = safeClone(map) as Record<string, unknown>;
    expect(result["key"]).toBe("value");
    expect(result["num"]).toBe(42);
  });

  it("converts Set to array", () => {
    const set = new Set([1, 2, 3]);
    const result = safeClone(set) as unknown[];
    expect(result).toEqual([1, 2, 3]);
  });

  it("omits undefined values like native JSON", () => {
    const result = safeClone({ a: 1, b: undefined }) as Record<string, unknown>;
    expect("b" in result).toBe(false);
  });

  it("preserves null", () => {
    const result = safeClone({ a: null }) as Record<string, unknown>;
    expect(result["a"]).toBeNull();
  });
});
