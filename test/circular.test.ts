import { describe, it, expect } from "vitest";
import { safeClone, safeStringify } from "../src/index.js";

describe("circular reference handling", () => {
  it("replaces direct circular ref with [Circular]", () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj["self"] = obj;
    const result = safeClone(obj) as Record<string, unknown>;
    expect(result["self"]).toBe("[Circular]");
    expect(result["a"]).toBe(1);
  });

  it("replaces indirect circular ref", () => {
    const a: Record<string, unknown> = { name: "a" };
    const b: Record<string, unknown> = { name: "b", parent: a };
    a["child"] = b;
    const result = safeClone(a) as Record<string, unknown>;
    expect((result["child"] as Record<string, unknown>)["parent"]).toBe("[Circular]");
  });

  it("handles circular in array", () => {
    const arr: unknown[] = [1, 2];
    arr.push(arr);
    const result = safeClone(arr) as unknown[];
    expect(result[2]).toBe("[Circular]");
  });

  it("does not throw on circular", () => {
    const obj: Record<string, unknown> = {};
    obj["self"] = obj;
    expect(() => safeStringify(obj)).not.toThrow();
  });

  it("handles Map with circular value", () => {
    const map = new Map<string, unknown>();
    map.set("self", map);
    const result = safeClone(map) as Record<string, unknown>;
    expect(result["self"]).toBe("[Circular]");
  });

  it("handles Set with circular value", () => {
    const inner: Record<string, unknown> = { x: 1 };
    const set = new Set([inner]);
    inner["set"] = set;
    const result = safeClone({ set }) as Record<string, unknown>;
    const setArr = result["set"] as unknown[];
    const innerResult = setArr[0] as Record<string, unknown>;
    expect(innerResult["set"]).toBe("[Circular]");
  });
});
