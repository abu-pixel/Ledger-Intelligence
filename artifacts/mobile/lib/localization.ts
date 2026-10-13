import countryData from '@/data/countries.json';

export type CountryCurrency = {
  code: string;
  name: string;
  symbol: string;
};

export type CountryOption = {
  code: string;
  name: string;
  region: string;
  currencies: CountryCurrency[];
};

export type CurrencyOption = CountryCurrency;

export const COUNTRIES = countryData as CountryOption[];
export const COUNTRY_BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

export const AVAILABLE_CURRENCIES = Array.from(
  new Map(
    COUNTRIES.flatMap((country) => country.currencies).map((currency) => [
      currency.code,
      currency,
    ]),
  ).values(),
).sort((a, b) => a.code.localeCompare(b.code));

const LOCALE_BY_COUNTRY: Record<string, string> = {
  ET: 'en-ET',
  KE: 'en-KE',
  NG: 'en-NG',
  GH: 'en-GH',
  ZA: 'en-ZA',
  TZ: 'sw-TZ',
  UG: 'en-UG',
  RW: 'rw-RW',
  FR: 'fr-FR',
  DE: 'de-DE',
  ES: 'es-ES',
  IT: 'it-IT',
  PT: 'pt-PT',
  BR: 'pt-BR',
  MX: 'es-MX',
  JP: 'ja-JP',
  CN: 'zh-CN',
  IN: 'en-IN',
  GB: 'en-GB',
  US: 'en-US',
  CA: 'en-CA',
  AU: 'en-AU',
  NZ: 'en-NZ',
};

export function getCountryLocale(countryCode: string) {
  return LOCALE_BY_COUNTRY[countryCode] ?? `en-${countryCode}`;
}

export function getCountryName(countryCode: string) {
  return COUNTRY_BY_CODE.get(countryCode)?.name ?? countryCode;
}

export function getDefaultCurrencyCode(countryCode: string) {
  return COUNTRY_BY_CODE.get(countryCode)?.currencies[0]?.code ?? null;
}

export function getCurrencySymbol(currencyCode: string, countryCode: string) {
  try {
    const parts = new Intl.NumberFormat(getCountryLocale(countryCode), {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'symbol',
    }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value ?? currencyCode;
  } catch {
    return currencyCode;
  }
}

export function formatMoney(amount: number, currencyCode: string, countryCode: string) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(getCountryLocale(countryCode), {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: Number.isInteger(safeAmount) ? 0 : 2,
    }).format(safeAmount);
  } catch {
    return `${safeAmount.toFixed(2)} ${currencyCode}`;
  }
}

export function formatDate(isoDate: string, countryCode: string) {
  const date = new Date(isoDate);
  if (!Number.isFinite(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(getCountryLocale(countryCode), {
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  }
}

export function formatMonth(date: Date, countryCode: string) {
  try {
    return new Intl.DateTimeFormat(getCountryLocale(countryCode), { month: 'short' }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
  }
}

export function formatLongToday(date: Date, countryCode: string) {
  try {
    return new Intl.DateTimeFormat(getCountryLocale(countryCode), {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(date).toUpperCase();
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(date).toUpperCase();
  }
}

export function parseLocalizedAmount(rawValue: string, countryCode: string) {
  const value = rawValue.trim();
  if (!value) return Number.NaN;

  let group = ',';
  let decimal = '.';
  try {
    const parts = new Intl.NumberFormat(getCountryLocale(countryCode)).formatToParts(12345.6);
    group = parts.find((part) => part.type === 'group')?.value ?? group;
    decimal = parts.find((part) => part.type === 'decimal')?.value ?? decimal;
  } catch {
    // Keep the widely used comma-grouping, period-decimal fallback.
  }

  const compact = value.replace(/[\s\u00a0\u202f'’]/g, '');
  const lastDot = compact.lastIndexOf('.');
  const lastComma = compact.lastIndexOf(',');
  let decimalSeparator = '';

  if (lastDot >= 0 && lastComma >= 0) {
    decimalSeparator = lastDot > lastComma ? '.' : ',';
  } else if (lastDot >= 0 || lastComma >= 0) {
    const separator = lastDot >= 0 ? '.' : ',';
    const digitsAfter = compact.length - compact.lastIndexOf(separator) - 1;
    if (digitsAfter > 0 && digitsAfter <= 2) {
      decimalSeparator = separator;
    }
  } else if (decimal && decimal !== group && compact.includes(decimal)) {
    decimalSeparator = decimal;
  }

  const normalized = compact
    .replace(/[.,]/g, (separator) => (separator === decimalSeparator ? '.' : ''))
    .replace(/[^0-9.+-]/g, '');
  return normalized ? Number(normalized) : Number.NaN;
}
