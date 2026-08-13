CREATE TABLE IF NOT EXISTS servants (
  id varchar(96) PRIMARY KEY,
  atlas_id integer UNIQUE,
  current_name text NOT NULL,
  class_name varchar(32) NOT NULL,
  rarity integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS servant_versions (
  servant_id varchar(96) NOT NULL REFERENCES servants(id) ON DELETE CASCADE,
  region varchar(8) NOT NULL,
  version integer NOT NULL,
  released boolean NOT NULL,
  valid_from timestamptz NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (servant_id, region, version)
);

CREATE TABLE IF NOT EXISTS ranking_snapshots (
  id varchar(128) PRIMARY KEY,
  region varchar(8) NOT NULL,
  mode varchar(48) NOT NULL,
  as_of timestamptz NOT NULL,
  revision integer NOT NULL,
  assumptions jsonb NOT NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ranking_entries (
  snapshot_id varchar(128) NOT NULL REFERENCES ranking_snapshots(id) ON DELETE CASCADE,
  servant_id varchar(96) NOT NULL REFERENCES servants(id) ON DELETE CASCADE,
  tier varchar(16) NOT NULL,
  score integer,
  payload jsonb NOT NULL,
  PRIMARY KEY (snapshot_id, servant_id)
);

CREATE TABLE IF NOT EXISTS dataset_releases (
  version varchar(128) PRIMARY KEY,
  region varchar(8) NOT NULL,
  ranking_revision integer NOT NULL,
  object_prefix text NOT NULL,
  published_at timestamptz NOT NULL,
  changelog jsonb NOT NULL
);
