// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockPosthog, runCallbacksImmediately } from "./parity/harness.js";

type Consent = typeof import("../src/consent.js");

const SIX_MONTHS_AND_A_DAY = 1000 * 60 * 60 * 24 * 183;

async function fresh(): Promise<{
  consent: Consent;
  recorder: ReturnType<typeof mockPosthog>;
  reload: ReturnType<typeof vi.fn>;
}> {
  vi.resetModules();
  runCallbacksImmediately();
  const recorder = mockPosthog();
  const browser = await import("../src/browser.js");
  browser.initAnalytics({
    site: "test-site",
    key: "phc_test",
    apiHost: "https://e.example.com",
    spa: false,
    regulated: false,
  });
  await vi.waitFor(() => expect(recorder.config).not.toBeNull());
  const reload = vi.fn();
  vi.spyOn(window, "location", "get").mockReturnValue({
    ...window.location,
    hostname: "www.example.co.uk",
    reload,
  } as Location);
  const consent = await import("../src/consent.js");
  return { consent, recorder, reload };
}

/** A browser that refuses storage: every call throws, as Safari's private mode once did. */
function blockStorage(): void {
  const refuse = () => {
    throw new DOMException("blocked", "SecurityError");
  };
  vi.stubGlobal("localStorage", {
    getItem: refuse,
    setItem: refuse,
    removeItem: refuse,
    clear: refuse,
    key: refuse,
    length: 0,
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe("saveConsent", () => {
  it("records an explicit choice and sends consent_updated", async () => {
    const { consent, recorder } = await fresh();
    consent.saveConsent({ advertising: true, recordings: false }, "banner");
    expect(consent.hasConsent("advertising")).toBe(true);
    expect(consent.hasConsent("recordings")).toBe(false);
    expect(recorder.events.at(-1)).toMatchObject({
      event: "consent_updated",
      properties: {
        advertising: true,
        recordings: false,
        source: "banner",
        ad_consent: "granted",
      },
    });
  });

  it("withdrawing clears the platform cookies on every parent domain and reloads", async () => {
    const { consent, recorder, reload } = await fresh();
    consent.saveConsent({ advertising: true, recordings: false }, "banner");
    const written: string[] = [];
    vi.spyOn(document, "cookie", "set").mockImplementation((value: string) => {
      written.push(value);
    });
    consent.saveConsent({ advertising: false, recordings: false }, "settings");
    expect(recorder.events.at(-1)).toMatchObject({
      event: "consent_updated",
      properties: { advertising: false, source: "settings" },
    });
    expect(written).toContain(
      "_fbp=; Max-Age=0; path=/; domain=.example.co.uk",
    );
    expect(written).toContain(
      "_gcl_au=; Max-Age=0; path=/; domain=.example.co.uk",
    );
    expect(written).toContain("_fbp=; Max-Age=0; path=/");
    expect(reload).toHaveBeenCalledOnce();
  });

  it("an unchanged or newly granted choice does not reload", async () => {
    const { consent, reload } = await fresh();
    consent.saveConsent({ advertising: false, recordings: false }, "banner");
    consent.saveConsent({ advertising: true, recordings: false }, "settings");
    expect(reload).not.toHaveBeenCalled();
  });
});

describe("reading a choice", () => {
  it("an expired choice reads as none", async () => {
    const { consent } = await fresh();
    localStorage.setItem(
      "ow-consent",
      JSON.stringify({
        version: 1,
        decidedAt: Date.now() - SIX_MONTHS_AND_A_DAY,
        advertising: true,
        recordings: true,
      }),
    );
    expect(consent.readConsent()).toBeNull();
    expect(consent.hasConsent("advertising")).toBe(false);
  });

  it("a choice from an older consent version reads as none", async () => {
    const { consent } = await fresh();
    localStorage.setItem(
      "ow-consent",
      JSON.stringify({
        version: 0,
        decidedAt: Date.now(),
        advertising: true,
        recordings: true,
      }),
    );
    expect(consent.hasConsent("advertising")).toBe(false);
  });

  it("malformed storage reads as none", async () => {
    const { consent } = await fresh();
    localStorage.setItem("ow-consent", "{not json");
    expect(consent.readConsent()).toBeNull();
  });
});

describe("blocked storage is refused consent", () => {
  it("no consent-gated code runs when the choice cannot be stored", async () => {
    const { consent } = await fresh();
    const run = vi.fn();
    consent.onConsent("advertising", run);
    blockStorage();
    consent.saveConsent({ advertising: true, recordings: false }, "banner");
    expect(consent.hasConsent("advertising")).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });
});

describe("onConsent", () => {
  it("runs at once when consent is already granted", async () => {
    const { consent } = await fresh();
    consent.saveConsent({ advertising: true, recordings: false }, "banner");
    const run = vi.fn();
    consent.onConsent("advertising", run);
    expect(run).toHaveBeenCalledOnce();
  });

  it("runs once, later, when consent is granted afterwards", async () => {
    const { consent } = await fresh();
    const run = vi.fn();
    consent.onConsent("advertising", run);
    expect(run).not.toHaveBeenCalled();
    consent.saveConsent({ advertising: false, recordings: true }, "banner");
    expect(run).not.toHaveBeenCalled();
    consent.saveConsent({ advertising: true, recordings: true }, "settings");
    consent.saveConsent({ advertising: true, recordings: true }, "settings");
    expect(run).toHaveBeenCalledOnce();
  });
});

describe("cookieDomains", () => {
  it("covers the host and every parent", async () => {
    const { consent } = await fresh();
    expect(consent.cookieDomains("www.example.co.uk")).toEqual([
      "www.example.co.uk",
      ".www.example.co.uk",
      "example.co.uk",
      ".example.co.uk",
      "co.uk",
      ".co.uk",
    ]);
  });
});
