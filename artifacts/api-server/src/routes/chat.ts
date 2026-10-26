import { Router, type IRouter } from "express";
import {
  CreateChatCompletionBody,
  CreateChatCompletionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const CHAT_REQUEST_WINDOW_MS = 60_000;
const CHAT_REQUESTS_PER_WINDOW = 30;
const MAX_HISTORY_CONTEXT_CHARS = 24_000;
const OPENROUTER_CHAT_COMPLETIONS_URL =
  "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_FREE_MODEL = "openrouter/free";
const recentChatRequestTimes: number[] = [];

const V6_SYSTEM_PROMPT = `You are V6 Trader Assistance, an educational assistant specializing in futures trading.

Explain futures concepts clearly to beginners without talking down to experienced traders. Help users reason through setups, including market structure, support and resistance, rejection wicks, breakouts, false breakouts, break-and-retests, entries, stop losses, confirmation, invalidation, and risk/reward.

Be honest about uncertainty and missing information. You do not have live prices, current charts, account balances, or a user's trading data unless they provide them in the conversation. Never fabricate market data or claim that you placed or executed a trade. Do not present analysis as a guarantee of profit. Encourage disciplined risk management and clarify that your analysis is educational, not a promise of results.

Response style: Use plain text by default. Do not use Markdown heading symbols (#), asterisks for bold or italics, decorative separators, or emojis. Avoid unnecessary symbols and excessive formatting. Write naturally and professionally, like a knowledgeable trading assistant speaking directly to the user. Keep paragraphs short and clear. Use numbered lists only for sequential steps or procedures, simple bullets only when they improve clarity, and tables only when a comparison genuinely benefits from one. Avoid unnecessary introductions, repetitive summaries, and excessive disclaimers. Match the user's level of knowledge and explain trading terms when needed. For trading analysis, be precise about the setup, confirmation, invalidation, and risk management. Never sacrifice accuracy or omit important risk information for brevity.`;

function isChatRateLimited(now = Date.now()): boolean {
  while (
    recentChatRequestTimes.length > 0 &&
    recentChatRequestTimes[0] <= now - CHAT_REQUEST_WINDOW_MS
  ) {
    recentChatRequestTimes.shift();
  }
  if (recentChatRequestTimes.length >= CHAT_REQUESTS_PER_WINDOW) return true;
  recentChatRequestTimes.push(now);
  return false;
}

function selectRecentHistory<T extends { content: string }>(messages: T[]): T[] {
  const selected: T[] = [];
  let contentLength = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (contentLength + message.content.length > MAX_HISTORY_CONTEXT_CHARS) {
      break;
    }
    selected.unshift(message);
    contentLength += message.content.length;
  }

  return selected;
}

router.post("/chat/completions", async (req, res): Promise<void> => {
  const parsed = CreateChatCompletionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "The conversation contains an invalid message. Please try again.",
      code: "INVALID_REQUEST",
    });
    return;
  }

  const lastMessage = parsed.data.messages.at(-1);
  const oversizedUserMessage = parsed.data.messages.some(
    ({ role, content }) => role === "user" && content.length > 1000,
  );
  if (oversizedUserMessage) {
    res.status(400).json({
      error: "Each message must be 1,000 characters or fewer.",
      code: "INVALID_REQUEST",
    });
    return;
  }

  if (
    !lastMessage ||
    lastMessage.role !== "user" ||
    lastMessage.content.trim().length === 0
  ) {
    res.status(400).json({
      error: "Add a non-empty message before sending.",
      code: "INVALID_REQUEST",
    });
    return;
  }

  if (isChatRateLimited()) {
    res.status(429).json({
      error: "V6 is receiving too many requests. Wait a moment and try again.",
      code: "RATE_LIMITED",
    });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).json({
      error:
        "OpenRouter is not configured yet. Add OPENROUTER_API_KEY in Replit Secrets, then restart the API server.",
      code: "AI_NOT_CONFIGURED",
    });
    return;
  }

  try {
    const upstreamResponse = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_FREE_MODEL,
        max_tokens: 8192,
        messages: [
          { role: "system", content: V6_SYSTEM_PROMPT },
          ...selectRecentHistory(parsed.data.messages).map(({ role, content }) => ({
            role,
            content,
          })),
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (upstreamResponse.status === 429) {
      res.status(429).json({
        error:
          "OpenRouter's free model is rate-limiting requests right now. Wait a moment and try again.",
        code: "RATE_LIMITED",
      });
      return;
    }

    if (upstreamResponse.status === 401) {
      req.log.warn(
        { model: OPENROUTER_FREE_MODEL },
        "OpenRouter rejected the configured API key",
      );
      res.status(503).json({
        error:
          "OpenRouter rejected the configured API key. Check OPENROUTER_API_KEY in Replit Secrets, then restart the API server.",
        code: "AI_NOT_CONFIGURED",
      });
      return;
    }

    if (upstreamResponse.status === 402 || upstreamResponse.status === 403) {
      req.log.warn(
        {
          model: OPENROUTER_FREE_MODEL,
          upstreamStatus: upstreamResponse.status,
        },
        "OpenRouter could not serve the free model",
      );
      res.status(503).json({
        error:
          "OpenRouter could not provide a free model for this request. Check free-model access and availability; V6 will not use paid models.",
        code: "UPSTREAM_ERROR",
      });
      return;
    }

    if (!upstreamResponse.ok) {
      req.log.warn(
        {
          model: OPENROUTER_FREE_MODEL,
          upstreamStatus: upstreamResponse.status,
        },
        "OpenRouter returned an unsuccessful chat response",
      );
      res.status(502).json({
        error:
          "V6 could not reach the AI service. Check your connection and try again.",
        code: "UPSTREAM_ERROR",
      });
      return;
    }

    const completion: unknown = await upstreamResponse.json();
    const reply =
      typeof completion === "object" &&
      completion !== null &&
      "choices" in completion &&
      Array.isArray(completion.choices) &&
      typeof completion.choices[0] === "object" &&
      completion.choices[0] !== null &&
      "message" in completion.choices[0] &&
      typeof completion.choices[0].message === "object" &&
      completion.choices[0].message !== null &&
      "content" in completion.choices[0].message &&
      typeof completion.choices[0].message.content === "string"
        ? completion.choices[0].message.content.trim()
        : "";
    if (!reply) {
      req.log.warn(
        { model: OPENROUTER_FREE_MODEL },
        "OpenRouter returned an empty chat response",
      );
      res.status(502).json({
        error: "V6 could not generate a response. Please try again.",
        code: "UPSTREAM_ERROR",
      });
      return;
    }

    res.json(CreateChatCompletionResponse.parse({ reply }));
  } catch (error) {
    req.log.error(
      {
        model: OPENROUTER_FREE_MODEL,
        errorName: error instanceof Error ? error.name : "UnknownError",
      },
      "OpenRouter chat request failed",
    );
    res.status(502).json({
      error:
        "V6 could not reach the AI service. Check your connection and try again.",
      code: "UPSTREAM_ERROR",
    });
  }
});

export default router;
