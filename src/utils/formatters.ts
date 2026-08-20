export function formatCurrency(amount: number | string | null | undefined, symbol = '₹'): string {
  const num = Number(amount) || 0;
  // Format to Indian numbering system (e.g. 1,23,456.00)
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${symbol} ${formatted}`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return dateString;
  }
}

export function formatQuantity(qty: number | string, unit = 'KG'): string {
  const num = Number(qty) || 0;
  // If integer show integer, else 3 decimals
  const formatted = num % 1 === 0 ? num.toString() : num.toFixed(3);
  return `${formatted} ${unit}`;
}
