import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function fetchAtlasCnServants(url: string, destination: string): Promise<void> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "fgo-cn-meta-worker/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`Atlas CN request failed: ${response.status}`);
  }

  const body = await response.text();
  JSON.parse(body);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, body, "utf8");
}
