import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDataRepository } from "./repository.js";

const config = loadConfig();
const repository = await createDataRepository(config);
const app = await buildApp({ config, repository });

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
