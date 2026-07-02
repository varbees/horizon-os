import { nimAvailable, nimGenerate } from "./nim.mjs";

async function run() {
  console.log("NIM Available?", nimAvailable());
  if (nimAvailable()) {
    try {
      console.log("Testing Generation...");
      const res = await nimGenerate("What is the capital of France?", { timeoutMs: 5000 });
      console.log("Response:", res);
    } catch (err) {
      console.error("Error:", err);
    }
  }
}

run();
