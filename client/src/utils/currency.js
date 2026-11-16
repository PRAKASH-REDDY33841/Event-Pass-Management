// Event-Specific Currency Engine
// The organizer decides the currency and pricing per event (e.g. INR ₹, USD $, EUR €, etc.)
// The exact currency chosen by the organizer is displayed on that event without arbitrary conversions.

export const SUPPORTED_CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', flag: '🇮🇳', decimals: 0 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar (USD)', flag: '🇺🇸', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro (EUR)', flag: '🇪🇺', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', flag: '🇬🇧', decimals: 2 },
  AED: { code: 'AED', symbol: 'AED ', name: 'UAE Dirham (AED)', flag: '🇦🇪', decimals: 2 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CAD)', flag: '🇨🇦', decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (AUD)', flag: '🇦🇺', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen (JPY)', flag: '🇯🇵', decimals: 0 },
  SGD: { code: 'SGD', symbol: 'SG$', name: 'Singapore Dollar (SGD)', flag: '🇸🇬', decimals: 2 },
};

/**
 * Format an event price directly using the organizer's designated event currency
 */
export function formatCurrency(amount, currencyCode = 'INR', showFreeLabel = true) {
  const num = Number(amount) || 0;
  const code = (currencyCode || 'INR').toUpperCase();
  const config = SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.INR;

  if (num === 0 && showFreeLabel) {
    return `FREE (${config.symbol}0.00)`;
  }

  const formatted = config.decimals === 0
    ? Math.round(num).toLocaleString('en-US')
    : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `${config.symbol}${formatted}`;
}

/**
 * Format pricing range for an event in its own currency (e.g. "Free – ₹499" or "₹999 – ₹2,999")
 */
export function formatPriceRange(minPrice, maxPrice, currencyCode = 'INR') {
  const min = Number(minPrice) || 0;
  const max = Number(maxPrice) || 0;

  if (max === 0) return '100% Free Pass';
  if (min === 0) return `Free – ${formatCurrency(max, currencyCode, false)}`;
  if (min === max) return formatCurrency(min, currencyCode, false);
  return `${formatCurrency(min, currencyCode, false)} – ${formatCurrency(max, currencyCode, false)}`;
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currencyCode = 'INR') {
  const code = (currencyCode || 'INR').toUpperCase();
  return SUPPORTED_CURRENCIES[code]?.symbol || '₹';
}
