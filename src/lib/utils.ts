
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ExportData {
  [key: string]: any;
}

export function exportToCsv(data: ExportData[], filename: string): void {
  // Convert data to CSV format
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => headers.map(header => {
      // Handle values with commas by wrapping in quotes
      const value = String(row[header]);
      return value.includes(',') ? `"${value}"` : value;
    }).join(','))
  ].join('\n');

  // Create a Blob and download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
