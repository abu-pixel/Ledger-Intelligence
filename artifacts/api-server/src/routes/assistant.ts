import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import {
  AskAccountingAssistantResponse,
  AskAccountingAssistantBody,
  GetAiStatusResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const POLLINATIONS_BASE_URL = (
  process.env.POLLINATIONS_BASE_URL?.trim() || "https://text.pollinations.ai"
).replace(/\/+$/, "");
const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL?.trim() || "openai-fast";
const PROVIDER_TIMEOUT_MS = 60_000;
const STATUS_CACHE_MS = 60_000;
const STATUS_FAILURE_CACHE_MS = 15_000;

const assistantRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Please wait before sending another assistant question." },
});

let statusCache: { available: boolean; expiresAt: number } | null = null;

function providerUrl(path: string): string {
  return `${POLLINATIONS_BASE_URL}${path}`;
}

function extractAnswer(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0];
  if (!first || typeof first !== "object") return null;
  const message = (first as { message?: unknown }).message;
  if (!message || typeof message !== "object") return null;
  const content = (message as { content?: unknown }).content;

  if (typeof content === "string") {
    const answer = content.trim();
    return answer || null;
  }

  if (Array.isArray(content)) {
    const answer = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const text = (part as { text?: unknown }).text;
          if (typeof text === "string") return text;
        }
        return "";
      })
      .join("")
      .trim();
    return answer || null;
  }

  return null;
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(Math.ceil(seconds), 3600);
  }
  const date = Date.parse(value);
  if (!Number.isNaN(date)) {
    return Math.min(Math.max(Math.ceil((date - Date.now()) / 1000), 1), 3600);
  }
  return null;
}

async function isProviderAvailable(): Promise<boolean> {
  if (statusCache && statusCache.expiresAt > Date.now()) {
    return statusCache.available;
  }

  try {
    const response = await fetch(providerUrl("/models"), {
      signal: AbortSignal.timeout(8_000),
      headers: { accept: "application/json" },
    });
    const available = response.ok;
    statusCache = {
      available,
      expiresAt: Date.now() + (available ? STATUS_CACHE_MS : STATUS_FAILURE_CACHE_MS),
    };
    return available;
  } catch {
    statusCache = {
      available: false,
      expiresAt: Date.now() + STATUS_FAILURE_CACHE_MS,
    };
    return false;
  }
}

router.get("/ai/status", async (_req, res) => {
  const data = GetAiStatusResponse.parse({
    available: await isProviderAvailable(),
  });
  res.setHeader("Cache-Control", "no-store");
  res.json(data);
});

router.post("/ai/accounting-guidance", requireAuth, assistantRateLimit, async (req, res) => {
  const request = AskAccountingAssistantBody.safeParse(req.body);
  if (!request.success) {
    res.status(400).json({ error: "The question or financial summary is invalid." });
    return;
  }
  if (!request.data.consentAccepted) {
    res.status(403).json({ error: "Enable the assistant's limited data sharing in Settings first." });
    return;
  }

  const question = request.data.question.trim();
  if (!question) {
    res.status(400).json({ error: "Enter a question for the assistant." });
    return;
  }

  const systemInstruction =
    "You are Ledgerly's general accounting assistant for small and growing businesses. " +
    "Answer the user's question clearly and concisely, using the provided country, currency, " +
    "and aggregate business totals when useful. Do not claim to file taxes, verify compliance, " +
    "or provide legal, tax, audit, investment, or payroll advice. Tax and filing rules vary by " +
    "jurisdiction and business circumstances: state uncertainty and direct the user to the " +
    "relevant official authority or a qualified local professional for decisions. Do not invent " +
    "rates or deadlines. Offer practical bookkeeping guidance and explain calculations. Keep " +
    "the answer under 200 words.";

  const inputData = JSON.stringify({
    question,
    country: `${request.data.countryName} (${request.data.countryCode})`,
    currency: request.data.currencyCode,
    aggregateLedgerSummary: {
      currentCashBalance: request.data.cashBalance,
      currentMonthIncome: request.data.currentMonthIncome,
      currentMonthExpenses: request.data.currentMonthExpense,
      outstandingInvoiceTotal: request.data.outstandingInvoiceAmount,
      unpaidInvoiceCount: request.data.unpaidInvoiceCount,
    },
  });

  try {
    const response = await fetch(providerUrl("/openai"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        model: POLLINATIONS_MODEL,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: inputData },
        ],
        max_tokens: 600,
        temperature: 0.3,
        stream: false,
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });

    if (!response.ok) {
      const retryAfterSeconds = parseRetryAfter(response.headers.get("retry-after"));

      if (response.status === 402 || response.status === 429) {
        if (retryAfterSeconds) {
          res.setHeader("Retry-After", String(retryAfterSeconds));
        }
        logger.warn(
          { providerStatus: response.status, retryAfterSeconds },
          "Free AI provider rate limit reached",
        );
        res.status(429).json({
          error: retryAfterSeconds
            ? `The free AI service allows one request at a time. Try again in ${retryAfterSeconds} seconds.`
            : "The free AI service is receiving too many requests. Please try again shortly.",
        });
        return;
      }

      logger.warn(
        { providerStatus: response.status, retryAfterSeconds },
        "Free AI provider request failed",
      );
      res.status(response.status >= 500 ? 503 : 502).json({
        error:
          response.status >= 500
            ? "The free AI service is temporarily unavailable. Please try again shortly."
            : "The AI assistant could not respond. Please try again shortly.",
      });
      return;
    }

    const payload: unknown = await response.json();
    const answer = extractAnswer(payload);
    if (!answer) {
      res.status(502).json({ error: "The AI assistant returned an empty response. Please try again." });
      return;
    }

    res.json(AskAccountingAssistantResponse.parse({ answer: answer.slice(0, 5000) }));
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    logger.warn({ timedOut }, "Free AI provider request failed");
    res.status(503).json({
      error: "The free AI service is temporarily unavailable. Please try again shortly.",
    });
  }
});

export default router;
