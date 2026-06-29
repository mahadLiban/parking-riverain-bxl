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
import { Defs, RadialGradient, Rect, Stop, Svg } from "react-native-svg";
import { getZoneById } from "../data/zones";
import { supabase } from "../lib/supabase";
import ZonePickerScreen from "./ZonePickerScreen";

type Props = { onAuthenticated: (zoneId: string, username: string) => void };
type Mode = "login" | "signup-form" | "signup-zone";

const GREEN = "#22D17E";

export default function AuthScreen({ onAuthenticated }: Props) {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!fontsLoaded) return <View style={styles.root} />;

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password) { setError("Entre ton email et ton mot de passe."); return; }
    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError || !data.user) {
      setLoading(false);
      setError(signInError?.message === "Invalid login credentials" ? "Email ou mot de passe incorrect." : signInError?.message ?? "Connexion impossible.");
      return;
    }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("zone_id, username").eq("id", data.user.id).single();
    setLoading(false);
    if (profileError || !profile) { setError("Profil introuvable pour ce compte."); return; }
    onAuthenticated(profile.zone_id, profile.username);
  };

  const goToZoneStep = () => {
    setError(null);
    if (!username.trim()) { setError("Choisis un pseudo."); return; }
    if (!email.trim() || !email.includes("@")) { setError("Entre un email valide."); return; }
    if (password.length < 6) { setError("Le mot de passe doit faire au moins 6 caractères."); return; }
    setMode("signup-zone");
  };

  const handleSignupWithZone = async (zoneId: string) => {
    setLoading(true);
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim(), zone_id: zoneId } },
    });
    setLoading(false);
    if (signUpError || !data.user) {
      setMode("signup-form");
      const msg = signUpError?.message ?? "";
      setError(
        msg === "User already registered" ? "Un compte existe déjà avec cet email." :
        msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("profiles_username") ? "Ce pseudo est déjà pris." :
        msg || "Inscription impossible."
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
          headerOverride={{ title: "Dernière étape", subtitle: "Choisis la zone de ta carte riverain", onBack: () => setMode("signup-form") }}
        />
        {loading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={GREEN} />
          </View>
        )}
      </View>
    );
  }

  const isSignup = mode === "signup-form";

  return (
    <View style={styles.root}>
      {/* Aurora */}
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" width="100%" height="100%">
        <Defs>
          <RadialGradient id="a1" cx="20%" cy="15%" r="50%">
            <Stop offset="0%" stopColor="#6B21C8" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#6B21C8" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="a2" cx="80%" cy="85%" r="45%">
            <Stop offset="0%" stopColor="#0051CC" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="#0051CC" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="a3" cx="60%" cy="50%" r="35%">
            <Stop offset="0%" stopColor="#00C9A7" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#00C9A7" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#a1)" />
        <Rect width="100%" height="100%" fill="url(#a2)" />
        <Rect width="100%" height="100%" fill="url(#a3)" />
      </Svg>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Image source={require("../assets/icon.png")} style={styles.logo} />
          <Text style={styles.appName}>Riverain BXL</Text>
          <Text style={styles.tagline}>
            {isSignup ? "Crée ton compte" : "Content de te revoir 👋"}
          </Text>

          <View style={styles.form}>
            {isSignup && (
              <View style={styles.field}>
                <Text style={styles.label}>Pseudo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ton pseudo"
                  placeholderTextColor="rgba(255,255,255,0.25)"
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
                placeholderTextColor="rgba(255,255,255,0.25)"
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
                placeholderTextColor="rgba(255,255,255,0.25)"
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
                <ActivityIndicator color="#08080D" />
              ) : (
                <Text style={styles.submitText}>{isSignup ? "Continuer →" : "Se connecter"}</Text>
              )}
            </Pressable>
          </View>

          <Pressable onPress={() => { setError(null); setMode(isSignup ? "login" : "signup-form"); }}>
            <Text style={styles.switchText}>
              {isSignup ? "Déjà un compte ? Se connecter" : "Pas encore de compte ? S'inscrire"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#08080D" },
  scroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 6 },

  logo: { width: 80, height: 80, borderRadius: 22, marginBottom: 8 },
  appName: { fontSize: 26, fontFamily: "Manrope_800ExtraBold", color: "#fff", letterSpacing: -0.3 },
  tagline: { fontSize: 14.5, fontFamily: "Manrope_600SemiBold", color: "rgba(255,255,255,0.4)", marginBottom: 28 },

  form: { width: "100%", maxWidth: 360, gap: 14 },
  field: { gap: 7 },
  label: { fontSize: 12.5, fontFamily: "Manrope_700Bold", color: "rgba(255,255,255,0.55)", letterSpacing: 0.3 },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Manrope_400Regular",
    color: "#fff",
  },
  error: { color: "#FF3B5C", fontFamily: "Manrope_600SemiBold", fontSize: 13, textAlign: "center" },
  submitBtn: {
    backgroundColor: "#22D17E",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#22D17E",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  submitText: { color: "#08080D", fontFamily: "Manrope_800ExtraBold", fontSize: 15.5 },

  switchText: { color: "rgba(255,255,255,0.4)", fontFamily: "Manrope_600SemiBold", fontSize: 13, marginTop: 16 },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
});
