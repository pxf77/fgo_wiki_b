// Public and internal HTTP routes.
import cors from "@fastify/cors";
import type {
  CardColor,
  NoblePhantasmScope,
  RankingMode,
  ServantClass,
} from "@fgo-wiki/domain";
import { filterServants, type ServantFilter } from "@fgo-wiki/filter-engine";
import { findRanking, sortRankingEntries } from "@fgo-wiki/ranking-engine";
import Fastify, { type FastifyInstance } from "fastify";
import type { ApiConfig } from "./config.js";
import type { DataRepository } from "./repository.js";
import {
  ReviewDataUnavailableError,
  type ReviewRepository,
} from "./review-repository.js";

export interface BuildAppOptions {
  config: ApiConfig;
  repository: DataRepository;
  reviewRepository?: ReviewRepository;
}

interface ServantQuerystring {
  query?: string;
  class?: string;
  npColor?: string;
  npScope?: string;
  npStrengthened?: string;
  minSelfCharge?: string;
  releasedOnly?: string;
}

const rankingModes = new Set<RankingMode>([
  "farming",
  "farming_90pp",
  "high_difficulty",
  "support",
  "np1_value",
]);

function asBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function buildServantFilter(query: ServantQuerystring): ServantFilter {
  const filter: ServantFilter = {};
  if (query.query) filter.query = query.query;
  if (query.class) filter.classes = [query.class as ServantClass];
  if (query.npColor) filter.npColors = [query.npColor as CardColor];
  if (query.npScope) filter.npScopes = [query.npScope as NoblePhantasmScope];

  const npStrengthened = asBoolean(query.npStrengthened);
  if (npStrengthened !== undefined) filter.npStrengthened = npStrengthened;

  if (query.minSelfCharge !== undefined) {
    const minimum = Number(query.minSelfCharge);
    if (Number.isFinite(minimum)) filter.minSelfCharge = minimum;
  }

  const releasedOnly = asBoolean(query.releasedOnly);
  if (releasedOnly !== undefined) filter.releasedOnly = releasedOnly;
  return filter;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || options.config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed"), false);
    },
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.get("/api/v1/meta", async () => options.repository.getSnapshot().metadata);

  app.get<{ Querystring: ServantQuerystring }>("/api/v1/servants", async (request) => {
    const snapshot = options.repository.getSnapshot();
    return filterServants(snapshot.servants, buildServantFilter(request.query));
  });

  app.get<{ Params: { id: string } }>("/api/v1/servants/:id", async (request, reply) => {
    const servant = options.repository
      .getSnapshot()
      .servants.find((candidate) => candidate.id === request.params.id);
    if (!servant) {
      return reply.code(404).send({ message: "Servant not found" });
    }
    return servant;
  });

  app.get<{ Params: { mode: string } }>("/api/v1/rankings/:mode", async (request, reply) => {
    if (!rankingModes.has(request.params.mode as RankingMode)) {
      return reply.code(400).send({ message: "Unknown ranking mode" });
    }

    const ranking = findRanking(
      options.repository.getSnapshot().rankings,
      request.params.mode as RankingMode,
    );
    if (!ranking) {
      return reply.code(404).send({ message: "Ranking not published" });
    }
    return { ...ranking, entries: sortRankingEntries(ranking.entries) };
  });

  app.get("/api/v1/datasets/latest", async (_request, reply) => {
    const snapshot = options.repository.getSnapshot();
    reply.header("etag", `\"${snapshot.metadata.datasetVersion}\"`);
    reply.header("cache-control", "public, max-age=60");
    return snapshot;
  });

  app.get("/api/internal/review/dashboard", async (_request, reply) => {
    reply.header("cache-control", "no-store");
    if (!options.reviewRepository) {
      return reply.code(503).send({
        message: "Review repository is not configured",
      });
    }

    try {
      return await options.reviewRepository.getDashboard();
    } catch (error) {
      if (error instanceof ReviewDataUnavailableError) {
        return reply.code(503).send({ message: error.message });
      }
      throw error;
    }
  });

  return app;
}
