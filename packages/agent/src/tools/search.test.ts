import test from "node:test";
import assert from "node:assert/strict";

import { searchUrl } from "./search";

test("searchUrl encodes the complete query for the browser search page", () => {
  assert.equal(
    searchUrl("founder of Tesla"),
    "https://www.bing.com/search?cc=IN&setlang=en-IN&q=founder%20of%20Tesla",
  );
});
