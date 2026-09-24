// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockPosthog, runCallbacksImmediately } from "./parity/harness.js";

type Browser = typeof import("../src/browser.js");

async function freshModule(): Promise<{
  mod: Browser;
  recorder: ReturnType<typeof mockPosthog>;
}> {
  vi.resetModules();
  const recorder = mockPosthog();
  const mod = await import("../src/browser.js");
  return { mod, recorder };
}

const config = {
  site: "test-site",
  key: "phc_test",
  apiHost: "https://e.example.com",
  spa: false,
  regulated: false,
};

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

afterEach(() => {
  vi.useRealTimers();
});

describe("when analytics must not run", () => {
  it.each([
    ["an empty key", { key: "" }],
    ["no key", { key: undefined }],
    ["an empty host", { apiHost: "" }],
  ])(
    "%s attaches no listener and never imports posthog-js",
    async (_label, override) => {
      runCallbacksImmediately();
      const { mod, recorder } = await freshModule();
      const listen = vi.spyOn(document, "addEventListener");
      mod.initAnalytics({ ...config, ...override });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(listen).not.toHaveBeenCalled();
      expect(recorder.imports).toBe(0);
      mod.track("form_started", { form_id: "contact" });
      expect(recorder.events).toEqual([]);
    },
  );

  it("an objection attaches no listener and never imports posthog-js", async () => {
    runCallbacksImmediately();
    localStorage.setItem("ow-analytics-objection", "1");
    const { mod, recorder } = await freshModule();
    const listen = vi.spyOn(document, "addEventListener");
    mod.initAnalytics(config);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(listen).not.toHaveBeenCalled();
    expect(recorder.imports).toBe(0);
  });

  it("importing the module loads nothing", async () => {
    const { recorder } = await freshModule();
    expect(recorder.imports).toBe(0);
  });
});

describe("storage", () => {
  it("blocked storage reads as not objected, and as no consent choice", async () => {
    const { mod } = await freshModule();
    // Stored first, so a read that got through would say otherwise.
    localStorage.setItem("ow-analytics-objection", "1");
    localStorage.setItem(
      "ow-consent",
      JSON.stringify({
        version: 1,
        decidedAt: Date.now(),
        advertising: true,
        recordings: true,
      }),
    );
    expect(mod.hasObjected()).toBe(true);
    blockStorage();
    expect(mod.hasObjected()).toBe(false);
    expect(mod.readConsent()).toBeNull();
  });

  it("setting an objection survives blocked storage and still reloads", async () => {
    const { mod } = await freshModule();
    blockStorage();
    const reload = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      reload,
    } as Location);
    expect(() => mod.setAnalyticsObjection(true)).not.toThrow();
    expect(reload).toHaveBeenCalledOnce();
  });
});

describe("the queue before PostHog loads", () => {
  it("keeps the first 100 events and drops the rest", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    const { mod, recorder } = await freshModule();
    mod.initAnalytics(config);
    for (let i = 0; i < 150; i++)
      mod.track("video_played", { video_id: `v${i}` });
    await vi.advanceTimersByTimeAsync(1000);
    await vi.waitFor(() => expect(recorder.config).not.toBeNull());
    expect(recorder.events).toHaveLength(100);
    expect(recorder.events.at(-1)?.properties["video_id"]).toBe("v99");
  });
});

describe("the heatmaps option", () => {
  async function initWith(
    override: Partial<Parameters<Browser["initAnalytics"]>[0]>,
  ): Promise<ReturnType<typeof mockPosthog>> {
    runCallbacksImmediately();
    const { mod, recorder } = await freshModule();
    mod.initAnalytics({ ...config, ...override });
    await vi.waitFor(() => expect(recorder.config).not.toBeNull());
    return recorder;
  }

  it.each([
    ["absent", {}],
    ["false", { heatmaps: false }],
  ])("%s leaves heatmaps off", async (_label, override) => {
    const recorder = await initWith(override);
    expect(recorder.config?.["capture_heatmaps"]).toBe(false);
  });

  it("true turns heatmaps on and changes nothing else", async () => {
    const off = await initWith({});
    const on = await initWith({ heatmaps: true });
    expect(on.config?.["capture_heatmaps"]).toBe(true);
    const rest = (c: Record<string, unknown> | null) => {
      const {
        capture_heatmaps: _h,
        before_send: _b,
        loaded: _l,
        ...others
      } = c ?? {};
      return others;
    };
    expect(rest(on.config)).toEqual(rest(off.config));
    expect(on.config).toMatchObject({
      cookieless_mode: "always",
      person_profiles: "never",
      disable_session_recording: true,
    });
  });

  it('the string "true" from an environment variable does not turn them on', async () => {
    const recorder = await initWith({
      heatmaps: "true" as unknown as boolean,
    });
    expect(recorder.config?.["capture_heatmaps"]).toBe(false);
  });

  it("a regulated site keeps masking with heatmaps on", async () => {
    const recorder = await initWith({ heatmaps: true, regulated: true });
    expect(recorder.config).toMatchObject({
      capture_heatmaps: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
    });
  });

  it.each([
    [
      "an objection",
      () => localStorage.setItem("ow-analytics-objection", "1"),
      {},
    ],
    ["an empty key", () => {}, { key: "" }],
  ])(
    "with heatmaps on, %s still loads nothing",
    async (_label, arrange, override) => {
      runCallbacksImmediately();
      arrange();
      const { mod, recorder } = await freshModule();
      mod.initAnalytics({ ...config, ...override, heatmaps: true });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(recorder.imports).toBe(0);
      expect(recorder.config).toBeNull();
    },
  );
});
