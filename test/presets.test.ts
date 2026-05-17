import { describe, it, expect } from "vitest";
import { safeClone, presets, createSafeJson } from "../src/index.js";

describe("presets", () => {
  describe("log preset", () => {
    it("redacts secrets", () => {
      const result = safeClone({ token: "abc", name: "bob" }, presets.log) as Record<string, unknown>;
      expect(result["token"]).toBe("[REDACTED]");
      expect(result["name"]).toBe("bob");
    });

    it("uses tight bounds", () => {
      expect(presets.log.maxDepth).toBe(5);
      expect(presets.log.maxArrayLength).toBe(50);
      expect(presets.log.maxStringLength).toBe(2000);
    });

    it("excludes error stack", () => {
      const err = new Error("x");
      const result = safeClone(err, presets.log) as Record<string, unknown>;
      expect(result["stack"]).toBeUndefined();
    });
  });

  describe("debug preset", () => {
    it("includes error stack", () => {
      const err = new Error("debug error");
      const result = safeClone(err, presets.debug) as Record<string, unknown>;
      expect(typeof result["stack"]).toBe("string");
    });

    it("allows larger bounds", () => {
      expect(presets.debug.maxDepth).toBe(8);
      expect(presets.debug.maxArrayLength).toBe(200);
    });
  });

  describe("http preset", () => {
    it("redacts authorization header", () => {
      const result = safeClone(
        { authorization: "Bearer token", body: "ok" },
        presets.http
      ) as Record<string, unknown>;
      expect(result["authorization"]).toBe("[REDACTED]");
      expect(result["body"]).toBe("ok");
    });

    it("redacts cookie", () => {
      const result = safeClone({ cookie: "session=abc" }, presets.http) as Record<string, unknown>;
      expect(result["cookie"]).toBe("[REDACTED]");
    });
  });

  describe("audit preset", () => {
    it("produces stable output", () => {
      const obj1 = { b: 2, a: 1 };
      const obj2 = { a: 1, b: 2 };
      const r1 = safeClone(obj1, presets.audit) as object;
      const r2 = safeClone(obj2, presets.audit) as object;
      expect(Object.keys(r1)).toEqual(["a", "b"]);
      expect(Object.keys(r2)).toEqual(["a", "b"]);
    });

    it("excludes stack", () => {
      const err = new Error("audit");
      const result = safeClone(err, presets.audit) as Record<string, unknown>;
      expect(result["stack"]).toBeUndefined();
    });
  });
});

describe("createSafeJson factory", () => {
  it("applies base options", () => {
    const safeJson = createSafeJson({ redactKeys: ["email"] });
    const result = safeJson.clone({ email: "x@y.com", name: "bob" }) as Record<string, unknown>;
    expect(result["email"]).toBe("[REDACTED]");
  });

  it("forLog applies log preset", () => {
    const safeJson = createSafeJson();
    const result = safeJson.forLog({ token: "abc", name: "bob" }) as Record<string, unknown>;
    expect(result["token"]).toBe("[REDACTED]");
  });

  it("forDebug includes error stack", () => {
    const safeJson = createSafeJson();
    const result = safeJson.forDebug(new Error("test")) as Record<string, unknown>;
    expect(typeof result["stack"]).toBe("string");
  });

  it("forHttp redacts authorization", () => {
    const safeJson = createSafeJson();
    const result = safeJson.forHttp({ authorization: "Bearer x", ok: true }) as Record<string, unknown>;
    expect(result["authorization"]).toBe("[REDACTED]");
  });

  it("forAudit produces stable output", () => {
    const safeJson = createSafeJson();
    const result = safeJson.forAudit({ z: 1, a: 2 }) as object;
    expect(Object.keys(result)).toEqual(["a", "z"]);
  });

  it("stringify returns valid JSON string", () => {
    const safeJson = createSafeJson();
    const result = safeJson.stringify({ a: 1 });
    expect(result).toBe('{"a":1}');
  });

  it("merges base redactKeys with override keys", () => {
    const safeJson = createSafeJson({ redactKeys: ["email"] });
    const result = safeJson.clone(
      { email: "x@y.com", phone: "123", name: "bob" },
      { redactKeys: ["phone"] }
    ) as Record<string, unknown>;
    expect(result["email"]).toBe("[REDACTED]");
    expect(result["phone"]).toBe("[REDACTED]");
    expect(result["name"]).toBe("bob");
  });
});
