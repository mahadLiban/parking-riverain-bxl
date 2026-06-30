import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AuthScreen from "./screens/AuthScreen";
import HomeScreen from "./screens/HomeScreen";
import ZonePickerScreen from "./screens/ZonePickerScreen";
import { supabase } from "./lib/supabase";

type Session = { zoneId: string; username: string };
type Screen = "loading" | "auth" | "home" | "change-zone";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        setScreen("auth");
        return;
      }
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("zone_id, username")
        .eq("id", user.id)
        .single();
      if (error || !profile) {
        setScreen("auth");
        return;
      }
      setSession({ zoneId: profile.zone_id, username: profile.username });
      setScreen("home");
    })();
  }, []);

  const handleAuthenticated = (zoneId: string, username: string) => {
    setSession({ zoneId, username });
    setScreen("home");
  };

  const handleZoneUpdated = async (zoneId: string) => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (user) {
      await supabase.from("profiles").update({ zone_id: zoneId }).eq("id", user.id);
    }
    setSession((prev) => (prev ? { ...prev, zoneId } : prev));
    setScreen("home");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setScreen("auth");
  };

  if (screen === "loading") {
    return (
      <View style={styles.splash}>
        <Image source={require("./assets/icon.png")} style={styles.splashLogo} />
        <StatusBar style="light" />
      </View>
    );
  }

  if (screen === "auth" || !session) {
    return (
      <>
        <AuthScreen onAuthenticated={handleAuthenticated} />
        <StatusBar style="light" />
      </>
    );
  }

  if (screen === "change-zone") {
    return (
      <>
        <ZonePickerScreen
          onZoneSelected={handleZoneUpdated}
          currentZoneId={session?.zoneId}
          headerOverride={{
            title: "Changer de zone",
            subtitle: "Choisis ta nouvelle zone riverain",
            onBack: () => setScreen("home"),
          }}
        />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <>
      <HomeScreen
        zoneId={session.zoneId}
        username={session.username}
        onChangeZone={() => setScreen("change-zone")}
        onLogout={handleLogout}
      />
      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#08080D" },
  splashLogo: { width: 96, height: 96, borderRadius: 24 },
});
