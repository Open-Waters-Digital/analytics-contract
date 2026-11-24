import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { gunzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CAPTURE_DEADLINE_MS, createServerCapture } from "../src/server.js";

interface Received {
  batch: {
    event: string;
    distinct_id: string;
    properties: Record<string, unknown>;
  }[];
}

let server: Server | null = null;

/** A stand-in PostHog ingestion endpoint. */
async function fakePosthog(
  respond: (req: IncomingMessage, res: ServerResponse) => void,
): Promise<{ host: string; received: Received[] }> {
  const received: Received[] = [];
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      const text =
        req.headers["content-encoding"] === "gzip"
          ? gunzipSync(body).toString()
          : body.toString();
      try {
        received.push(JSON.parse(text) as Received);
      } catch {
        // Not a batch.
      }
      respond(req, res);
    });
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { host: `http://127.0.0.1:${port}`, received };
}

afterEach(async () => {
  await new Promise<void>((resolve) => {
    if (!server) return resolve();
    server.closeAllConnections();
    server.close(() => resolve());
  });
  server = null;
});

const lead = { form_id: "consultation", lead_type: "garden-design" };

describe("createServerCapture", () => {
  it("sends the event with the super properties and no person profile", async () => {
    const { host, received } = await fakePosthog((_req, res) => res.end("{}"));
    const capture = createServerCapture({
      site: "test-site",
      key: "phc_test",
      host,
    });
    await capture("lead_submitted", lead);
    const event = received
      .flatMap((r) => r.batch)
      .find((e) => e.event === "lead_submitted");
    expect(event?.properties).toMatchObject({
      ...lead,
      site: "test-site",
      taxonomy_version: "4",
      $process_person_profile: false,
    });
  });

  it.each([[""], [undefined]])("makes no request with key %j", async (key) => {
    const { host, received } = await fakePosthog((_req, res) => res.end("{}"));
    const capture = createServerCapture({ site: "test-site", key, host });
    await capture("lead_submitted", lead);
    expect(received).toEqual([]);
  });

  it("resolves on a 500, and logs once without property values", async () => {
    const { host } = await fakePosthog((_req, res) => {
      res.statusCode = 500;
      res.end("boom");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const capture = createServerCapture({
      site: "test-site",
      key: "phc_test",
      host,
    });
    const started = Date.now();
    await expect(capture("lead_submitted", lead)).resolves.toBeUndefined();
    expect(Date.now() - started).toBeLessThanOrEqual(CAPTURE_DEADLINE_MS + 500);
    const ours = error.mock.calls.filter((c) =>
      String(c[0]).startsWith("analytics:"),
    );
    expect(ours).toHaveLength(1);
    const logged = JSON.stringify(error.mock.calls);
    expect(logged).not.toContain("garden-design");
    expect(logged).not.toContain("consultation");
  }, 15_000);

  it("resolves within the deadline when PostHog never answers", async () => {
    const { host } = await fakePosthog(() => {
      // Accept the request and never respond.
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const capture = createServerCapture({
      site: "test-site",
      key: "phc_test",
      host,
    });
    const started = Date.now();
    await capture("lead_submitted", lead);
    expect(Date.now() - started).toBeLessThanOrEqual(CAPTURE_DEADLINE_MS + 500);
  }, 15_000);

  it("resolves when capture itself throws", async () => {
    const { PostHog } = await import("posthog-node");
    vi.spyOn(PostHog.prototype, "capture").mockImplementation(() => {
      throw new TypeError("broken");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const capture = createServerCapture({
      site: "test-site",
      key: "phc_test",
      host: "http://127.0.0.1:9",
    });
    await expect(capture("lead_submitted", lead)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(
      "analytics: lead_submitted capture failed (TypeError)",
    );
  });

  describe("a lead's follow-up answers go only with their answer", () => {
    async function sent(
      event: "lead_submitted" | "lead_qualified",
      properties: Record<string, unknown>,
    ): Promise<Record<string, unknown> | undefined> {
      const { host, received } = await fakePosthog((_req, res) =>
        res.end("{}"),
      );
      const capture = createServerCapture({
        site: "test-site",
        key: "phc_test",
        host,
      });
      // Untyped on purpose: a site can send anything at runtime.
      await (capture as (e: string, p: unknown) => Promise<void>)(
        event,
        properties,
      );
      return received.flatMap((r) => r.batch).find((e) => e.event === event)
        ?.properties;
    }

    it("sends ai_tool with ai_assistant", async () => {
      const props = await sent("lead_submitted", {
        ...lead,
        heard_about: "ai_assistant",
        ai_tool: "claude",
      });
      expect(props).toMatchObject({
        heard_about: "ai_assistant",
        ai_tool: "claude",
      });
    });

    it("sends search_engine with search_engine", async () => {
      const props = await sent("lead_submitted", {
        ...lead,
        heard_about: "search_engine",
        search_engine: "google",
      });
      expect(props).toMatchObject({
        heard_about: "search_engine",
        search_engine: "google",
      });
    });

    it("drops a mismatched follow-up and keeps the answer", async () => {
      const props = await sent("lead_submitted", {
        ...lead,
        heard_about: "recommendation",
        search_engine: "google",
        ai_tool: "chatgpt",
      });
      expect(props).toMatchObject({ ...lead, heard_about: "recommendation" });
      expect(props).not.toHaveProperty("search_engine");
      expect(props).not.toHaveProperty("ai_tool");
    });

    it("drops the other follow-up when one matches", async () => {
      const props = await sent("lead_submitted", {
        ...lead,
        heard_about: "ai_assistant",
        ai_tool: "gemini",
        search_engine: "bing",
      });
      expect(props).toMatchObject({ ai_tool: "gemini" });
      expect(props).not.toHaveProperty("search_engine");
    });

    it("drops both when there is no heard_about", async () => {
      const props = await sent("lead_submitted", {
        ...lead,
        ai_tool: "perplexity",
        search_engine: "ecosia",
      });
      expect(props).toMatchObject(lead);
      expect(props).not.toHaveProperty("ai_tool");
      expect(props).not.toHaveProperty("search_engine");
    });

    it("leaves other events untouched", async () => {
      const props = await sent("lead_qualified", {
        ...lead,
        ai_tool: "copilot",
      });
      expect(props).toMatchObject({ ai_tool: "copilot" });
    });
  });

  it("gives every event a different distinct id", async () => {
    const { host, received } = await fakePosthog((_req, res) => res.end("{}"));
    const capture = createServerCapture({
      site: "test-site",
      key: "phc_test",
      host,
    });
    await capture("lead_submitted", lead);
    await capture("lead_submitted", lead);
    const ids = received.flatMap((r) => r.batch).map((e) => e.distinct_id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});
