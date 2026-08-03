/**
 * MathVerse — AI Provider Abstraction Layer
 *
 * Supports: Gemini | OpenRouter | DeepSeek | Qwen | Llama | Mistral | Ollama | ZAI
 *
 * The application never talks to a specific provider directly.
 * It always goes through `generateCompletion()` which routes to the
 * configured provider and normalizes the response.
 *
 * To add a new provider:
 *   1. Implement the AIProvider interface.
 *   2. Register it in the PROVIDERS map.
 *   3. Add the provider name to AIProviderName type.
 *
 * For local development without external API keys, the ZAI provider
 * (z-ai-web-dev-sdk) is used by default and works out-of-the-box.
 */

import type {
  AIChatMessage,
  AICompletionRequest,
  AICompletionResponse,
  AIProviderName,
} from "@/lib/types";
import { config } from "@/lib/config";

export interface AIProvider {
  name: AIProviderName;
  available: () => boolean;
  complete: (req: AICompletionRequest) => Promise<AICompletionResponse>;
}

// ============================================================
// ZAI Provider (default — uses z-ai-web-dev-sdk, no API key needed)
// ============================================================

class ZAIProvider implements AIProvider {
  name: AIProviderName = "zai";

  available() {
    return true;
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResponse> {
    const start = Date.now();
    // Dynamically import to keep this server-only and avoid bundling in client
    const ZAI = (await import("z-ai-web-dev-sdk")).default;

    const messages = req.systemPrompt
      ? [{ role: "system" as const, content: req.systemPrompt }, ...req.messages]
      : req.messages;

    const zai = await ZAI.create();

    const response = await zai.chat.completions.create({
      messages,
      temperature: req.temperature ?? config.ai.defaultTemperature,
      max_tokens: req.maxTokens ?? config.ai.maxTokens,
    });

    const content =
      response.choices?.[0]?.message?.content ??
      response.choices?.[0]?.delta?.content ??
      "";

    return {
      content: typeof content === "string" ? content : String(content ?? ""),
      provider: "zai",
      model: "zai-default",
      tokensUsed: response.usage?.total_tokens,
      latencyMs: Date.now() - start,
    };
  }
}

// ============================================================
// OpenAI-compatible provider (used by OpenRouter, DeepSeek, Qwen, Mistral, Ollama, Llama)
// ============================================================

interface OpenAICompatConfig {
  name: AIProviderName;
  baseURL: string;
  apiKey: string;
  defaultModel: string;
}

function makeOpenAICompatible(cfg: OpenAICompatConfig): AIProvider {
  return {
    name: cfg.name,
    available: () => cfg.apiKey.length > 0 || cfg.name === "ollama",
    async complete(req: AICompletionRequest): Promise<AICompletionResponse> {
      const start = Date.now();
      const messages: AIChatMessage[] = req.systemPrompt
        ? [{ role: "system", content: req.systemPrompt }, ...req.messages]
        : req.messages;

      const body = {
        model: req.model || cfg.defaultModel,
        messages,
        temperature: req.temperature ?? config.ai.defaultTemperature,
        max_tokens: req.maxTokens ?? config.ai.maxTokens,
        ...(req.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (cfg.apiKey) {
        headers["Authorization"] = `Bearer ${cfg.apiKey}`;
      }
      if (cfg.name === "openrouter") {
        headers["HTTP-Referer"] = config.app.url;
        headers["X-Title"] = config.app.name;
      }

      const res = await fetch(`${cfg.baseURL}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`[${cfg.name}] HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? "";

      return {
        content: typeof content === "string" ? content : String(content ?? ""),
        provider: cfg.name,
        model: body.model,
        tokensUsed: data?.usage?.total_tokens,
        latencyMs: Date.now() - start,
      };
    },
  };
}

// ============================================================
// Gemini provider (Google Generative AI REST API)
// ============================================================

class GeminiProvider implements AIProvider {
  name: AIProviderName = "gemini";

  available() {
    return config.ai.keys.gemini.length > 0;
  }

  async complete(req: AICompletionRequest): Promise<AICompletionResponse> {
    const start = Date.now();
    const apiKey = config.ai.keys.gemini;
    if (!apiKey) throw new Error("Gemini API key not configured");

    const model = req.model || "gemini-1.5-flash";

    const contents = req.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: req.temperature ?? config.ai.defaultTemperature,
        maxOutputTokens: req.maxTokens ?? config.ai.maxTokens,
      },
    };
    if (req.systemPrompt) {
      body.systemInstruction = { parts: [{ text: req.systemPrompt }] };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[gemini] HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const content =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("") ?? "";

    return {
      content,
      provider: "gemini",
      model,
      tokensUsed: data?.usageMetadata?.totalTokenCount,
      latencyMs: Date.now() - start,
    };
  }
}

// ============================================================
// Provider registry
// ============================================================

const PROVIDERS: Record<AIProviderName, AIProvider> = {
  zai: new ZAIProvider(),
  gemini: new GeminiProvider(),
  groq: makeOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: config.ai.keys.groq,
    defaultModel: "llama-3.3-70b-versatile",
  }),
  openrouter: makeOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: config.ai.keys.openrouter,
    defaultModel: "meta-llama/llama-3.1-8b-instruct:free",
  }),
  deepseek: makeOpenAICompatible({
    name: "deepseek",
    baseURL: "https://api.deepseek.com/v1",
    apiKey: config.ai.keys.deepseek,
    defaultModel: "deepseek-chat",
  }),
  qwen: makeOpenAICompatible({
    name: "qwen",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey: config.ai.keys.qwen,
    defaultModel: "qwen-turbo",
  }),
  mistral: makeOpenAICompatible({
    name: "mistral",
    baseURL: "https://api.mistral.ai/v1",
    apiKey: config.ai.keys.mistral,
    defaultModel: "mistral-small-latest",
  }),
  llama: makeOpenAICompatible({
    name: "llama",
    baseURL: "https://api.together.xyz/v1",
    apiKey: config.ai.keys.openrouter,
    defaultModel: "meta-llama/Llama-3-8b-chat-hf",
  }),
  ollama: makeOpenAICompatible({
    name: "ollama",
    baseURL: `${config.ai.keys.ollamaUrl}/v1`,
    apiKey: "ollama",
    defaultModel: "llama3.1:8b",
  }),
};

