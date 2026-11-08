import assert from "node:assert/strict";
import test from "node:test";
import { buildCorsOrigins, parseExtraOrigins } from "./custom-domains.mjs";

test("parseExtraOrigins returns nothing for empty input", () => {
  assert.deepEqual(parseExtraOrigins(undefined), []);
  assert.deepEqual(parseExtraOrigins(""), []);
  assert.deepEqual(parseExtraOrigins(" , \n "), []);
});

test("parseExtraOrigins normalizes, strips paths and slashes, and dedupes", () => {
  assert.deepEqual(
    parseExtraOrigins("https://crm.example.com/, https://CRM.example.com/login\nhttps://app.example.org"),
    ["https://crm.example.com", "https://app.example.org"],
  );
});

test("parseExtraOrigins rejects non-https and invalid values", () => {
  assert.throws(() => parseExtraOrigins("http://crm.example.com"), /must use https/);
  assert.throws(() => parseExtraOrigins("crm.example.com"), /not a valid URL/);
});

test("buildCorsOrigins keeps the Pages origin first and appends extras", () => {
  assert.equal(
    buildCorsOrigins("https://sinc-crm-esg.pages.dev", "https://sinc-crm.example.com"),
    "https://sinc-crm-esg.pages.dev,https://sinc-crm.example.com",
  );
});

test("buildCorsOrigins without extras matches the previous single-origin value", () => {
  assert.equal(
    buildCorsOrigins("https://sinc-crm-esg.pages.dev/", undefined),
    "https://sinc-crm-esg.pages.dev",
  );
});

test("buildCorsOrigins does not duplicate the Pages origin", () => {
  assert.equal(
    buildCorsOrigins("https://sinc-crm-esg.pages.dev", "https://sinc-crm-esg.pages.dev"),
    "https://sinc-crm-esg.pages.dev",
  );
});
