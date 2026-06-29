import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getZoneById } from "../data/zones";
import { supabase } from "../lib/supabase";
import ZonePickerScreen from "./ZonePickerScreen";

type Props = {
  onAuthenticated: (zoneId: string, username: string) => void;
};

type Mode = "login" | "signup-form" | "signup-zone";

export default function AuthScreen({ onAuthenticated }: Props) {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!fontsLoaded) return <View style={styles.container} />;

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Entre ton email et ton mot de passe.");
      return;
    }
    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError || !data.user) {
      setLoading(false);
      setError(
        signInError?.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect."
          : signInError?.message ?? "Connexion impossible."
      );
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("zone_id, username")
      .eq("id", data.user.id)
      .single();
    setLoading(false);
    if (profileError || !profile) {
      setError("Profil introuvable pour ce compte.");
      return;
    }
    onAuthenticated(profile.zone_id, profile.username);
  };

  const goToZoneStep = () => {
    setError(null);
    if (!username.trim()) {
      setError("Choisis un pseudo.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Entre un email valide.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    setMode("signup-zone");
  };

  const handleSignupWithZone = async (zoneId: string) => {
    setLoading(true);
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { username: username.trim(), zone_id: zoneId },
      },
    });
    setLoading(false);
    if (signUpError || !data.user) {
      setMode("signup-form");
      const msg = signUpError?.message ?? "";
      setError(
        msg === "User already registered"
          ? "Un compte existe déjà avec cet email."
          : msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("profiles_username")
          ? "Ce pseudo est déjà pris."
          : msg || "Inscription impossible."
      );
      return;
    }

    onAuthenticated(zoneId, username.trim());
  };

  if (mode === "signup-zone") {
    return (
      <View style={{ flex: 1 }}>
        <ZonePickerScreen
          onZoneSelected={handleSignupWithZone}
          headerOverride={{
            title: "Dernière étape",
            subtitle: "Choisis la zone de ta carte riverain",
            onBack: () => setMode("signup-form"),
          }}
        />
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>
    );
  }

  const isSignup = mode === "signup-form";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Image source={require("../assets/icon.png")} style={styles.logo} />
        <Text style={styles.title}>Riverain BXL</Text>
        <Text style={styles.subtitle}>
          {isSignup ? "Crée ton compte" : "Connecte-toi pour continuer"}
        </Text>

        {isSignup && (
          <View style={styles.field}>
            <Text style={styles.label}>Pseudo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ton pseudo"
              placeholderTextColor="#9b9ba1"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="ton@email.com"
            placeholderTextColor="#9b9ba1"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#9b9ba1"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
          onPress={isSignup ? goToZoneStep : handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>{isSignup ? "Continuer" : "Se connecter"}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setError(null);
            setMode(isSignup ? "login" : "signup-form");
          }}
        >
          <Text style={styles.switchModeText}>
            {isSignup ? "Déjà un compte ? Se connecter" : "Pas encore de compte ? S'inscrire"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 4 },
  logo: { width: 72, height: 72, borderRadius: 18, marginBottom: 12 },
  title: { fontSize: 24, fontFamily: "Manrope_800ExtraBold", color: "#1a1a1a" },
  subtitle: { fontSize: 14, fontFamily: "Manrope_600SemiBold", color: "#777", marginBottom: 24 },
  field: { width: "100%", maxWidth: 360, marginBottom: 14 },
  label: { fontSize: 13, fontFamily: "Manrope_700Bold", color: "#1a1a1a", marginBottom: 6 },
  input: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "Manrope_400Regular",
    color: "#1a1a1a",
  },
  error: { color: "#D8333A", fontFamily: "Manrope_600SemiBold", fontSize: 13, marginBottom: 12, textAlign: "center" },
  submitBtn: {
    backgroundColor: "#1FAA59",
    borderRadius: 999,
    paddingVertical: 15,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  submitText: { color: "#fff", fontFamily: "Manrope_700Bold", fontSize: 15 },
  switchModeText: { color: "#1FAA59", fontFamily: "Manrope_700Bold", fontSize: 13 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
});
