import { describe, it, expect } from "vitest";
import { safeClone } from "../src/index.js";

describe("Error serialization", () => {
  it("serializes basic Error", () => {
    const err = new Error("Something went wrong");
    const result = safeClone(err) as Record<string, unknown>;
    expect(result["name"]).toBe("Error");
    expect(result["message"]).toBe("Something went wrong");
  });

  it("excludes stack by default", () => {
    const err = new Error("x");
    const result = safeClone(err) as Record<string, unknown>;
    expect(result["stack"]).toBeUndefined();
  });

  it("includes stack when includeErrorStack: true", () => {
    const err = new Error("x");
    const result = safeClone(err, { includeErrorStack: true }) as Record<string, unknown>;
    expect(typeof result["stack"]).toBe("string");
    expect((result["stack"] as string).length).toBeGreaterThan(0);
  });

  it("serializes Error subclass with name", () => {
    class PaymentError extends Error {
      code: string;
      constructor(msg: string, code: string) {
        super(msg);
        this.name = "PaymentError";
        this.code = code;
      }
    }
    const err = new PaymentError("Payment failed", "PAYMENT_FAILED");
    const result = safeClone(err) as Record<string, unknown>;
    expect(result["name"]).toBe("PaymentError");
    expect(result["message"]).toBe("Payment failed");
    expect(result["code"]).toBe("PAYMENT_FAILED");
  });

  it("serializes Error cause", () => {
    const cause = new Error("Root cause");
    const err = new Error("Outer", { cause });
    const result = safeClone(err) as Record<string, unknown>;
    const causeResult = result["cause"] as Record<string, unknown>;
    expect(causeResult["message"]).toBe("Root cause");
  });

  it("does not return {} like native JSON.stringify", () => {
    const err = new Error("test");
    const native = JSON.stringify(err);
    const safe = safeClone(err) as Record<string, unknown>;
    expect(native).toBe("{}");
    expect(safe["message"]).toBe("test");
  });

  it("handles Error with custom enumerable fields", () => {
    const err = new Error("x") as Error & { requestId: string };
    err.requestId = "req_123";
    const result = safeClone(err) as Record<string, unknown>;
    expect(result["requestId"]).toBe("req_123");
  });

  it("redacts sensitive fields on Error", () => {
    const err = new Error("x") as Error & { token: string };
    err.token = "secret";
    const result = safeClone(err) as Record<string, unknown>;
    expect(result["token"]).toBe("[REDACTED]");
  });
});
