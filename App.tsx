import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import HomeScreen from "./screens/HomeScreen";
import ZonePickerScreen from "./screens/ZonePickerScreen";
import { getSelectedZoneId } from "./storage/selectedZone";

export default function App() {
  const [zoneId, setZoneId] = useState<string | null | "loading">("loading");

  useEffect(() => {
    getSelectedZoneId().then(setZoneId);
  }, []);

  if (zoneId === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      {zoneId ? (
        <HomeScreen zoneId={zoneId} onChangeZone={() => setZoneId(null)} />
      ) : (
        <ZonePickerScreen onZoneSelected={setZoneId} />
      )}
      <StatusBar style="auto" />
    </>
  );
}
