import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "collapsedCommunes";

export async function getCollapsedCommunes(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setCollapsedCommunes(collapsed: string[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(collapsed));
}
