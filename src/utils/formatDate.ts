import { format, isToday, isYesterday } from 'date-fns';

export function formatDateTime(value: string | number | Date): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  const time = format(date, 'h:mm a');
  if (isToday(date)) {
    return `Today, ${time}`;
  }

  if (isYesterday(date)) {
    return `Yesterday, ${time}`;
  }

  return format(date, 'dd MMM, h:mm a');
}

export function formatShortTime(value: string | number | Date): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '--:--' : format(date, 'h:mm a');
}

export function formatDateRangeLabel(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${format(startDate, 'dd MMM yyyy')} - ${format(endDate, 'dd MMM yyyy')}`;
}
