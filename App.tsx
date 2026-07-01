import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { COLORS } from "./components/theme";
import { TextScaleProvider } from "./contexts/TextScaleContext";
import { supabase } from "./lib/supabase";
import AuthScreen from "./screens/AuthScreen";
import HomeScreen from "./screens/HomeScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import SettingsScreen from "./screens/SettingsScreen";
import WelcomeScreen from "./screens/WelcomeScreen";
import ZonePickerScreen from "./screens/ZonePickerScreen";
import { hasSeenOnboarding, markOnboardingDone } from "./storage/onboarding";

type Session = { zoneId: string; username: string; email: string };
type Screen = "loading" | "onboarding" | "welcome" | "login" | "signup" | "home" | "settings" | "change-zone";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: "#F2F0EA", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ fontSize: 16, color: "#C13B3B", fontWeight: "bold", marginBottom: 12 }}>Erreur application</Text>
          <Text style={{ fontSize: 12, color: "#333", textAlign: "center" }}>{this.state.error.message}</Text>
          <Text style={{ fontSize: 10, color: "#888", marginTop: 12, textAlign: "center" }}>{this.state.error.stack?.slice(0, 300)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <TextScaleProvider>
          <AppContent />
        </TextScaleProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
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
        setScreen("welcome");
        return;
      }
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("zone_id, username")
        .eq("id", user.id)
        .single();
      if (error || !profile) {
        setScreen("welcome");
        return;
      }
      setSession({ zoneId: profile.zone_id, username: profile.username, email: user.email ?? "" });
      setScreen("home");
    })();
  }, []);

  const handleAuthenticated = async (zoneId: string, username: string, email: string) => {
    setSession({ zoneId, username, email });
    const seen = await hasSeenOnboarding();
    setScreen(seen ? "home" : "onboarding");
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
    setScreen("welcome");
  };

  if (screen === "loading") {
    return (
      <View style={styles.splash}>
        <Image source={require("./assets/icon.png")} style={styles.splashLogo} />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (screen === "welcome") {
    return (
      <>
        <WelcomeScreen onStart={() => setScreen("signup")} onLogin={() => setScreen("login")} />
        <StatusBar style="dark" />
      </>
    );
  }

  if (screen === "onboarding") {
    return (
      <>
        <OnboardingScreen onDone={async () => { await markOnboardingDone(); setScreen("home"); }} />
        <StatusBar style="dark" />
      </>
    );
  }

  if (screen === "login" || screen === "signup") {
    return (
      <>
        <AuthScreen
          initialMode={screen === "signup" ? "signup-form" : "login"}
          onAuthenticated={handleAuthenticated}
          onBack={() => setScreen("welcome")}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <WelcomeScreen onStart={() => setScreen("signup")} onLogin={() => setScreen("login")} />
        <StatusBar style="dark" />
      </>
    );
  }

  if (screen === "settings") {
    return (
      <>
        <SettingsScreen
          username={session.username}
          email={session.email}
          zoneId={session.zoneId}
          onBack={() => setScreen("home")}
          onChangeZone={() => setScreen("change-zone")}
          onLogout={handleLogout}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (screen === "change-zone") {
    return (
      <>
        <ZonePickerScreen
          onZoneSelected={handleZoneUpdated}
          currentZoneId={session.zoneId}
          headerOverride={{
            title: "Changer de zone",
            subtitle: "Choisis ta nouvelle zone riverain",
            onBack: () => setScreen("settings"),
          }}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <>
      <HomeScreen
        zoneId={session.zoneId}
        username={session.username}
        onOpenSettings={() => setScreen("settings")}
      />
      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  splashLogo: { width: 96, height: 96, borderRadius: 24 },
});
