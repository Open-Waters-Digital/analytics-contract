// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockPosthog, runCallbacksImmediately } from "./parity/harness.js";

type Browser = typeof import("../src/browser.js");

const config = {
  site: "test-site",
  key: "phc_test",
  apiHost: "https://e.example.com",
  spa: false,
  regulated: false,
};

/** A page load: the given URL and referrer, and a fresh copy of the module. */
async function loadPage(
  url: string,
  referrer = "",
  override: Partial<typeof config> = {},
): Promise<Browser> {
  // happy-dom's own control surface, not part of the DOM types.
  (
    window as unknown as { happyDOM: { setURL(url: string): void } }
  ).happyDOM.setURL(url);
  Object.defineProperty(document, "referrer", {
    configurable: true,
    value: referrer,
  });
  vi.resetModules();
  runCallbacksImmediately();
  mockPosthog();
  const mod = await import("../src/browser.js");
  mod.initAnalytics({ ...config, ...override });
  return mod;
}

const stored = (mod: Browser): unknown => {
  const raw = mod.attributionField();
  return raw === "" ? "" : JSON.parse(raw);
};

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe("first touch", () => {
  it("keeps the landing's UTM tags across later pages", async () => {
    await loadPage(
      "https://www.example.com/?utm_source=instagram&utm_medium=social&utm_campaign=spring",
      "https://l.instagram.com/",
    );
    await loadPage("https://www.example.com/about", "https://www.example.com/");
    const mod = await loadPage(
      "https://www.example.com/contact?utm_source=other",
      "https://www.example.com/about",
    );
    expect(stored(mod)).toEqual({
      utm_source: "instagram",
      utm_medium: "social",
      utm_campaign: "spring",
      referring_domain: "l.instagram.com",
    });
  });

  it("stores an external referrer as its hostname only", async () => {
    const mod = await loadPage(
      "https://www.example.com/services",
      "https://www.houzz.co.uk/professionals/garden-design?id=42",
    );
    expect(stored(mod)).toEqual({ referring_domain: "www.houzz.co.uk" });
  });

  it("ignores its own site as a referrer, and records a direct start", async () => {
    const mod = await loadPage(
      "https://www.example.com/gardens",
      "https://www.example.com/",
    );
    expect(mod.attributionField()).toBe("{}");
  });

  it("records a direct landing as an empty object", async () => {
    const mod = await loadPage("https://www.example.com/");
    expect(mod.attributionField()).toBe("{}");
  });

  it("never stores click identifiers", async () => {
    const mod = await loadPage(
      "https://www.example.com/?gclid=abc123&fbclid=def456&utm_source=google&utm_medium=cpc",
    );
    expect(stored(mod)).toEqual({ utm_source: "google", utm_medium: "cpc" });
    expect(mod.attributionField()).not.toMatch(/abc123|def456/);
  });

  it("caps each value at 100 characters", async () => {
    const mod = await loadPage(
      `https://www.example.com/?utm_campaign=${"x".repeat(500)}`,
    );
    expect((stored(mod) as { utm_campaign: string }).utm_campaign).toHaveLength(
      100,
    );
  });
});

describe("when nothing may be stored", () => {
  it("an objecting visitor has nothing written", async () => {
    localStorage.setItem("ow-analytics-objection", "1");
    const mod = await loadPage("https://www.example.com/?utm_source=google");
    expect(sessionStorage.getItem("ow-attribution")).toBeNull();
    expect(mod.attributionField()).toBe("");
  });

  it("a site with no key has nothing written", async () => {
    const mod = await loadPage(
      "https://www.example.com/?utm_source=google",
      "",
      {
        key: "",
      },
    );
    expect(sessionStorage.getItem("ow-attribution")).toBeNull();
    expect(mod.attributionField()).toBe("");
  });

  it("blocked session storage gives an empty field and does not throw", async () => {
    const refuse = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    vi.stubGlobal("sessionStorage", {
      getItem: refuse,
      setItem: refuse,
      removeItem: refuse,
      clear: refuse,
      key: refuse,
      length: 0,
    });
    const mod = await loadPage("https://www.example.com/?utm_source=google");
    expect(mod.attributionField()).toBe("");
  });
});
