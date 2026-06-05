import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const ORIGINAL_GEMINI = process.env.GEMINI_API_KEY;
const ORIGINAL_JULES = process.env.JULES_API_KEY;

before(() => {
  process.env.GEMINI_API_KEY = "gemini-secret-value-123456";
  process.env.JULES_API_KEY = "jules-secret-value-abcdef";
});

after(() => {
  if (ORIGINAL_GEMINI === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = ORIGINAL_GEMINI;

  if (ORIGINAL_JULES === undefined) delete process.env.JULES_API_KEY;
  else process.env.JULES_API_KEY = ORIGINAL_JULES;
});

test("redactForLog masks a GEMINI_API_KEY value from process.env", async () => {
  const { redactForLog } = await import("../scripts/redact.mjs");

  const redacted = redactForLog("Gemini key is gemini-secret-value-123456");

  assert.equal(redacted, "Gemini key is «REDACTED:GEMINI_API_KEY»");
});

test("redactForSpec masks a JULES_API_KEY assignment", async () => {
  const { redactForSpec } = await import("../scripts/redact.mjs");

  const redacted = redactForSpec("JULES_API_KEY=jules-secret-value-abcdef");

  assert.equal(redacted, "JULES_API_KEY=«REDACTED:JULES_API_KEY»");
});

test("redaction masks bearer tokens", async () => {
  const { redactForLog } = await import("../scripts/redact.mjs");

  const redacted = redactForLog("Authorization: Bearer abc.def_ghi-1234567890");

  assert.equal(redacted, "Authorization: Bearer «REDACTED:BEARER_TOKEN»");
});

test("clean strings pass through unchanged", async () => {
  const { redactForLog, redactForSpec } = await import("../scripts/redact.mjs");
  const clean = "No credentials here, just a normal Horizon action.";

  assert.equal(redactForLog(clean), clean);
  assert.equal(redactForSpec(clean), clean);
});
