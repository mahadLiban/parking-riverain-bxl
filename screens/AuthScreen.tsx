import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../components/theme";
import { supabase } from "../lib/supabase";
import ZonePickerScreen from "./ZonePickerScreen";

type Props = {
  initialMode?: "login" | "signup-form";
  onAuthenticated: (zoneId: string, username: string, email: string) => void;
  onBack: () => void;
};

type Mode = "login" | "signup-form" | "signup-zone";

export default function AuthScreen({ initialMode = "login", onAuthenticated, onBack }: Props) {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>(initialMode);
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
    onAuthenticated(profile.zone_id, profile.username, data.user.email ?? "");
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
    onAuthenticated(zoneId, username.trim(), email.trim());
  };

  if (mode === "signup-zone") {
    return (
      <View style={{ flex: 1 }}>
        <ZonePickerScreen
          onZoneSelected={handleSignupWithZone}
          headerOverride={{
            title: "Choisis ta zone riverain",
            subtitle: "",
            onBack: () => setMode("signup-form"),
            step: { current: 2, total: 3 },
          }}
        />
        {loading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={COLORS.green} />
          </View>
        )}
      </View>
    );
  }

  const isSignup = mode === "signup-form";

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={mode === "login" ? onBack : onBack} hitSlop={10}>
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        {isSignup && (
          <View style={styles.stepWrap}>
            <Text style={styles.stepLabel}>ÉTAPE 1 SUR 3</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: "33%" }]} />
            </View>
          </View>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{isSignup ? "Crée ton compte" : "Connecte-toi"}</Text>

          <View style={styles.form}>
            {isSignup && (
              <View style={styles.field}>
                <Text style={styles.label}>Pseudo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Marie"
                  placeholderTextColor={COLORS.textMuted}
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
                placeholder="marie@email.com"
                placeholderTextColor={COLORS.textMuted}
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
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.88 }]}
              onPress={isSignup ? goToZoneStep : handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{isSignup ? "Continuer →" : "Se connecter"}</Text>
              )}
            </Pressable>
          </View>

          <Pressable onPress={() => { setError(null); setMode(isSignup ? "login" : "signup-form"); }}>
            <Text style={styles.switchText}>
              {isSignup ? "Déjà inscrit ? Se connecter" : "Pas encore de compte ? S'inscrire"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 24 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 8 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: { fontSize: 22, color: COLORS.text, fontFamily: "Manrope_700Bold", marginTop: -2 },
  stepWrap: { flex: 1, gap: 6 },
  stepLabel: { fontSize: 11, fontFamily: "Manrope_700Bold", color: COLORS.green, letterSpacing: 0.6 },
  progressTrack: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: "hidden" },
  progressBar: { height: 4, backgroundColor: COLORS.green, borderRadius: 2 },

  scroll: { paddingTop: 16, paddingBottom: 40 },
  title: { fontSize: 25, fontFamily: "Manrope_800ExtraBold", color: COLORS.text, marginBottom: 24 },

  form: { gap: 16 },
  field: { gap: 7 },
  label: { fontSize: 13, fontFamily: "Manrope_700Bold", color: COLORS.text },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    minHeight: 54,
    fontSize: 15.5,
    fontFamily: "Manrope_400Regular",
    color: COLORS.text,
  },
  error: { color: COLORS.red, fontFamily: "Manrope_600SemiBold", fontSize: 13, textAlign: "center" },
  submitBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 14,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitText: { color: "#fff", fontFamily: "Manrope_800ExtraBold", fontSize: 16 },

  switchText: { color: COLORS.textMuted, fontFamily: "Manrope_600SemiBold", fontSize: 13.5, textAlign: "center", marginTop: 22 },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
});
