// A site's eager entry: what a page ships before anything is idle. It imports
// the built package, exactly as a consumer does.
import { initAnalytics } from "../../../dist/browser.js";

initAnalytics({
  site: "fixture",
  key: "phc_test",
  apiHost: "https://e.example.com",
  spa: false,
  regulated: false,
});
