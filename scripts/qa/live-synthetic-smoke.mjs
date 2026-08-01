#!/usr/bin/env node

import OpenAI, { AzureOpenAI } from "openai";

const inputRate = Number(process.env.ACADEMY_LIVE_INPUT_USD_PER_MILLION);
const outputRate = Number(process.env.ACADEMY_LIVE_OUTPUT_USD_PER_MILLION);
const maxUsd = Number(process.env.ACADEMY_LIVE_MAX_USD);
const maxInputTokens = 64;
const maxOutputTokens = 8;
const worstCaseUsd =
  (maxInputTokens * inputRate + maxOutputTokens * outputRate) / 1_000_000;

if (!Number.isFinite(worstCaseUsd) || worstCaseUsd > maxUsd) {
  console.error("BLOCKED: configured worst-case provider cost exceeds ACADEMY_LIVE_MAX_USD");
  process.exit(2);
}

function configured(value) {
  const normalized = value?.trim();
  return normalized && !/^(your_|dummy|configured-value$)/i.test(normalized)
    ? normalized
    : null;
}

function provider() {
  const azureKey = configured(process.env.AZURE_OPENAI_KEY) ??
    configured(process.env.AZURE_OPENAI_KEY2);
  const azureEndpoint = configured(process.env.AZURE_OPENAI_ENDPOINT);
  const azureDeployment = configured(process.env.AZURE_OPENAI_DEPLOYMENT);
  const azureVersion = configured(process.env.AZURE_OPENAI_API_VERSION);
  if (azureKey && azureEndpoint && azureDeployment && azureVersion) {
    return {
      name: "azure",
      model: azureDeployment,
      client: new AzureOpenAI({
        apiKey: azureKey,
        endpoint: azureEndpoint,
        deployment: azureDeployment,
        apiVersion: azureVersion,
        timeout: 12_000,
        maxRetries: 0,
      }),
    };
  }

  const geminiKey = configured(process.env.GEMINI_API_KEY);
  if (geminiKey) {
    return {
      name: "gemini",
      model: "gemini-2.5-flash",
      client: new OpenAI({
        apiKey: geminiKey,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        timeout: 12_000,
        maxRetries: 0,
      }),
    };
  }

  const nvidiaKey = configured(process.env.NVIDIA_API_KEY);
  if (nvidiaKey) {
    return {
      name: "nvidia",
      model: "meta/llama-3.1-8b-instruct",
      client: new OpenAI({
        apiKey: nvidiaKey,
        baseURL: "https://integrate.api.nvidia.com/v1",
        timeout: 12_000,
        maxRetries: 0,
      }),
    };
  }

  const openAiKey = configured(process.env.OPENAI_API_KEY);
  if (openAiKey) {
    return {
      name: "openai",
      model: "gpt-4o-mini",
      client: new OpenAI({ apiKey: openAiKey, timeout: 12_000, maxRetries: 0 }),
    };
  }

  return null;
}

const selected = provider();
if (!selected) {
  console.error("BLOCKED: no configured live provider for the synthetic smoke");
  process.exit(2);
}

const request = {
  model: selected.model,
  messages: [{ role: "user", content: "Ответь одним словом: сколько будет два плюс два?" }],
  max_tokens: maxOutputTokens,
};
if (selected.name === "gemini") request.reasoning_effort = "none";

const response = await selected.client.chat.completions.create(request);
const promptTokens = response.usage?.prompt_tokens;
const completionTokens = response.usage?.completion_tokens;
if (!Number.isInteger(promptTokens) || !Number.isInteger(completionTokens)) {
  console.error("FAIL: provider response omitted token usage; cost cannot be verified");
  process.exit(1);
}

const actualUsd =
  (promptTokens * inputRate + completionTokens * outputRate) / 1_000_000;
if (actualUsd > maxUsd) {
  console.error("FAIL: measured provider cost exceeded ACADEMY_LIVE_MAX_USD");
  process.exit(1);
}

const hasText = Boolean(response.choices[0]?.message?.content?.trim());
console.log(
  `provider=${selected.name} promptTokens=${promptTokens} completionTokens=${completionTokens} estimatedUsd=${actualUsd.toFixed(6)}`
);
process.exit(hasText ? 0 : 1);
