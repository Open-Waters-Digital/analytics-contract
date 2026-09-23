// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { mockPosthog, runCallbacksImmediately } from "./harness.js";
import {
  configWithoutCallbacks,
  EXPECTED,
  EXPECTED_CONFIG,
  runScenario,
} from "./scenario.js";

it("the reference implementation produces the expected event stream", async () => {
  runCallbacksImmediately();
  const recorder = mockPosthog();
  const mod = await import("../fixtures/reference/analytics.js");
  await runScenario(mod, recorder);
  expect(recorder.events).toEqual(EXPECTED);
  expect(configWithoutCallbacks(recorder.config)).toEqual(EXPECTED_CONFIG);
});
