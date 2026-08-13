export type JsonRecord = Record<string, unknown>;

export function asRecord(value: unknown, context: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${context} must be an object`);
  }
  return value as JsonRecord;
}

export function requireString(record: JsonRecord, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${context}.${key} must be a non-empty string`);
  }
  return value.trim();
}

export function requireNumber(record: JsonRecord, key: string, context: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${context}.${key} must be a finite number`);
  }
  return value;
}

export function requireStringArray(
  record: JsonRecord,
  key: string,
  context: string,
): string[] {
  const value = record[key];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new TypeError(`${context}.${key} must be a string array`);
  }
  return value.map((entry) => entry.trim()).filter(Boolean);
}

export function requireDate(value: string, context: string): void {
  if (Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${context} must be an ISO-compatible date`);
  }
}
