import { SheetRow } from "../types";

export const parseCSV = (csvText: string): { columns: string[]; data: SheetRow[] } => {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return { columns: [], data: [] };

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const data: SheetRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i].split(',');
    // Basic CSV splitting (does not handle commas inside quotes perfectly for this simple demo)
    if (currentLine.length === headers.length) {
      const row: any = { id: crypto.randomUUID() };
      headers.forEach((header, index) => {
        const val = currentLine[index].trim().replace(/^"|"$/g, '');
        // Try to parse number
        const numVal = Number(val);
        row[header] = !isNaN(numVal) && val !== '' ? numVal : val;
      });
      data.push(row);
    }
  }

  return { columns: headers, data };
};

export const exportToCSV = (columns: string[], data: SheetRow[]): string => {
  const headers = columns.join(',');
  const rows = data.map(row => {
    return columns.map(col => {
      const val = row[col];
      // Escape quotes
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
  });
  return [headers, ...rows].join('\n');
};