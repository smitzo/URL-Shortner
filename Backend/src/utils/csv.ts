export function csvCell(value: string | number | Date | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = value instanceof Date ? value.toISOString() : String(value);
  const escaped = text.replaceAll('"', '""');

  if (/[",\n\r]/.test(escaped)) {
    return `"${escaped}"`;
  }

  return escaped;
}

export function toCsv(rows: Array<Record<string, string | number | Date | null | undefined>>) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0] ?? {});
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ];

  return `${lines.join("\n")}\n`;
}
