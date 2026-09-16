export const safeFormatCurrency = (amount, currencyCode = 'USD', options = {}) => {
  try {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currencyCode,
      ...options
    }).format(amount);
  } catch (e) {
    // Fallback if currencyCode is invalid (e.g. "AU" instead of "AUD")
    const num = Number(amount);
    const formattedNum = options.maximumFractionDigits === 0 ? Math.round(num).toString() : num.toFixed(2);
    return `${currencyCode} ${formattedNum}`;
  }
};
