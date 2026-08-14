export type DataSource = "bootstrap" | "snapshot";

export interface ApiConfig {
  host: string;
  port: number;
  corsOrigins: string[];
  dataSource: DataSource;
  snapshotPath: string;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): ApiConfig {
  const port = Number(environment.PORT ?? 3001);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error("PORT must be a valid TCP port");
  }

  const dataSource = environment.DATA_SOURCE ?? "bootstrap";
  if (dataSource !== "bootstrap" && dataSource !== "snapshot") {
    throw new Error("DATA_SOURCE must be bootstrap or snapshot");
  }

  return {
    host: environment.HOST ?? "0.0.0.0",
    port,
    corsOrigins: (
      environment.CORS_ORIGIN ??
      "http://localhost:3000,http://localhost:4173,http://localhost:4174"
    )
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    dataSource,
    snapshotPath:
      environment.SNAPSHOT_PATH ?? "./data/generated/latest/snapshot.json",
  };
}
