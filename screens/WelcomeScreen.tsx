import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PinIcon } from "../components/icons";
import { COLORS } from "../components/theme";

type Props = { onStart: () => void; onLogin: () => void };

export default function WelcomeScreen({ onStart, onLogin }: Props) {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  const insets = useSafeAreaInsets();

  if (!fontsLoaded) return <View style={styles.root} />;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.brand}>
        <View style={styles.brandIcon}>
          <PinIcon size={16} color={COLORS.green} />
        </View>
        <Text style={styles.brandText}>Riverain BXL</Text>
      </View>

      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <PinIcon size={48} color={COLORS.green} />
        </View>
        <Text style={styles.title}>Peux-tu te garer ici ?</Text>
        <Text style={styles.subtitle}>Une réponse claire, en un seul appui.</Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.88 }]} onPress={onStart}>
          <Text style={styles.primaryBtnText}>Commencer</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={onLogin} hitSlop={10}>
          <Text style={styles.secondaryBtnText}>J'ai déjà un compte</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 24, justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: COLORS.greenBg,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { fontSize: 16, fontFamily: "Manrope_800ExtraBold", color: COLORS.text },
  center: { alignItems: "center", justifyContent: "center", flex: 1, gap: 4 },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: COLORS.greenBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  title: { fontSize: 28, fontFamily: "Manrope_800ExtraBold", color: COLORS.text, textAlign: "center", paddingHorizontal: 16, lineHeight: 34 },
  subtitle: { fontSize: 15.5, fontFamily: "Manrope_600SemiBold", color: COLORS.textMuted, marginTop: 8, textAlign: "center" },
  actions: { gap: 16 },
  primaryBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 16,
    paddingVertical: 19,
    alignItems: "center",
    minHeight: 60,
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontFamily: "Manrope_800ExtraBold", fontSize: 17 },
  secondaryBtn: { alignItems: "center", paddingVertical: 10 },
  secondaryBtnText: { color: COLORS.textMuted, fontFamily: "Manrope_700Bold", fontSize: 14.5 },
});
