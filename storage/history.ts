import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "history:v1";
const MAX = 5;

export type HistoryEntry = {
  inside: boolean;
  regulationLabel: string | null;
  checkedAt: number;
  latitude: number;
  longitude: number;
  streetHint: string | null;
};

export async function getHistory(): Promise<HistoryEntry[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function pushHistory(entry: HistoryEntry): Promise<void> {
  const existing = await getHistory();
  const updated = [entry, ...existing].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
