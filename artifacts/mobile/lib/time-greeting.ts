export type TimeGreeting = 'Good morning' | 'Good afternoon' | 'Good evening';

export function greetingForLocalHour(hour: number): TimeGreeting {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError('Hour must be an integer from 0 to 23.');
  }
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getLocalTimeGreeting(now = new Date()): TimeGreeting {
  return greetingForLocalHour(now.getHours());
}
