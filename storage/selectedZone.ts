import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "selectedZoneId";

export async function getSelectedZoneId(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function setSelectedZoneId(zoneId: string): Promise<void> {
  await AsyncStorage.setItem(KEY, zoneId);
}

export async function clearSelectedZoneId(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
