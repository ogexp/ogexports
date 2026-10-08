export type DateOnlyParts = {
  year: number;
  month: number;
  day: number;
};

export const MIN_BIRTH_YEAR = 1900;

export function getDaysInMonth(year: number, month: number): number {
  if (!Number.isInteger(year) || year < 1 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) {
    return 0;
  }

  if (month === 2) {
    const isLeapYear = year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
    return isLeapYear ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function parseDateOnly(value: string): DateOnlyParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, rawYear, rawMonth, rawDay] = match;
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);
  const daysInMonth = getDaysInMonth(year, month);

  if (!daysInMonth || day < 1 || day > daysInMonth) return null;
  return { year, month, day };
}

export function formatDateOnly(date: DateOnlyParts): string {
  return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

export function formatDateOnlyForLocale(value: string, locale: string): string {
  const date = parseDateOnly(value);
  if (!date) return '';

  const localDate = new Date(2000, date.month - 1, date.day, 12);
  localDate.setFullYear(date.year);

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(localDate);
}

export function getTodayParts(now = new Date()): DateOnlyParts {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

export function getCalendarGrid(year: number, month: number): Array<number | null> {
  const daysInMonth = getDaysInMonth(year, month);
  if (!daysInMonth) return [];

  const firstOfMonth = new Date(2000, month - 1, 1, 12);
  firstOfMonth.setFullYear(year);
  const leadingDays = firstOfMonth.getDay();

  return Array.from({ length: 42 }, (_, index) => {
    const day = index - leadingDays + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
}

export function isDateAfter(left: DateOnlyParts, right: DateOnlyParts): boolean {
  if (left.year !== right.year) return left.year > right.year;
  if (left.month !== right.month) return left.month > right.month;
  return left.day > right.day;
}

export function shiftCalendarMonth(
  date: Pick<DateOnlyParts, 'year' | 'month'>,
  offset: number,
): Pick<DateOnlyParts, 'year' | 'month'> {
  const totalMonths = date.year * 12 + date.month - 1 + offset;
  return {
    year: Math.floor(totalMonths / 12),
    month: ((totalMonths % 12) + 12) % 12 + 1,
  };
}
