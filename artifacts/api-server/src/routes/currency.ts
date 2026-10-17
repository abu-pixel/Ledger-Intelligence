import { GetCurrencyRatesResponse } from "@workspace/api-zod";
import { rateLimit } from "express-rate-limit";
import { Router, type IRouter } from "express";

const router: IRouter = Router();
const RATE_CACHE_TTL_MS = 60 * 60 * 1000;
const rateCache = new Map<
  string,
  { expiresAt: number; data: { base: string; rates: Record<string, number>; updatedAt: Date; provider: "ExchangeRate-API" } }
>();

const currencyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Please wait before refreshing exchange rates." },
});

router.get("/currency-rates", currencyRateLimit, async (req, res): Promise<void> => {
  const base = typeof req.query.base === "string" ? req.query.base : "";
  if (!/^[A-Z]{3}$/.test(base)) {
    res.status(400).json({ error: "Choose a valid three-letter currency code." });
    return;
  }

  const cached = rateCache.get(base);
  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader("Cache-Control", "public, max-age=900");
    res.json(GetCurrencyRatesResponse.parse(cached.data));
    return;
  }

  try {
    const response = await fetch(
      `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`,
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!response.ok) throw new Error("Exchange-rate provider returned an error.");
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new Error("Exchange-rate provider returned invalid data.");
    }

    const record = result as Record<string, unknown>;
    const rawRates = record.rates;
    const baseCode = record.base_code;
    const updatedUtc = record.time_last_update_utc;
    if (
      record.result !== "success" ||
      baseCode !== base ||
      !rawRates ||
      typeof rawRates !== "object" ||
      Array.isArray(rawRates) ||
      typeof updatedUtc !== "string"
    ) {
      throw new Error("Exchange-rate provider returned incomplete data.");
    }

    const updatedAt = new Date(updatedUtc);
    const rates = Object.fromEntries(
      Object.entries(rawRates).filter(
        (entry): entry is [string, number] =>
          /^[A-Z]{3}$/.test(entry[0]) &&
          typeof entry[1] === "number" &&
          Number.isFinite(entry[1]) &&
          entry[1] > 0,
      ),
    );
    const data = GetCurrencyRatesResponse.parse({
      base,
      rates,
      updatedAt,
      provider: "ExchangeRate-API",
    });

    rateCache.set(base, { data, expiresAt: Date.now() + RATE_CACHE_TTL_MS });
    res.setHeader("Cache-Control", "public, max-age=900");
    res.json(data);
  } catch {
    res.status(502).json({
      error: "Live exchange rates are temporarily unavailable. Try again later.",
    });
  }
});

export default router;
