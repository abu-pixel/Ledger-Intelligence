const POLLINATIONS_BASE_URL = (
  process.env.POLLINATIONS_BASE_URL?.trim() || "https://text.pollinations.ai"
).replace(/\/+$/, "");
const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL?.trim() || "openai-fast";

const responseHeaders = {
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
};

type GuidanceRequest = {
  question: string;
  countryCode: string;
  countryName: string;
  currencyCode: string;
  cashBalance: number;
  currentMonthIncome: number;
  currentMonthExpense: number;
  outstandingInvoiceAmount: number;
  unpaidInvoiceCount: number;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedNumber(
  value: unknown,
  min: number,
  max: number,
  integer = false,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max &&
    (!integer || Number.isInteger(value))
  );
}

function parseRequest(value: unknown): GuidanceRequest | null {
  if (!isObject(value)) return null;
  const {
    question,
    countryCode,
    countryName,
    currencyCode,
    cashBalance,
    currentMonthIncome,
    currentMonthExpense,
    outstandingInvoiceAmount,
    unpaidInvoiceCount,
  } = value;

  if (typeof question !== "string" || question.trim().length < 1 || question.length > 1200) {
    return null;
  }
  if (typeof countryCode !== "string" || !/^[A-Z]{2}$/.test(countryCode)) return null;
  if (typeof countryName !== "string" || countryName.length < 1 || countryName.length > 80) {
    return null;
  }
  if (typeof currencyCode !== "string" || !/^[A-Z]{3}$/.test(currencyCode)) return null;
  if (!isBoundedNumber(cashBalance, -1_000_000_000_000, 1_000_000_000_000)) return null;
  if (!isBoundedNumber(currentMonthIncome, 0, 1_000_000_000_000)) return null;
  if (!isBoundedNumber(currentMonthExpense, 0, 1_000_000_000_000)) return null;
  if (!isBoundedNumber(outstandingInvoiceAmount, 0, 1_000_000_000_000)) return null;
  if (!isBoundedNumber(unpaidInvoiceCount, 0, 100_000, true)) return null;

  return {
    question: question.trim(),
    countryCode,
    countryName,
    currencyCode,
    cashBalance,
    currentMonthIncome,
    currentMonthExpense,
    outstandingInvoiceAmount,
    unpaidInvoiceCount,
  };
}

function extractAnswer(payload: unknown): string | null {
  if (!isObject(payload)) return null;
  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0];
  if (!isObject(first)) return null;
  const message = first.message;
  if (!isObject(message)) return null;
  const content = message.content;

  if (typeof content === "string") {
    return content.trim() || null;
  }
  if (Array.isArray(content)) {
    const answer = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (isObject(part) && typeof part.text === "string") return part.text;
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

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: { ...responseHeaders, ...headers },
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "The question or financial summary is invalid." }, 400);
  }

  if (isObject(body) && body.consentAccepted !== true) {
    return json(
      { error: "Enable the assistant's limited data sharing in Settings first." },
      403,
    );
  }

  const data = parseRequest(body);
  if (!data) {
    return json({ error: "The question or financial summary is invalid." }, 400);
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
    question: data.question,
    country: `${data.countryName} (${data.countryCode})`,
    currency: data.currencyCode,
    aggregateLedgerSummary: {
      currentCashBalance: data.cashBalance,
      currentMonthIncome: data.currentMonthIncome,
      currentMonthExpenses: data.currentMonthExpense,
      outstandingInvoiceTotal: data.outstandingInvoiceAmount,
      unpaidInvoiceCount: data.unpaidInvoiceCount,
    },
  });

  try {
    const response = await fetch(`${POLLINATIONS_BASE_URL}/openai`, {
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
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const retryAfterSeconds = parseRetryAfter(response.headers.get("retry-after"));
      if (response.status === 402 || response.status === 429) {
        return json(
          {
            error: retryAfterSeconds
              ? `The free AI service allows one request at a time. Try again in ${retryAfterSeconds} seconds.`
              : "The free AI service is receiving too many requests. Please try again shortly.",
          },
          429,
          retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {},
        );
      }
      return json(
        {
          error:
            response.status >= 500
              ? "The free AI service is temporarily unavailable. Please try again shortly."
              : "The AI assistant could not respond. Please try again shortly.",
        },
        response.status >= 500 ? 503 : 502,
      );
    }

    const answer = extractAnswer(await response.json());
    if (!answer) {
      return json(
        { error: "The AI assistant returned an empty response. Please try again." },
        502,
      );
    }
    return json({ answer: answer.slice(0, 5000) });
  } catch {
    return json(
      { error: "The free AI service is temporarily unavailable. Please try again shortly." },
      503,
    );
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...responseHeaders,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
