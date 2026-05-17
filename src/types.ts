export type SafeJsonOptions = {
  redactKeys?: string[];
  redactByPattern?: RegExp[];
  replacement?: string;

  maxDepth?: number;
  maxArrayLength?: number;
  maxObjectKeys?: number;
  maxStringLength?: number;

  includeErrorStack?: boolean;
  stable?: boolean;
  pretty?: boolean | number;

  handleBigInt?: "string" | "number" | "redact";
  handleFunction?: "omit" | "name" | "placeholder";
  handleSymbol?: "omit" | "description" | "placeholder";
  onCircular?: "placeholder" | "path";
};

export type SafeJsonInstance = {
  stringify(value: unknown, overrides?: SafeJsonOptions): string;
  clone(value: unknown, overrides?: SafeJsonOptions): unknown;
  forLog(value: unknown): unknown;
  forDebug(value: unknown): unknown;
  forHttp(value: unknown): unknown;
  forAudit(value: unknown): unknown;
};

export type ResolvedOptions = Required<
  Omit<SafeJsonOptions, "redactKeys" | "redactByPattern" | "pretty">
> & {
  redactKeys: string[];
  redactByPattern: RegExp[];
  pretty: boolean | number;
};
