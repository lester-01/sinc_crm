import assert from "node:assert/strict";
import test from "node:test";
import {
  apiProjectToListRow,
  defaultPagesProjectFromWorkerName,
  parsePagesStableDomain,
  resolvePagesProjectName,
} from "./cloudflare-api.mjs";

const sampleRows = [
  {
    "Project Name": "sinc-crm",
    "Project Domains": "sinc-crm-esg.pages.dev",
  },
];

test("apiProjectToListRow maps API project to list row", () => {
  const row = apiProjectToListRow({
    name: "sinc-crm",
    subdomain: "sinc-crm-esg.pages.dev",
  });
  assert.deepEqual(row, sampleRows[0]);
});

test("parsePagesStableDomain uses Project Domains not project name", () => {
  assert.equal(parsePagesStableDomain(sampleRows, "sinc-crm"), "sinc-crm-esg.pages.dev");
});

test("resolvePagesProjectName uses Worker default when project exists in API list", () => {
  const { name, source } = resolvePagesProjectName({
    rows: sampleRows,
    workerName: "sinc-crm-api",
  });
  assert.equal(name, "sinc-crm");
  assert.match(source, /API/);
});

test("defaultPagesProjectFromWorkerName strips -api suffix", () => {
  assert.equal(defaultPagesProjectFromWorkerName("sinc-crm-api"), "sinc-crm");
});
