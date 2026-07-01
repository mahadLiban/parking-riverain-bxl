import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, AppState, AppStateStatus, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckIcon, CrossIcon, PinIcon, RefreshIcon } from "../components/icons";
import { COLORS } from "../components/theme";
import { findRegulationZone, RegulationMatch } from "../data/regulationZones";
import { getZoneById } from "../data/zones";
import { useTextScale } from "../contexts/TextScaleContext";
import { getLastResult, setLastResult } from "../storage/lastResult";
import { pushHistory } from "../storage/history";
import { isPointInPolygon } from "../utils/geo";
import DetailsScreen from "./DetailsScreen";
import TimerScreen from "./TimerScreen";

type Props = {
  zoneId: string;
  username: string;
  onOpenSettings: () => void;
};

type Status =
  | { kind: "loading" }
  | { kind: "permission-denied" }
  | { kind: "error"; message: string }
  | { kind: "result"; inside: boolean; accuracy: number | null; regulation: RegulationMatch | null; position: { latitude: number; longitude: number }; stale?: boolean };

const AUTO_REFRESH_MS = 3 * 60 * 1000; // 3 min

function formatTime(date: Date) {
  return date.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
}

function hapticFeedback(kind: "success" | "warning") {
  if (Platform.OS === "web") return;
  if (kind === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

function Spinner() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />;
}

function RegLabel({ regulation }: { regulation: RegulationMatch | null }) {
  if (!regulation) return null;
  const z = regulation.zone;
  const label = z.type === "gratuit" ? "Gratuit" : z.type === "reserve-riverain" ? "Réservé riverains" : z.typeLabel ?? z.type;
  if (!label) return null;
  const isPaid = z.type !== "gratuit" && z.type !== "reserve-riverain" && z.type !== "poids-lourds";
  return (
    <View style={[regLabelStyles.chip, isPaid && regLabelStyles.chipPaid]}>
      <Text style={[regLabelStyles.text, isPaid && regLabelStyles.textPaid]}>{label}</Text>
    </View>
  );
}

const regLabelStyles = StyleSheet.create({
  chip: { marginTop: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: COLORS.greenBg, alignSelf: "flex-start" },
  chipPaid: { backgroundColor: "#FBF1D8" },
  text: { fontSize: 11, fontFamily: "Manrope_700Bold", color: COLORS.greenDark },
  textPaid: { color: "#7A5A0A" },
});

function SlideIn({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  const translateY = useRef(new Animated.Value(visible ? 0 : 50)).current;
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: visible ? 0 : 50, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [visible]);

  return <Animated.View style={{ flex: 1, opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export default function HomeScreen({ zoneId, username, onOpenSettings }: Props) {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  const insets = useSafeAreaInsets();
  const { scale } = useTextScale();
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [view, setView] = useState<"main" | "details" | "timer">("main");
  const zone = getZoneById(zoneId);

  const fade = useRef(new Animated.Value(0)).current;
  const autoRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkPosition = useCallback(async () => {
    setStatus({ kind: "loading" });
    fade.setValue(0);
    if (autoRefreshTimer.current) clearTimeout(autoRefreshTimer.current);

    const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
    if (permStatus !== "granted") { setStatus({ kind: "permission-denied" }); return; }

    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!zone) { setStatus({ kind: "error", message: "Zone introuvable." }); return; }
      const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const inside = isPointInPolygon(coords, zone.polygon);
      const regulation = findRegulationZone(coords);
      setStatus({ kind: "result", inside, accuracy: position.coords.accuracy ?? null, regulation, position: coords });
      const now = new Date();
      setLastChecked(now);
      hapticFeedback(inside ? "success" : "warning");
      setLastResult({ inside, regulation, checkedAt: Date.now(), latitude: coords.latitude, longitude: coords.longitude }).catch(() => {});
      pushHistory({
        inside,
        regulationLabel: regulation?.zone.typeLabel ?? regulation?.zone.type ?? null,
        checkedAt: Date.now(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        streetHint: regulation?.zone.municipality ?? null,
      }).catch(() => {});
    } catch {
      const cached = await getLastResult().catch(() => null);
      if (cached) {
        setStatus({ kind: "result", inside: cached.inside, accuracy: null, regulation: cached.regulation, position: { latitude: cached.latitude, longitude: cached.longitude }, stale: true });
        setLastChecked(new Date(cached.checkedAt));
      } else {
        setStatus({ kind: "error", message: "Impossible d'obtenir ta position." });
      }
    }

    // schedule next auto-refresh
    autoRefreshTimer.current = setTimeout(checkPosition, AUTO_REFRESH_MS);
  }, [zone, fade]);

  useEffect(() => { checkPosition(); }, [checkPosition]);

  // pause auto-refresh when app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        checkPosition();
      } else {
        if (autoRefreshTimer.current) clearTimeout(autoRefreshTimer.current);
      }
    });
    return () => {
      sub.remove();
      if (autoRefreshTimer.current) clearTimeout(autoRefreshTimer.current);
    };
  }, [checkPosition]);

  useEffect(() => {
    if (status.kind === "result") {
      Animated.timing(fade, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [status.kind, fade]);

  if (!fontsLoaded) return <View style={styles.root} />;

  const isResult = status.kind === "result";

  if (isResult && view === "details" && zone) {
    return (
      <SlideIn visible>
        <DetailsScreen
          inside={status.inside}
          regulation={status.regulation}
          zone={zone}
          position={status.position}
          onBack={() => setView("main")}
        />
      </SlideIn>
    );
  }

  if (isResult && view === "timer") {
    return (
      <SlideIn visible>
        <TimerScreen
          zone={status.regulation?.zone ?? null}
          onBack={() => setView("main")}
        />
      </SlideIn>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.zoneChip}>
          <PinIcon size={13} color={COLORS.green} />
          <View>
            <Text style={styles.zoneCommune}>{zone?.commune?.toUpperCase() ?? "—"}</Text>
            <Text style={styles.zoneName}>{zone?.name ?? "Zone inconnue"}</Text>
            {isResult && <RegLabel regulation={status.regulation} />}
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
            onPress={checkPosition}
            hitSlop={10}
          >
            <RefreshIcon size={16} color={COLORS.text} />
          </Pressable>
          <Pressable style={styles.settingsBtn} onPress={onOpenSettings} hitSlop={10}>
            <Text style={styles.settingsBtnText}>Réglages</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.greeting, { fontSize: 16 * scale }]}>Bonjour {username} 👋</Text>

      {/* Stale banner */}
      {isResult && status.stale && (
        <View style={styles.staleBanner}>
          <Text style={styles.staleBannerText}>⚠ Hors-ligne · Dernière position{lastChecked ? ` (${formatTime(lastChecked)})` : ""}</Text>
        </View>
      )}

      {/* Result card */}
      <View style={styles.resultArea}>
        {status.kind === "loading" && (
          <View style={[styles.resultCard, styles.resultCardNeutral]}>
            <Spinner />
            <Text style={styles.neutralText}>Localisation…</Text>
          </View>
        )}

        {status.kind === "permission-denied" && (
          <View style={[styles.resultCard, styles.resultCardNeutral]}>
            <PinIcon size={32} color={COLORS.textMuted} />
            <Text style={styles.neutralText}>Active la localisation pour utiliser l'app</Text>
            <Pressable style={styles.actionBtn} onPress={() => Linking.openSettings()}>
              <Text style={styles.actionBtnText}>Ouvrir les réglages →</Text>
            </Pressable>
          </View>
        )}

        {status.kind === "error" && (
          <View style={[styles.resultCard, styles.resultCardNeutral]}>
            <Text style={styles.neutralText}>{status.message}</Text>
            <Pressable style={styles.actionBtn} onPress={checkPosition}>
              <Text style={styles.actionBtnText}>Réessayer →</Text>
            </Pressable>
          </View>
        )}

        {isResult && (
          <Animated.View style={{ opacity: fade, width: "100%" }}>
            <Pressable
              style={[styles.resultCard, status.inside ? styles.resultCardGreen : styles.resultCardRed]}
              onPress={checkPosition}
            >
              <View style={styles.resultIconCircle}>
                {status.inside ? <CheckIcon size={36} color={COLORS.green} /> : <CrossIcon size={36} color={COLORS.red} />}
              </View>
              <Text style={[styles.resultBig, { color: status.inside ? COLORS.greenDark : COLORS.redDark, fontSize: 44 * scale }]}>
                {status.inside ? "OUI" : "NON"}
              </Text>
              <Text style={[styles.resultLabel, { fontSize: 17 * scale }]}>
                {status.inside ? "Tu peux te garer ici" : "Stationnement payant ici"}
              </Text>
              <Text style={styles.resultSub}>
                {status.inside ? "Gratuit avec ta carte riverain" : "Hors de ta zone riverain"}
              </Text>
              {lastChecked && !status.stale && (
                <View style={styles.metaRow}>
                  <RefreshIcon size={11} color={COLORS.textMuted} />
                  <Text style={styles.metaText}>
                    Vérifié à {formatTime(lastChecked)}{status.accuracy ? ` · ±${Math.round(status.accuracy)} m` : ""} · rafraîchit auto
                  </Text>
                </View>
              )}
            </Pressable>
          </Animated.View>
        )}
      </View>

      {/* Action buttons */}
      {isResult && (
        <View style={styles.actionsRow}>
          <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]} onPress={() => setView("details")}>
            <Text style={styles.secondaryBtnText}>Détails</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]} onPress={() => setView("timer")}>
            <Text style={styles.secondaryBtnText}>Minuteur</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  zoneChip: { flexDirection: "row", alignItems: "flex-start", gap: 9, flex: 1 },
  zoneCommune: { fontSize: 10.5, color: COLORS.textMuted, fontFamily: "Manrope_700Bold", letterSpacing: 0.4 },
  zoneName: { fontSize: 15.5, color: COLORS.text, fontFamily: "Manrope_800ExtraBold", marginTop: 1 },

  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center",
  },
  settingsBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 40,
    justifyContent: "center",
  },
  settingsBtnText: { fontSize: 13.5, color: COLORS.text, fontFamily: "Manrope_700Bold" },

  greeting: { color: COLORS.textMuted, fontFamily: "Manrope_700Bold", marginTop: 18, marginBottom: 14 },

  staleBanner: {
    backgroundColor: "#FBF1D8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EBDBA6",
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  staleBannerText: { fontSize: 12.5, fontFamily: "Manrope_600SemiBold", color: "#8A6A1B", textAlign: "center" },

  resultArea: { flex: 1, justifyContent: "center" },
  resultCard: {
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
    minHeight: 340,
    justifyContent: "center",
  },
  resultCardNeutral: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, gap: 14 },
  resultCardGreen: { backgroundColor: COLORS.greenBg },
  resultCardRed: { backgroundColor: COLORS.redBg },
  resultIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  resultBig: { fontFamily: "Manrope_800ExtraBold", letterSpacing: 1.5 },
  resultLabel: { fontFamily: "Manrope_800ExtraBold", color: COLORS.text, marginTop: 8, textAlign: "center" },
  resultSub: { fontSize: 14, fontFamily: "Manrope_600SemiBold", color: COLORS.textMuted, marginTop: 4, textAlign: "center" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 18 },
  metaText: { fontSize: 11.5, fontFamily: "Manrope_600SemiBold", color: COLORS.textMuted },

  neutralText: { fontSize: 14.5, fontFamily: "Manrope_600SemiBold", color: COLORS.textMuted, textAlign: "center", paddingHorizontal: 12 },
  actionBtn: {
    marginTop: 6,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: COLORS.greenBg,
  },
  actionBtnText: { fontSize: 13.5, fontFamily: "Manrope_700Bold", color: COLORS.greenDark },

  actionsRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { fontSize: 15.5, fontFamily: "Manrope_700Bold", color: COLORS.text },

  spinner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: COLORS.border,
    borderTopColor: COLORS.green,
  },
});
