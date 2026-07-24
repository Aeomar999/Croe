import { env } from "./env.js";
import { logger } from "./logger.js";

const DEFAULT_MODEL = "qwen2.5:3b";

/**
 * LLM client for Ollama/vLLM (22-Infra-and-Deployment.md §4).
 * P0: calls local Ollama HTTP API. P1+: vLLM behind internal API.
 *
 * Text-only: images are pre-captioned by a lightweight captioner
 * before reaching the arbitrator (13-Disputes-and-AI-Triage.md §4).
 */

export type LLMResponse = {
  model: string;
  response: string;
  done: boolean;
};

/**
 * Call the LLM with a system prompt and user message.
 * Returns the raw text response.
 */
export async function callLLM(p: {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ text: string; model: string }> {
  const model = env.LLM_MODEL || DEFAULT_MODEL;
  const baseUrl = env.LLM_URL;

  // P0: if no LLM configured, return a mock for sandbox testing
  if (!env.LLM_MODEL && !process.env.LLM_MODEL) {
    logger.warn("No LLM_MODEL configured — using mock response for P0 sandbox");
    return {
      text: JSON.stringify({
        reasoning_steps: [
          "No LLM configured — mock response for sandbox testing",
          "Returning neutral response",
        ],
        confidence_score: 0.500,
        recommended_action: "ESCALATE_HUMAN",
        summary_for_users: "This dispute requires manual review.",
      }),
      model: "mock-p0",
    };
  }

  const url = `${baseUrl}/api/chat`;
  const body = {
    model,
    messages: [
      { role: "system", content: p.systemPrompt },
      { role: "user", content: p.userMessage },
    ],
    stream: false,
    options: {
      temperature: p.temperature ?? 0.3,
      num_predict: p.maxTokens ?? 512,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000); // 15s timeout

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LLM returned ${response.status}: ${text}`);
    }

    const data = (await response.json()) as LLMResponse;

    if (!data.response) {
      throw new Error("LLM returned empty response");
    }

    return { text: data.response, model: data.model ?? model };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("LLM request timed out after 15s");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
