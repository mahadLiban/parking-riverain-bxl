import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
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
      <View style={styles.splash}>
        <Image source={require("./assets/icon.png")} style={styles.splashLogo} />
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

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1FAA59" },
  splashLogo: { width: 96, height: 96, borderRadius: 24 },
});
