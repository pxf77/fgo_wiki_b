import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertAtlasCnSourceMetadata,
  fetchAtlasCnServants,
} from "./sources/atlas.js";

test("records the official Atlas CN repository revision with the export", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fgo-atlas-source-"));
  try {
    const destination = join(directory, "nice_servant.json");
    const metadataDestination = join(directory, "atlas-source.json");
    const timestamp = Math.floor(
      Date.parse("2026-08-12T10:40:37.000Z") / 1_000,
    );
    const fetcher: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/info")) {
        return new Response(
          JSON.stringify({
            CN: {
              hash: "135e225005abcdef135e225005abcdef135e2250",
              timestamp,
            },
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify([{ id: 1 }]), {
        status: 200,
      });
    };

    const metadata = await fetchAtlasCnServants({
      servantsUrl: "https://api.example.test/export/CN/nice_servant.json",
      destination,
      infoUrl: "https://api.example.test/info",
      metadataDestination,
      fetcher,
      now: () => new Date("2026-08-15T00:00:00.000Z"),
    });

    assert.equal(
      metadata.revision,
      "cn-20260812T104037Z-135e225005ab",
    );
    assert.deepEqual(
      JSON.parse(await readFile(destination, "utf8")),
      [{ id: 1 }],
    );
    const written: unknown = JSON.parse(
      await readFile(metadataDestination, "utf8"),
    );
    assertAtlasCnSourceMetadata(written);
    assert.deepEqual(written, metadata);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects an Atlas info response without a CN revision", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fgo-atlas-source-"));
  try {
    const fetcher: typeof fetch = async (input) =>
      String(input).endsWith("/info")
        ? new Response(JSON.stringify({ JP: { hash: "abc", timestamp: 1 } }))
        : new Response("[]");

    await assert.rejects(
      fetchAtlasCnServants({
        servantsUrl: "https://api.example.test/export/CN/nice_servant.json",
        destination: join(directory, "nice_servant.json"),
        infoUrl: "https://api.example.test/info",
        metadataDestination: join(directory, "atlas-source.json"),
        fetcher,
      }),
      /response\.CN must be an object/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
