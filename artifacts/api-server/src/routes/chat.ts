import OpenAI from "openai";
import { Router, type IRouter } from "express";
import {
  CreateChatCompletionBody,
  CreateChatCompletionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const CHAT_REQUEST_WINDOW_MS = 60_000;
const CHAT_REQUESTS_PER_WINDOW = 30;
const recentChatRequestTimes: number[] = [];

const V6_SYSTEM_PROMPT = `You are V6 Trader Assistance, an educational assistant specializing in futures trading.

Explain futures concepts clearly to beginners without talking down to experienced traders. Help users reason through setups, including market structure, support and resistance, rejection wicks, breakouts, false breakouts, break-and-retests, entries, stop losses, confirmation, invalidation, and risk/reward.

Be honest about uncertainty and missing information. You do not have live prices, current charts, account balances, or a user's trading data unless they provide them in the conversation. Never fabricate market data or claim that you placed or executed a trade. Do not present analysis as a guarantee of profit. Encourage disciplined risk management and clarify that your analysis is educational, not a promise of results.`;

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

router.post("/chat/completions", async (req, res): Promise<void> => {
  const parsed = CreateChatCompletionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error:
        "Enter a message under 1,000 characters. The recent conversation is limited to 12 messages.",
      code: "INVALID_REQUEST",
    });
    return;
  }

  const lastMessage = parsed.data.messages.at(-1);
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

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).json({
      error:
        "OpenAI is not configured yet. Add OPENAI_API_KEY in Replit Secrets, then restart the API server.",
      code: "AI_NOT_CONFIGURED",
    });
    return;
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini";

  try {
    const client = new OpenAI({
      apiKey,
      maxRetries: 0,
      timeout: 60_000,
    });
    const completion = await client.chat.completions.create({
      model,
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: V6_SYSTEM_PROMPT },
        ...parsed.data.messages.map(({ role, content }) => ({
          role,
          content,
        })),
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) {
      req.log.warn({ model }, "OpenAI returned an empty chat response");
      res.status(502).json({
        error: "V6 could not generate a response. Please try again.",
        code: "UPSTREAM_ERROR",
      });
      return;
    }

    res.json(CreateChatCompletionResponse.parse({ reply }));
  } catch (error) {
    if (error instanceof OpenAI.APIError && error.status === 429) {
      res.status(429).json({
        error:
          "OpenAI is rate-limiting requests right now. Wait a moment and try again.",
        code: "RATE_LIMITED",
      });
      return;
    }

    if (error instanceof OpenAI.APIError && error.status === 401) {
      req.log.warn({ model }, "OpenAI rejected the configured API key");
      res.status(503).json({
        error:
          "OpenAI rejected the configured API key. Replace OPENAI_API_KEY in Replit Secrets with a valid key, then restart the API server.",
        code: "AI_NOT_CONFIGURED",
      });
      return;
    }

    req.log.error(
      {
        model,
        upstreamStatus:
          error instanceof OpenAI.APIError ? error.status : undefined,
        errorName:
          error instanceof Error ? error.name : "UnknownOpenAIError",
      },
      "OpenAI chat request failed",
    );
    res.status(502).json({
      error:
        "V6 could not reach the AI service. Check your connection and try again.",
      code: "UPSTREAM_ERROR",
    });
  }
});

export default router;
