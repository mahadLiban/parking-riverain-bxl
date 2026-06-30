import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackIcon, ChevronIcon } from "../components/icons";
import { COLORS } from "../components/theme";
import { useTextScale } from "../contexts/TextScaleContext";
import { getZoneById } from "../data/zones";

type Props = {
  username: string;
  email: string;
  zoneId: string;
  onBack: () => void;
  onChangeZone: () => void;
  onLogout: () => void;
};

export default function SettingsScreen({ username, email, zoneId, onBack, onChangeZone, onLogout }: Props) {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  const insets = useSafeAreaInsets();
  const { scale, increase, decrease } = useTextScale();
  const zone = getZoneById(zoneId);

  if (!fontsLoaded) return <View style={styles.root} />;

  const initial = username.trim().charAt(0).toUpperCase() || "?";

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <BackIcon size={18} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>Réglages</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View>
          <Text style={styles.profileName}>{username}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
        </View>
      </View>

      <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]} onPress={onChangeZone}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>Changer de zone</Text>
          <Text style={styles.rowValue}>{zone ? `${zone.commune} — ${zone.name}` : "—"}</Text>
        </View>
        <ChevronIcon size={16} color={COLORS.textMuted} />
      </Pressable>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Taille du texte</Text>
        <View style={styles.scaleControls}>
          <Pressable style={[styles.scaleBtn, scale <= 0.85 && styles.scaleBtnDisabled]} onPress={decrease} hitSlop={8}>
            <Text style={styles.scaleBtnText}>A−</Text>
          </Pressable>
          <View style={styles.scaleTrack}>
            <View style={[styles.scaleFill, { width: `${((scale - 0.85) / (1.3 - 0.85)) * 100}%` as any }]} />
          </View>
          <Pressable style={[styles.scaleBtn, scale >= 1.3 && styles.scaleBtnDisabled]} onPress={increase} hitSlop={8}>
            <Text style={styles.scaleBtnText}>A+</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <Pressable style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]} onPress={onLogout}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 22 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 24 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 22, fontFamily: "Manrope_800ExtraBold", color: COLORS.text },

  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.green, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 20, fontFamily: "Manrope_800ExtraBold" },
  profileName: { fontSize: 16.5, fontFamily: "Manrope_800ExtraBold", color: COLORS.text },
  profileEmail: { fontSize: 13, fontFamily: "Manrope_400Regular", color: COLORS.textMuted, marginTop: 2 },

  row: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 64,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  rowLabel: { fontSize: 15, fontFamily: "Manrope_700Bold", color: COLORS.text },
  rowValue: { fontSize: 12.5, fontFamily: "Manrope_600SemiBold", color: COLORS.textMuted, marginTop: 2 },

  scaleControls: { flexDirection: "row", alignItems: "center", gap: 10 },
  scaleBtn: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.greenBg,
    alignItems: "center", justifyContent: "center",
  },
  scaleBtnDisabled: { opacity: 0.4 },
  scaleBtnText: { fontSize: 14, fontFamily: "Manrope_800ExtraBold", color: COLORS.greenDark },
  scaleTrack: { width: 56, height: 4, borderRadius: 2, backgroundColor: COLORS.border, overflow: "hidden" },
  scaleFill: { height: 4, backgroundColor: COLORS.green, borderRadius: 2 },

  logoutBtn: {
    borderWidth: 1.5,
    borderColor: "#F1C9C9",
    backgroundColor: COLORS.redBg,
    borderRadius: 16,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: { color: COLORS.red, fontFamily: "Manrope_800ExtraBold", fontSize: 15.5 },
});
