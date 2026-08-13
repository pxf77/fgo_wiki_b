import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const servants = pgTable("servants", {
  id: varchar("id", { length: 96 }).primaryKey(),
  atlasId: integer("atlas_id").unique(),
  currentName: text("current_name").notNull(),
  className: varchar("class_name", { length: 32 }).notNull(),
  rarity: integer("rarity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const servantVersions = pgTable(
  "servant_versions",
  {
    servantId: varchar("servant_id", { length: 96 })
      .notNull()
      .references(() => servants.id, { onDelete: "cascade" }),
    region: varchar("region", { length: 8 }).notNull(),
    version: integer("version").notNull(),
    released: boolean("released").notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    payload: jsonb("payload").notNull(),
  },
  (table) => [primaryKey({ columns: [table.servantId, table.region, table.version] })],
);

export const rankingSnapshots = pgTable("ranking_snapshots", {
  id: varchar("id", { length: 128 }).primaryKey(),
  region: varchar("region", { length: 8 }).notNull(),
  mode: varchar("mode", { length: 48 }).notNull(),
  asOf: timestamp("as_of", { withTimezone: true }).notNull(),
  revision: integer("revision").notNull(),
  assumptions: jsonb("assumptions").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rankingEntries = pgTable(
  "ranking_entries",
  {
    snapshotId: varchar("snapshot_id", { length: 128 })
      .notNull()
      .references(() => rankingSnapshots.id, { onDelete: "cascade" }),
    servantId: varchar("servant_id", { length: 96 })
      .notNull()
      .references(() => servants.id, { onDelete: "cascade" }),
    tier: varchar("tier", { length: 16 }).notNull(),
    score: integer("score"),
    payload: jsonb("payload").notNull(),
  },
  (table) => [primaryKey({ columns: [table.snapshotId, table.servantId] })],
);

export const datasetReleases = pgTable("dataset_releases", {
  version: varchar("version", { length: 128 }).primaryKey(),
  region: varchar("region", { length: 8 }).notNull(),
  rankingRevision: integer("ranking_revision").notNull(),
  objectPrefix: text("object_prefix").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  changelog: jsonb("changelog").notNull(),
});
