export interface AtlasNiceFunction {
  funcType: string;
  funcTargetType: string;
}

export interface AtlasNiceNoblePhantasm {
  id: number;
  num: number;
  npNum: number;
  priority: number;
  name: string;
  card: string;
  strengthStatus: number;
  npDistribution: number[];
  functions: AtlasNiceFunction[];
}

export interface AtlasNiceServant {
  id: number;
  collectionNo: number;
  name: string;
  originalName?: string;
  className: string;
  rarity: number;
  noblePhantasms: AtlasNiceNoblePhantasm[];
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown, context: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${context} must be an object`);
  }
  return value as JsonRecord;
}

function requiredString(record: JsonRecord, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${context}.${key} must be a non-empty string`);
  }
  return value.trim();
}

function requiredNumber(record: JsonRecord, key: string, context: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${context}.${key} must be a finite number`);
  }
  return value;
}

function optionalNumber(record: JsonRecord, key: string, fallback: number): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function optionalString(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function optionalArray(record: JsonRecord, key: string): unknown[] {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

function parseFunction(value: unknown, context: string): AtlasNiceFunction {
  const record = asRecord(value, context);
  return {
    funcType: typeof record.funcType === "string" ? record.funcType : "",
    funcTargetType: typeof record.funcTargetType === "string" ? record.funcTargetType : "",
  };
}

function parseNoblePhantasm(value: unknown, context: string): AtlasNiceNoblePhantasm {
  const record = asRecord(value, context);
  return {
    id: requiredNumber(record, "id", context),
    num: optionalNumber(record, "num", 0),
    npNum: optionalNumber(record, "npNum", 0),
    priority: optionalNumber(record, "priority", 0),
    name: requiredString(record, "name", context),
    card: requiredString(record, "card", context),
    strengthStatus: optionalNumber(record, "strengthStatus", 0),
    npDistribution: optionalArray(record, "npDistribution").filter(
      (entry): entry is number => typeof entry === "number" && Number.isFinite(entry),
    ),
    functions: optionalArray(record, "functions").map((entry, index) =>
      parseFunction(entry, `${context}.functions[${index}]`),
    ),
  };
}

function parseServant(value: unknown, index: number): AtlasNiceServant {
  const context = `servants[${index}]`;
  const record = asRecord(value, context);
  const servant: AtlasNiceServant = {
    id: requiredNumber(record, "id", context),
    collectionNo: requiredNumber(record, "collectionNo", context),
    name: requiredString(record, "name", context),
    className: requiredString(record, "className", context),
    rarity: requiredNumber(record, "rarity", context),
    noblePhantasms: optionalArray(record, "noblePhantasms").map((entry, npIndex) =>
      parseNoblePhantasm(entry, `${context}.noblePhantasms[${npIndex}]`),
    ),
  };
  const originalName = optionalString(record, "originalName");
  if (originalName !== undefined) {
    servant.originalName = originalName;
  }
  return servant;
}

export function parseAtlasNiceServants(value: unknown): AtlasNiceServant[] {
  if (!Array.isArray(value)) {
    throw new TypeError("Atlas nice servant export must be an array");
  }
  return value.map(parseServant);
}
