import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

const originalFetch = globalThis.fetch;
const originalEnv = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  NVIDIA_NIM_API_KEY: process.env.NVIDIA_NIM_API_KEY,
  NVIDIA_NIM_MODEL: process.env.NVIDIA_NIM_MODEL,
  NVIDIA_NIM_ENDPOINT: process.env.NVIDIA_NIM_ENDPOINT,
  NVIDIA_NIM_MODELS_ENDPOINT: process.env.NVIDIA_NIM_MODELS_ENDPOINT,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function freshImport() {
  return import(`../scripts/llm-providers.mjs?test=${Date.now()}-${Math.random()}`);
}

test("listAiModelCatalog fetches configured providers and groups provider models", async () => {
  process.env.GEMINI_API_KEY = "gemini-test-key";
  process.env.GEMINI_MODEL = "gemini-2.0-flash";
  process.env.NVIDIA_NIM_API_KEY = "nim-test-key";
  process.env.NVIDIA_NIM_MODEL = "meta/llama-3.1-8b-instruct";
  process.env.NVIDIA_NIM_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
  delete process.env.NVIDIA_NIM_MODELS_ENDPOINT;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;

  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.startsWith("https://generativelanguage.googleapis.com/v1beta/models")) {
      return new Response(
        JSON.stringify({
          models: [
            {
              name: "models/gemini-2.0-flash",
              displayName: "Gemini 2.0 Flash",
              supportedGenerationMethods: ["generateContent"],
            },
            {
              name: "models/text-embedding-004",
              displayName: "Text Embedding",
              supportedGenerationMethods: ["embedContent"],
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (href === "https://integrate.api.nvidia.com/v1/models") {
      return new Response(
        JSON.stringify({
          data: [
            { id: "deepseek-ai/deepseek-r1" },
            { id: "meta/llama-3.1-8b-instruct" },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    throw new Error(`unexpected fetch ${href}`);
  };

  const { listAiModelCatalog } = await freshImport();
  const catalog = await listAiModelCatalog();

  const gemini = catalog.providers.find((provider) => provider.id === "gemini");
  const nim = catalog.providers.find((provider) => provider.id === "nim");
  const openai = catalog.providers.find((provider) => provider.id === "openai");
  const anthropic = catalog.providers.find((provider) => provider.id === "anthropic");

  assert.equal(gemini.configured, true);
  assert.equal(gemini.available, true);
  assert.deepEqual(gemini.models.map((model) => model.id), ["gemini-2.0-flash"]);
  assert.equal(nim.configured, true);
  assert.equal(nim.available, true);
  assert.deepEqual(nim.models.map((model) => model.id), [
    "deepseek-ai/deepseek-r1",
    "meta/llama-3.1-8b-instruct",
  ]);
  assert.equal(openai.configured, false);
  assert.equal(anthropic.configured, false);
  assert.deepEqual(catalog.defaultSelection, { provider: "gemini", model: "gemini-2.0-flash" });
});

test("enrichActionWithAvailableProvider sends the selected provider and model", async () => {
  process.env.GEMINI_API_KEY = "gemini-test-key";
  process.env.NVIDIA_NIM_API_KEY = "nim-test-key";
  process.env.NVIDIA_NIM_MODEL = "meta/llama-3.1-8b-instruct";

  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                goal: "Ship the selected model run",
                constraints: "Use the chosen provider",
                done_criteria: "Request body uses the selected model",
                tools: "node --test tests/llm-providers.test.mjs",
                prompt: "Run the chosen model against this action.",
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const { enrichActionWithAvailableProvider } = await freshImport();
  const result = await enrichActionWithAvailableProvider(
    {
      id: "selected-model-action",
      title: "Selected model action",
      summary: "Exercise manual provider choice",
      project_id: "horizon-os",
      project_path: "/tmp/horizon-os",
      prompt: "Original prompt",
    },
    { provider: "nim", model: "deepseek-ai/deepseek-r1" },
  );

  assert.equal(result.provider, "nim");
  assert.equal(result.model, "deepseek-ai/deepseek-r1");
  assert.equal(result.fields.goal, "Ship the selected model run");
  assert.equal(calls.length, 1);
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.model, "deepseek-ai/deepseek-r1");
});
