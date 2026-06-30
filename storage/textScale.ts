import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "textScale:v1";

export async function getTextScale(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? parseFloat(raw) : 1;
}

export async function setTextScale(scale: number): Promise<void> {
  await AsyncStorage.setItem(KEY, String(scale));
}
