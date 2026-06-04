export const DEV_WORDS = [
  "REACT",
  "CRANE",
  "SLATE",
  "AUDIO",
  "HOUSE",
  "MOUSE",
  "PLANT",
  "BRAIN",
  "CLOUD",
  "STONE",
  "GRAPE",
  "LEMON",
  "MANGO",
  "PEACH",
  "BERRY",
  "TIGER",
  "ZEBRA",
  "EAGLE",
  "ROBOT",
  "LASER",
  "PIXEL",
  "MEDIA",
  "VIDEO",
  "RADIO",
  "MUSIC",
  "DANCE",
  "LIGHT",
  "NIGHT",
  "WATER",
  "EARTH",
  "OCEAN",
  "RIVER",
  "MOUNT",
  "FIELD",
  "FLAME",
  "SPARK",
  "CHAIN",
  "BLOCK",
  "TOKEN",
  "MINER",
] as const;

export const DEV_DICTIONARY: ReadonlySet<string> = new Set(DEV_WORDS);

export function devAnswerForDay(day: number): string {
  const len = DEV_WORDS.length;
  return DEV_WORDS[((day % len) + len) % len];
}
