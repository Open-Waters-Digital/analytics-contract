import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { gunzipSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";

import { classifyChannel } from "../src/contract.js";
import { createServerCapture, parseAttribution } from "../src/server.js";

const json = (value: unknown): string => JSON.stringify(value);

describe("parseAttribution", () => {
  it("reads a valid payload, normalised", () => {
    expect(
      parseAttribution(
        json({
          utm_source: " Instagram ",
          utm_medium: "Social",
          utm_campaign: "Spring 2026",
          referring_domain: "L.Instagram.com",
        }),
      ),
    ).toEqual({
      utm_source: "instagram",
      utm_medium: "social",
      utm_campaign: "spring 2026",
      referring_domain: "l.instagram.com",
    });
  });

  it("drops an email address in a UTM value", () => {
    expect(
      parseAttribution(
        json({ utm_source: "google", utm_campaign: "jane.doe@example.com" }),
      ),
    ).toEqual({ utm_source: "google" });
  });

  it.each([["07700900123"], ["07700 900123"], ["+44 7700 900 123"]])(
    "drops a phone-length run of digits: %s",
    (value) => {
      expect(parseAttribution(json({ utm_campaign: value }))).toEqual({});
    },
  );

  it("keeps a dated campaign", () => {
    expect(parseAttribution(json({ utm_campaign: "sale-2026-09-24" }))).toEqual(
      {
        utm_campaign: "sale-2026-09-24",
      },
    );
  });

  it("cuts over-long values to 100 characters", () => {
    const parsed = parseAttribution(json({ utm_campaign: "a".repeat(300) }));
    expect(parsed?.utm_campaign).toHaveLength(100);
  });

  it("removes disallowed characters", () => {
    expect(
      parseAttribution(json({ utm_source: "<script>news!</script>" })),
    ).toEqual({
      utm_source: "scriptnewsscript",
    });
  });

  it("reduces a referrer URL to its hostname", () => {
    expect(
      parseAttribution(
        json({ referring_domain: "https://www.google.co.uk/search?q=gardens" }),
      ),
    ).toEqual({ referring_domain: "www.google.co.uk" });
  });

  it("drops a referrer that is not a hostname", () => {
    expect(parseAttribution(json({ referring_domain: "not a host" }))).toEqual(
      {},
    );
  });

  it.each([
    ["a nested object", json({ utm_source: { nested: true } })],
    ["an array", json(["google"])],
    ["a number", json(42)],
    ["null", "null"],
    ["a known key that is a number", json({ utm_source: 42 })],
    ["invalid JSON", "{utm_source:"],
    ["an empty string", ""],
    ["a body over 2 KB", json({ utm_source: "x".repeat(3000) })],
  ])("treats %s as no attribution", (_label, raw) => {
    expect(parseAttribution(raw)).toBeNull();
  });

  it.each([[undefined], [null], [42], [{}]])(
    "treats a non-string field (%s) as none",
    (raw) => {
      expect(parseAttribution(raw)).toBeNull();
    },
  );

  it("ignores a forged channel and every other key", () => {
    expect(
      parseAttribution(
        json({ channel: "paid_search", email: "a@b.c", utm_source: "google" }),
      ),
    ).toEqual({ utm_source: "google" });
  });

  it("an empty object is direct, and nothing is unknown", () => {
    expect(classifyChannel(parseAttribution("{}"))).toBe("direct");
    expect(classifyChannel(parseAttribution(undefined))).toBe("unknown");
  });
});

// ── The server capture ──────────────────────────────────────────────────────

let server: Server | null = null;
interface Batch {
  batch: { event: string; properties: Record<string, unknown> }[];
}

async function fakePosthog(): Promise<{ host: string; received: Batch[] }> {
  const received: Batch[] = [];
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
        received.push(JSON.parse(text) as Batch);
      } catch {
        // Not a batch.
      }
      res.end("{}");
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

const events = (received: Batch[]) => received.flatMap((b) => b.batch);

describe("every lead carries a channel", () => {
  it("sends unknown on lead_submitted when the site passes none", async () => {
    const { host, received } = await fakePosthog();
    const capture = createServerCapture({ site: "t", key: "phc_test", host });
    await capture("lead_submitted", {
      form_id: "contact",
      lead_type: "general",
    });
    expect(events(received)[0]?.properties["channel"]).toBe("unknown");
  });

  it("sends a passed channel unchanged", async () => {
    const { host, received } = await fakePosthog();
    const capture = createServerCapture({ site: "t", key: "phc_test", host });
    await capture("lead_submitted", {
      form_id: "contact",
      lead_type: "general",
      channel: "paid_social",
    });
    expect(events(received)[0]?.properties["channel"]).toBe("paid_social");
  });

  it("adds no channel to other events", async () => {
    const { host, received } = await fakePosthog();
    const capture = createServerCapture({ site: "t", key: "phc_test", host });
    await capture("lead_qualified", {
      form_id: "contact",
      lead_type: "general",
    });
    expect(events(received)[0]?.properties).not.toHaveProperty("channel");
  });
});

describe("end to end", () => {
  it("a parsed, classified attribution reaches lead_submitted with nothing dropped", async () => {
    const { host, received } = await fakePosthog();
    const capture = createServerCapture({ site: "t", key: "phc_test", host });
    const sent = json({
      utm_source: "facebook",
      utm_medium: "paid",
      utm_campaign: "call 07700 900123",
      referring_domain: "l.facebook.com",
      email: "jane@example.com",
    });
    const attribution = parseAttribution(sent);
    await capture("lead_submitted", {
      form_id: "consultation",
      lead_type: "garden-design",
      channel: classifyChannel(attribution),
      ...attribution,
    });
    const props = events(received)[0]?.properties ?? {};
    expect(props).toMatchObject({
      channel: "paid_social",
      utm_source: "facebook",
      utm_medium: "paid",
      referring_domain: "l.facebook.com",
      taxonomy_version: "3",
    });
    expect(props).not.toHaveProperty("utm_campaign");
    expect(JSON.stringify(props)).not.toMatch(/jane@|07700/);
  });
});
