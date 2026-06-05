export const STORAGE_NAMESPACE = "wordlelo";

export function dayStorageKey(day: number): string {
  return `${STORAGE_NAMESPACE}:game:${day}`;
}

export const SETTINGS_STORAGE_KEY = `${STORAGE_NAMESPACE}:settings`;
export const STATS_STORAGE_KEY = `${STORAGE_NAMESPACE}:stats`;

export function msUntil(iso: string, now: number): number {
  const target = new Date(iso).getTime();
  return Math.max(0, target - now);
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
