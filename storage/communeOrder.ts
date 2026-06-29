import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "communeOrder";

export async function getCommuneOrder(): Promise<string[] | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function setCommuneOrder(order: string[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(order));
}
