const numberFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 0
});

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short"
});

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric"
});

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Never";
  }

  return dateTimeFormatter.format(new Date(value));
}

export function formatShortDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function readableUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return value;
  }
}
