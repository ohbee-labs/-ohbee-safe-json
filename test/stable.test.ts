import { describe, it, expect } from "vitest";
import { safeClone, safeStringify } from "../src/index.js";

describe("stable key ordering", () => {
  it("sorts keys alphabetically when stable: true", () => {
    const obj = { z: 1, a: 2, m: 3 };
    const result = safeClone(obj, { stable: true }) as object;
    expect(Object.keys(result)).toEqual(["a", "m", "z"]);
  });

  it("preserves insertion order when stable: false", () => {
    const obj = { z: 1, a: 2, m: 3 };
    const result = safeClone(obj, { stable: false }) as object;
    expect(Object.keys(result)).toEqual(["z", "a", "m"]);
  });

  it("produces deterministic string output with stable: true", () => {
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };
    const s1 = safeStringify(obj1, { stable: true });
    const s2 = safeStringify(obj2, { stable: true });
    expect(s1).toBe(s2);
  });

  it("sorts nested object keys when stable: true", () => {
    const obj = { outer: { z: 3, a: 1, m: 2 } };
    const result = safeClone(obj, { stable: true }) as Record<string, object>;
    expect(Object.keys(result["outer"]!)).toEqual(["a", "m", "z"]);
  });
});
