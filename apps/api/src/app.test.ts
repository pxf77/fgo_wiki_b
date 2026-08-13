import assert from "node:assert/strict";
import test from "node:test";
import { bootstrapSnapshot } from "@fgo-wiki/domain";
import { buildApp } from "./app.js";
import type { ApiConfig } from "./config.js";
import type { DataRepository } from "./repository.js";

const config: ApiConfig = {
  host: "127.0.0.1",
  port: 3001,
  corsOrigins: ["http://localhost:3000"],
  dataSource: "bootstrap",
  snapshotPath: "",
};

const repository: DataRepository = {
  getSnapshot: () => bootstrapSnapshot,
};

test("filters servants through the HTTP boundary", async () => {
  const app = await buildApp({ config, repository });
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/servants?class=archer&npColor=quick&npScope=single&npStrengthened=true",
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(
    (response.json() as Array<{ id: string }>).map((servant) => servant.id),
    ["archer-baobhan-sith"],
  );
  await app.close();
});
