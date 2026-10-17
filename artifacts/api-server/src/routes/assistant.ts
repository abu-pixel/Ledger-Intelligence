import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import OpenAI from "openai";
import {
  AskAccountingAssistantResponse,
  AskAccountingAssistantBody,
  GetAiStatusResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();
let openAIClient: OpenAI | null = null;
let activeApiKey: string | null = null;

const assistantRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Please wait before sending another assistant question." },
});

router.get("/ai/status", (_req, res) => {
  const apiKey = process.env.GROQ_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  const data = GetAiStatusResponse.parse({
    available: Boolean(apiKey),
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

  const groqKey = process.env.GROQ_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const apiKey = groqKey || openaiKey;

  if (!apiKey) {
    res.status(503).json({
      error: "The AI assistant is not configured yet. Add GROQ_API_KEY or OPENAI_API_KEY in environment settings.",
    });
    return;
  }

  const isGroq = Boolean(groqKey) || apiKey.startsWith("gsk_");
  const baseURL = isGroq
    ? process.env.GROQ_BASE_URL?.trim() || "https://api.groq.com/openai/v1"
    : process.env.OPENAI_BASE_URL?.trim() || undefined;
  const defaultModel = isGroq ? "qwen/qwen3.8-27b" : "gpt-4o-mini";
  const model = (isGroq ? process.env.GROQ_MODEL?.trim() : process.env.OPENAI_MODEL?.trim()) || defaultModel;

  const clientKey = `${apiKey}:${baseURL || "default"}`;
  if (!openAIClient || activeApiKey !== clientKey) {
    openAIClient = new OpenAI({
      apiKey,
      baseURL,
      timeout: 45_000,
      maxRetries: 0,
    });
    activeApiKey = clientKey;
  }

  try {
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
      question: request.data.question.trim(),
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

    const response = await openAIClient.chat.completions.create({
      model,
      max_tokens: 600,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: inputData },
      ],
    });

    const answer = response.choices[0]?.message?.content?.trim();
    if (!answer) {
      res.status(502).json({ error: "The AI assistant returned an empty response. Please try again." });
      return;
    }

    res.json(AskAccountingAssistantResponse.parse({ answer: answer.slice(0, 5000) }));
  } catch (error) {
    const status =
      error instanceof OpenAI.APIError && Number.isInteger(error.status)
        ? error.status
        : undefined;
    logger.warn({ providerStatus: status }, "AI accounting guidance request failed");
    res.status(status === 429 ? 503 : 502).json({
      error:
        status === 429
          ? "The AI provider is busy or its usage limit was reached. Please try again later."
          : "The AI assistant could not respond. Please try again shortly.",
    });
  }
});

export default router;
