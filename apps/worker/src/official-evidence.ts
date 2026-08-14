import type { OfficialSource } from "@fgo-wiki/domain";
import { asRecord, requireDate, requireString } from "./json-validation.js";

const allowedSourceHosts = new Set([
  "bilibili.com",
  "www.bilibili.com",
  "game.bilibili.com",
  "taptap.cn",
  "www.taptap.cn",
]);

export function assertOfficialSource(
  value: unknown,
  context: string,
): asserts value is OfficialSource {
  const record = asRecord(value, context);
  requireString(record, "title", context);
  requireString(record, "publisher", context);
  const urlValue = requireString(record, "url", context);
  const publishedAt = requireString(record, "publishedAt", context);
  requireDate(publishedAt, `${context}.publishedAt`);

  const url = new URL(urlValue);
  if (url.protocol !== "https:" || !allowedSourceHosts.has(url.hostname.toLowerCase())) {
    throw new TypeError(`${context}.url is not an allowed CN official source`);
  }
}
