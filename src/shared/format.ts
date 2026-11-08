const numbers = new Map<string, Intl.NumberFormat>();

export function formatValue(
  value: number,
  format = "number",
  sign: "auto" | "always" = "auto",
  compact = false,
): string {
  const key = `${format}:${sign}:${compact}`;
  let formatter = numbers.get(key);
  if (!formatter) {
    const options: Intl.NumberFormatOptions = {
      maximumFractionDigits: 2,
      signDisplay: sign,
    };
    if (format === "percent")
      Object.assign(options, { style: "percent", maximumFractionDigits: 1 });
    if (format.startsWith("currency:"))
      Object.assign(options, {
        style: "currency",
        currency: format.slice(9),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        trailingZeroDisplay: "stripIfInteger",
      });
    if (compact && format === "number")
      Object.assign(options, { notation: "compact", maximumFractionDigits: 1 });
    formatter = new Intl.NumberFormat("en-GB", options);
    numbers.set(key, formatter);
  }
  return (
    formatter.format(value) + (format === "percentage-points" ? " pt" : "")
  );
}

export function formatDate(timestamp: number, detailed = false): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "short",
    ...(detailed ? { day: "numeric", year: "numeric" } : {}),
  }).format(timestamp);
}

export function valueSentiment(
  value: number,
  semantics = "neutral",
): "positive" | "negative" | "neutral" {
  if (value === 0 || semantics === "neutral") return "neutral";
  return value > 0 === (semantics === "higher-is-better")
    ? "positive"
    : "negative";
}
