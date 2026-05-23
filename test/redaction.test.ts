import { describe, it, expect } from "vitest";
import { safeClone, redact } from "../src/index.js";

describe("redaction", () => {
  it("redacts default sensitive keys", () => {
    const user = {
      id: "u_1",
      email: "john@example.com",
      password: "s3cr3t",
      token: "abc123",
    };
    const result = safeClone(user) as typeof user;
    expect(result.id).toBe("u_1");
    expect(result.email).toBe("john@example.com");
    expect(result.password).toBe("[REDACTED]");
    expect(result.token).toBe("[REDACTED]");
  });

  it("redacts all default keys", () => {
    const payload = {
      password: "x", pass: "x", pwd: "x",
      secret: "x", token: "x", accessToken: "x", refreshToken: "x",
      authorization: "x", cookie: "x", "set-cookie": "x",
      apiKey: "x", privateKey: "x", otp: "x", pin: "x",
      cardNumber: "x", cvv: "x",
    };
    const result = safeClone(payload) as Record<string, unknown>;
    for (const key of Object.keys(payload)) {
      expect(result[key]).toBe("[REDACTED]");
    }
  });

  it("is case-insensitive for key matching", () => {
    const result = safeClone({
      Authorization: "Bearer abc",
      PASSWORD: "secret",
      Token: "tok",
    }) as Record<string, unknown>;
    expect(result["Authorization"]).toBe("[REDACTED]");
    expect(result["PASSWORD"]).toBe("[REDACTED]");
    expect(result["Token"]).toBe("[REDACTED]");
  });

  it("merges custom keys with defaults", () => {
    const result = safeClone(
      { email: "a@b.com", password: "x", phone: "123" },
      { redactKeys: ["email", "phone"] }
    ) as Record<string, unknown>;
    expect(result["email"]).toBe("[REDACTED]");
    expect(result["phone"]).toBe("[REDACTED]");
    expect(result["password"]).toBe("[REDACTED]"); // still default
  });

  it("redacts nested keys", () => {
    const obj = { user: { password: "x", name: "john" } };
    const result = safeClone(obj) as { user: Record<string, unknown> };
    expect(result.user["password"]).toBe("[REDACTED]");
    expect(result.user["name"]).toBe("john");
  });

  it("uses custom replacement string", () => {
    const result = safeClone(
      { password: "x" },
      { replacement: "***" }
    ) as Record<string, unknown>;
    expect(result["password"]).toBe("***");
  });

  it("redacts by RegExp pattern", () => {
    const result = safeClone(
      { x_secret_key: "abc", normalField: "ok" },
      { redactByPattern: [/secret/i] }
    ) as Record<string, unknown>;
    expect(result["x_secret_key"]).toBe("[REDACTED]");
    expect(result["normalField"]).toBe("ok");
  });

  it("redacts repeated keys with stateful RegExp patterns", () => {
    const result = safeClone(
      { secret1: "abc", secret2: "def" },
      { redactByPattern: [/secret/g] }
    ) as Record<string, unknown>;
    expect(result["secret1"]).toBe("[REDACTED]");
    expect(result["secret2"]).toBe("[REDACTED]");
  });

  it("redact() wrapper works", () => {
    const result = redact({ password: "x", name: "bob" }, { keys: ["name"] }) as Record<string, unknown>;
    expect(result["name"]).toBe("[REDACTED]");
    expect(result["password"]).toBe("[REDACTED]"); // default still applies
  });

  it("redacts Map keys", () => {
    const map = new Map([["token", "abc"], ["name", "bob"]]);
    const result = safeClone(map) as Record<string, unknown>;
    expect(result["token"]).toBe("[REDACTED]");
    expect(result["name"]).toBe("bob");
  });
});
