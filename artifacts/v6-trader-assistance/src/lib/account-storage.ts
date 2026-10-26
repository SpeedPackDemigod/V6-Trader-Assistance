const LEGACY_OWNER_KEY = "v6-trader-assistance:legacy-data-owner:v1";
const LEGACY_DATA_KEYS = [
  "v6-trader-assistance:chat-history:v1",
  "v6-trader-assistance:journal-trades:v1",
  "v6-trader-assistance:strategies:v1",
  "v6-trader-settings:v1",
  "v6-trading-academy-progress:v1",
];

export function getAccountStorageKey(key: string, userId: string): string {
  return `${key}:account:${encodeURIComponent(userId)}`;
}

export function claimLegacyAccountData(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    const owner = window.localStorage.getItem(LEGACY_OWNER_KEY);
    if (owner && owner !== userId) return;

    for (const key of LEGACY_DATA_KEYS) {
      const scopedKey = getAccountStorageKey(key, userId);
      if (window.localStorage.getItem(scopedKey) !== null) continue;
      const legacyValue = window.localStorage.getItem(key);
      if (legacyValue !== null) {
        window.localStorage.setItem(scopedKey, legacyValue);
      }
    }

    if (!owner) window.localStorage.setItem(LEGACY_OWNER_KEY, userId);
  } catch {
    // Existing data remains untouched if the browser blocks a migration.
  }
}
