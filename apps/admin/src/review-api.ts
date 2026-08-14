// Read-only review API client.
import type { ReviewDashboard } from "@fgo-wiki/domain";

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001").replace(
    /\/$/,
    "",
  );
}

export async function fetchReviewDashboard(
  fetcher: typeof fetch = fetch,
): Promise<ReviewDashboard> {
  const response = await fetcher(`${apiBaseUrl()}/api/internal/review/dashboard`, {
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) detail = payload.message;
    } catch {
      // Preserve the HTTP status when a proxy returns a non-JSON body.
    }
    throw new Error(`审核数据读取失败：${detail}`);
  }

  return (await response.json()) as ReviewDashboard;
}
