# @ohbee/safe-json

`JSON.stringify()` is fine for data.

It is not fine for production logs.

`@ohbee/safe-json` safely serializes unknown JavaScript values by redacting secrets, handling circular references, limiting output size, and preserving useful error information.

```ts
import { safeClone } from "@ohbee/safe-json";

logger.error("Checkout failed", {
  error: safeClone(error),
  payload: safeClone(req.body),
});
```

---

## Why

| Problem with `JSON.stringify` | This library |
|---|---|
| Leaks `password`, `token`, `authorization` | Auto-redacts 16 sensitive keys by default |
| Throws on circular references | Detects and replaces with `[Circular]` |
| `new Error("x")` serializes as `{}` | Captures `name`, `message`, `cause`, custom fields |
| 50 MB payloads in logs | Bounds depth, array length, string length |
| Non-deterministic key order | Optional stable sort for diffs and snapshots |
| Everyone redacts differently | Shared presets: `log`, `debug`, `http`, `audit` |

---

## Install

```sh
npm install @ohbee/safe-json
```

---

## Quick start

```ts
import { safeClone, safeStringify, presets, createSafeJson } from "@ohbee/safe-json";

// clone to a safe plain object (use when your logger stringifies internally)
logger.info({ payload: safeClone(req.body) });

// or stringify directly
const line = safeStringify(req.body);

// use a preset
logger.error({ error: safeClone(err, presets.debug) });

// define policy once, reuse everywhere
const safeJson = createSafeJson({
  redactKeys: ["email", "phone"],
  maxDepth: 5,
});

safeJson.forLog(payload);
safeJson.forDebug(error);
safeJson.forHttp(req.headers);
safeJson.forAudit(record);
```

---

## Default redacted keys

These are masked by default (case-insensitive):

`password` · `pass` · `pwd` · `secret` · `token` · `accessToken` · `refreshToken` · `authorization` · `cookie` · `set-cookie` · `apiKey` · `privateKey` · `otp` · `pin` · `cardNumber` · `cvv`

Add more without removing defaults:

```ts
safeClone(payload, { redactKeys: ["email", "phone"] });
// defaults are still active
```

Redact by pattern:

```ts
safeClone(payload, { redactByPattern: [/secret/i, /internal/i] });
```

---

## Options

```ts
type SafeJsonOptions = {
  // Redaction
  redactKeys?: string[];          // merged with defaults (case-insensitive)
  redactByPattern?: RegExp[];     // redact keys matching a pattern
  replacement?: string;           // default: "[REDACTED]"

  // Bounds
  maxDepth?: number;              // default: 6
  maxArrayLength?: number;        // default: 100
  maxObjectKeys?: number;         // default: 100
  maxStringLength?: number;       // default: 4000

  // Error
  includeErrorStack?: boolean;    // default: false

  // Output
  stable?: boolean;               // sort keys alphabetically, default: false
  pretty?: boolean | number;      // indent spaces, default: false

  // Special types
  handleBigInt?: "string" | "number" | "redact";          // default: "string"
  handleFunction?: "omit" | "name" | "placeholder";       // default: "omit"
  handleSymbol?: "omit" | "description" | "placeholder";  // default: "omit"
  onCircular?: "placeholder" | "path";                    // default: "placeholder"
};
```

---

## Presets

Composable plain objects:

```ts
import { presets } from "@ohbee/safe-json";

safeClone(value, presets.log);
safeClone(value, presets.debug);
safeClone(value, presets.http);
safeClone(value, presets.audit);

// composable
safeClone(value, { ...presets.log, maxDepth: 10 });
```

| Preset | maxDepth | maxArrayLength | maxStringLength | stack | stable |
|---|---|---|---|---|---|
| `log` | 5 | 50 | 2000 | no | no |
| `debug` | 8 | 200 | 8000 | yes | no |
| `http` | 5 | 50 | 2000 | no | no |
| `audit` | 5 | 100 | 4000 | no | yes |

`http` also redacts `headers`, `cookie`, `set-cookie`, `authorization`.

---

## API

### `safeClone(value, options?)`

Returns a safe plain JS value. Use when your logger accepts objects.

```ts
logger.info({ payload: safeClone(req.body) });
```

### `safeStringify(value, options?)`

Returns a JSON string. Use when you need a string directly.

```ts
const line = safeStringify(req.body, { pretty: 2 });
```

### `redact(value, options?)`

Focused wrapper for key masking.

```ts
const clean = redact(config, { keys: ["connectionString", "jwtSecret"] });
```

### `createSafeJson(baseOptions?)`

Factory — define policy once, reuse everywhere.

```ts
const safeJson = createSafeJson({
  redactKeys: ["email"],
  maxDepth: 5,
});

safeJson.stringify(value);
safeJson.clone(value);
safeJson.forLog(value);
safeJson.forDebug(value);
safeJson.forHttp(value);
safeJson.forAudit(value);
```

---

## Type handling

| Type | Default output |
|---|---|
| `Date` | `"2024-01-01T00:00:00.000Z"` (ISO string) |
| `Error` | `{ name, message, cause?, code?, ...custom }` |
| `Map` | plain object |
| `Set` | array |
| `BigInt` | string (e.g. `"9007199254740993"`) |
| `Function` | omitted |
| `Symbol` | omitted |
| `undefined` | omitted (same as native JSON) |
| Circular ref | `"[Circular]"` |
| Depth exceeded | `"[MaxDepth]"` |
| Array truncated | `["...items...", "[Truncated N more items]"]` |

---

## Examples

### Express / NestJS request logging

```ts
app.use((req, res, next) => {
  logger.info("Incoming request", {
    method: req.method,
    url: req.url,
    headers: safeClone(req.headers, presets.http),
    body: safeClone(req.body, presets.log),
  });
  next();
});
```

### Error logging

```ts
try {
  await paymentService.charge(input);
} catch (err) {
  logger.error("Payment failed", {
    error: safeClone(err, presets.debug),
    input: safeClone(input, presets.log),
  });
  throw err;
}
```

### Config debug

```ts
logger.info("Config loaded", {
  config: safeClone(config, {
    redactKeys: ["connectionString", "jwtSecret", "apiKey"],
  }),
});
```

---

## License

MIT
