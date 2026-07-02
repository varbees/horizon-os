import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

const originalFetch = globalThis.fetch;
const originalNimKey = process.env.NVIDIA_NIM_API_KEY;
const originalNimModel = process.env.NVIDIA_NIM_MODEL;
const originalNimEndpoint = process.env.NVIDIA_NIM_ENDPOINT;
const originalNimModelsEndpoint = process.env.NVIDIA_NIM_MODELS_ENDPOINT;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalNimKey === undefined) delete process.env.NVIDIA_NIM_API_KEY;
  else process.env.NVIDIA_NIM_API_KEY = originalNimKey;
  if (originalNimModel === undefined) delete process.env.NVIDIA_NIM_MODEL;
  else process.env.NVIDIA_NIM_MODEL = originalNimModel;
  if (originalNimEndpoint === undefined) delete process.env.NVIDIA_NIM_ENDPOINT;
  else process.env.NVIDIA_NIM_ENDPOINT = originalNimEndpoint;
  if (originalNimModelsEndpoint === undefined) delete process.env.NVIDIA_NIM_MODELS_ENDPOINT;
  else process.env.NVIDIA_NIM_MODELS_ENDPOINT = originalNimModelsEndpoint;
});

function freshImport() {
  return import(`../scripts/nim.mjs?test=${Date.now()}-${Math.random()}`);
}

test("nimGenerate uses NVIDIA's OpenAI-compatible chat completions endpoint", async () => {
  process.env.NVIDIA_NIM_API_KEY = "nim-test-key";
  delete process.env.NVIDIA_NIM_ENDPOINT;
  delete process.env.NVIDIA_NIM_MODEL;

  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ choices: [{ message: { content: "  done  " } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const { nimGenerate } = await freshImport();
  const output = await nimGenerate("Draft the next action", {
    system: "Return JSON only",
    model: "meta/llama-3.1-8b-instruct",
    timeoutMs: 500,
  });

  assert.equal(output, "done");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://integrate.api.nvidia.com/v1/chat/completions");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers.Authorization, "Bearer nim-test-key");

  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.model, "meta/llama-3.1-8b-instruct");
  assert.deepEqual(body.messages, [
    { role: "system", content: "Return JSON only" },
    { role: "user", content: "Draft the next action" },
  ]);
});

test("nimGenerate redacts provider error bodies before throwing", async () => {
  process.env.NVIDIA_NIM_API_KEY = "nim-secret-value";

  globalThis.fetch = async () =>
    new Response("upstream saw Bearer nim-secret-value", {
      status: 500,
      headers: { "content-type": "text/plain" },
    });

  const { nimGenerate } = await freshImport();

  await assert.rejects(
    () => nimGenerate("hello", { timeoutMs: 500 }),
    (error) => {
      assert.match(error.message, /NIM 500/);
      assert.doesNotMatch(error.message, /nim-secret-value/);
      assert.match(error.message, /REDACTED/);
      return true;
    },
  );
});

test("listNimModels uses the OpenAI-compatible models endpoint", async () => {
  process.env.NVIDIA_NIM_API_KEY = "nim-test-key";
  process.env.NVIDIA_NIM_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
  delete process.env.NVIDIA_NIM_MODELS_ENDPOINT;

  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(
      JSON.stringify({
        data: [
          { id: "meta/llama-3.1-8b-instruct", owned_by: "nvidia" },
          { id: "deepseek-ai/deepseek-r1", owned_by: "nvidia" },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const { listNimModels } = await freshImport();
  const models = await listNimModels({ timeoutMs: 500 });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://integrate.api.nvidia.com/v1/models");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.headers.Authorization, "Bearer nim-test-key");
  assert.deepEqual(models.map((model) => model.id), [
    "meta/llama-3.1-8b-instruct",
    "deepseek-ai/deepseek-r1",
  ]);
});
