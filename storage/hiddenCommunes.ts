import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "hiddenCommunes";

export async function getHiddenCommunes(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setHiddenCommunes(hidden: string[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(hidden));
}
