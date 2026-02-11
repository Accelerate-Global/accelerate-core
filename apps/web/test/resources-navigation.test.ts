import assert from "node:assert/strict";
import test from "node:test";
import { PRIMARY_NAV_ITEMS, getSection, isActivePath } from "../src/app/_components/navigation.ts";

test("sidebar config includes Resources top-level entry", () => {
  const resources = PRIMARY_NAV_ITEMS.find((item) => item.href === "/resources");
  assert.ok(resources);
  assert.equal(resources?.label, "Resources");
});

test("resources routes resolve to resources section and active state", () => {
  assert.equal(getSection("/resources"), "resources");
  assert.equal(getSection("/resources/tables"), "resources");
  assert.equal(getSection("/resources/tables/country_codes/versions"), "resources");

  const item = PRIMARY_NAV_ITEMS.find((entry) => entry.href === "/resources");
  assert.ok(item);
  assert.equal(isActivePath("/resources/tables/country_codes", item!), true);
});
