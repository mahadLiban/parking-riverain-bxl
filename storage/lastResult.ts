import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RegulationMatch } from "../data/regulationZones";

const KEY = "lastResult:v1";

export type CachedResult = {
  inside: boolean;
  regulation: RegulationMatch | null;
  checkedAt: number;
  latitude: number;
  longitude: number;
};

export async function getLastResult(): Promise<CachedResult | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function setLastResult(result: CachedResult): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(result));
}
