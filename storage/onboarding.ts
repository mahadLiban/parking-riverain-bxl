import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "onboarding:v1";

export async function hasSeenOnboarding(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEY);
  return val === "done";
}

export async function markOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(KEY, "done");
}
