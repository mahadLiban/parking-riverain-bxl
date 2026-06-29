import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "parkingTimer:v1";

export type ParkingTimer = {
  startedAt: number;
  maxtimeMinutes: number | null;
  zoneCode: string;
  notificationId: string | null;
};

export async function getParkingTimer(): Promise<ParkingTimer | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function setParkingTimer(timer: ParkingTimer | null): Promise<void> {
  if (timer) await AsyncStorage.setItem(KEY, JSON.stringify(timer));
  else await AsyncStorage.removeItem(KEY);
}
