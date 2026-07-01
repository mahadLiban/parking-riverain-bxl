import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackIcon, ChevronIcon } from "../components/icons";
import { COLORS } from "../components/theme";
import { useTextScale } from "../contexts/TextScaleContext";
import { getZoneById } from "../data/zones";
import { clearHistory, getHistory, HistoryEntry } from "../storage/history";

type Props = {
  username: string;
  email: string;
  zoneId: string;
  onBack: () => void;
  onChangeZone: () => void;
  onLogout: () => void;
};

function formatCheckedAt(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Aujourd'hui · ${time}`;
  return d.toLocaleDateString("fr-BE", { day: "2-digit", month: "short" }) + ` · ${time}`;
}

export default function SettingsScreen({ username, email, zoneId, onBack, onChangeZone, onLogout }: Props) {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  const insets = useSafeAreaInsets();
  const { scale, increase, decrease } = useTextScale();
  const zone = getZoneById(zoneId);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    getHistory().then(setHistory).catch(() => {});
  }, []);

  if (!fontsLoaded) return <View style={styles.root} />;

  const initial = username.trim().charAt(0).toUpperCase() || "?";

  const handleClearHistory = async () => {
    await clearHistory();
    setHistory([]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <BackIcon size={18} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>Réglages</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
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

        {/* History section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>HISTORIQUE</Text>
          {history.length > 0 && (
            <Pressable onPress={handleClearHistory} hitSlop={8}>
              <Text style={styles.clearText}>Effacer</Text>
            </Pressable>
          )}
        </View>

        {history.length === 0 ? (
          <View style={[styles.row, { justifyContent: "center" }]}>
            <Text style={[styles.rowValue, { textAlign: "center" }]}>Aucune vérification pour l'instant</Text>
          </View>
        ) : (
          history.map((entry, i) => (
            <View key={i} style={[styles.historyRow, i === history.length - 1 && { marginBottom: 0 }]}>
              <View style={[styles.historyDot, { backgroundColor: entry.inside ? COLORS.green : COLORS.red }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.historyStatus}>{entry.inside ? "OUI — Zone riverain" : "NON — Hors zone"}</Text>
                {entry.regulationLabel && (
                  <Text style={styles.historyReg}>{entry.regulationLabel}{entry.streetHint ? ` · ${entry.streetHint}` : ""}</Text>
                )}
              </View>
              <Text style={styles.historyTime}>{formatCheckedAt(entry.checkedAt)}</Text>
            </View>
          ))
        )}

        <View style={{ height: 20 }} />

        <Pressable style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]} onPress={onLogout}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
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

  scroll: { gap: 0 },

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

  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 4 },
  sectionLabel: { fontSize: 11, fontFamily: "Manrope_700Bold", color: COLORS.textMuted, letterSpacing: 0.7 },
  clearText: { fontSize: 12.5, fontFamily: "Manrope_600SemiBold", color: COLORS.red },

  historyRow: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  historyDot: { width: 10, height: 10, borderRadius: 5 },
  historyStatus: { fontSize: 14, fontFamily: "Manrope_700Bold", color: COLORS.text },
  historyReg: { fontSize: 12, fontFamily: "Manrope_600SemiBold", color: COLORS.textMuted, marginTop: 2 },
  historyTime: { fontSize: 11.5, fontFamily: "Manrope_600SemiBold", color: COLORS.textMuted, textAlign: "right", flexShrink: 0 },

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
