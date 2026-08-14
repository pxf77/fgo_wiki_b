// API bootstrap.
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDataRepository } from "./repository.js";
import { createReviewRepository } from "./review-repository.js";

const config = loadConfig();
const repository = await createDataRepository(config);
const reviewRepository = createReviewRepository(repository);
const app = await buildApp({ config, repository, reviewRepository });

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