// ============================================================
// Public API
// ============================================================

export function getProvider(name?: AIProviderName): AIProvider {
  const target = name ?? config.ai.provider;
  const provider = PROVIDERS[target];
  if (!provider) {
    throw new Error(`Unknown AI provider: ${target}`);
  }
  if (!provider.available()) {
    console.warn(
      `[ai] Provider "${target}" is not available (missing API key?). Falling back to "zai".`
    );
    return PROVIDERS.zai;
  }
  return provider;
}

export async function generateCompletion(
  req: AICompletionRequest
): Promise<AICompletionResponse> {
  const provider = getProvider();
  try {
    return await provider.complete(req);
  } catch (err) {
    // If the primary provider fails (e.g., 403 Forbidden, network error),
    // fall back to ZAI (which always works, no API key needed)
    if (provider.name !== "zai") {
      console.warn(`[ai] Provider "${provider.name}" failed (${err instanceof Error ? err.message : "unknown"}). Falling back to "zai".`);
      return await PROVIDERS.zai.complete(req);
    }
    throw err;
  }
}

/**
 * Convenience helper: single prompt → string response.
 */
export async function askAI(
  prompt: string,
  systemPrompt?: string,
  opts?: { temperature?: number; json?: boolean }
): Promise<string> {
  const res = await generateCompletion({
    messages: [{ role: "user", content: prompt }],
    systemPrompt,
    temperature: opts?.temperature,
    responseFormat: opts?.json ? "json" : "text",
  });
  return res.content;
}

/**
 * Convenience helper: ask for JSON output. Validates and parses.
 */
export async function askAIForJSON<T = unknown>(
  prompt: string,
  systemPrompt?: string
): Promise<T> {
  const raw = await askAI(prompt, systemPrompt, { json: true, temperature: 0.3 });
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("AI did not return valid JSON");
  }
  const jsonStr = raw.slice(start, end + 1);
  return JSON.parse(jsonStr) as T;
}

export function listAvailableProviders(): AIProviderName[] {
  return (Object.keys(PROVIDERS) as AIProviderName[]).filter((n) => PROVIDERS[n].available());
}
