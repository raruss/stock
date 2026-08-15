/** Мінімальний CSV-серіалізатор за RFC 4180 — без зовнішньої залежності. */

export function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const head = columns.map(escapeCell).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCell(row[c])).join(','));
  // BOM — щоб Excel не ламав кирилицю при відкритті файлу подвійним кліком.
  return '﻿' + [head, ...body].join('\r\n');
}

function escapeCell(value: unknown): string {
  if (value == null) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Відкладаємо на тік, інакше Safari іноді скасовує завантаження на півдорозі.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
