import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Circle, Svg } from "react-native-svg";
import { BackIcon } from "../components/icons";
import { COLORS } from "../components/theme";
import type { RegulationZone } from "../data/regulationZones";
import { getParkingTimer, setParkingTimer } from "../storage/parkingTimer";

type Props = { zone: RegulationZone | null; onBack: () => void };

const SIZE = 220;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatRemaining(ms: number): { big: string; unit: string } {
  if (ms <= 0) return { big: "0:00", unit: "TERMINÉ" };
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? { big: `${h}h ${String(m).padStart(2, "0")}`, unit: "RESTANTES" } : { big: `${m} min`, unit: "RESTANTES" };
}

function formatClock(date: Date) {
  return date.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
}

export default function TimerScreen({ zone, onBack }: Props) {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  const insets = useSafeAreaInsets();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const maxtimeMinutes = zone?.maxtime ? parseInt(zone.maxtime, 10) : null;

  useEffect(() => {
    if (!zone) return;
    getParkingTimer().then((t) => { if (t && t.zoneCode === zone.code) setStartedAt(t.startedAt); });
  }, [zone?.code]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!fontsLoaded) return <View style={styles.root} />;

  if (!zone || !maxtimeMinutes) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}><BackIcon size={18} color={COLORS.text} /></Pressable>
          <Text style={styles.title}>Minuteur</Text>
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Pas de durée maximale connue pour cette rue — aucun minuteur nécessaire.</Text>
        </View>
      </View>
    );
  }

  const endAt = startedAt ? startedAt + maxtimeMinutes * 60_000 : null;
  const remaining = endAt ? Math.max(0, endAt - now) : maxtimeMinutes * 60_000;
  const pct = startedAt ? remaining / (maxtimeMinutes * 60_000) : 1;
  const expired = startedAt !== null && remaining <= 0;
  const ringColor = expired ? COLORS.red : pct > 0.33 ? COLORS.green : "#E0A638";
  const { big, unit } = formatRemaining(remaining);
  const alertAt = startedAt ? new Date(startedAt + Math.max(maxtimeMinutes * 60 - 300, 30) * 1000) : null;

  const start = async () => {
    const startTime = Date.now();
    let notificationId: string | null = null;
    if (Platform.OS !== "web") {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === "granted") {
          const fireInSeconds = Math.max(maxtimeMinutes * 60 - 300, 30);
          notificationId = await Notifications.scheduleNotificationAsync({
            content: { title: "Stationnement bientôt expiré", body: "Il te reste ~5 min sur cette place." },
            trigger: { seconds: fireInSeconds } as Notifications.TimeIntervalTriggerInput,
          });
        }
      } catch {}
    }
    setStartedAt(startTime);
    await setParkingTimer({ startedAt: startTime, maxtimeMinutes, zoneCode: zone.code, notificationId });
  };

  const stop = async () => {
    const t = await getParkingTimer();
    if (t?.notificationId && Platform.OS !== "web") Notifications.cancelScheduledNotificationAsync(t.notificationId).catch(() => {});
    setStartedAt(null);
    await setParkingTimer(null);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}><BackIcon size={18} color={COLORS.text} /></Pressable>
        <Text style={styles.title}>Minuteur</Text>
      </View>

      <Text style={styles.intro}>
        {zone.typeLabel ?? "Zone réglementée"} · {maxtimeMinutes} min maximum. Reçois une alerte avant la fin.
      </Text>

      <View style={styles.ringWrap}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={COLORS.border} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={ringColor}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={CIRCUMFERENCE * (1 - pct)}
            rotation={-90}
            originX={SIZE / 2}
            originY={SIZE / 2}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={[styles.ringBig, { color: expired ? COLORS.red : COLORS.text }]}>{big}</Text>
          <Text style={styles.ringUnit}>{unit}</Text>
        </View>
      </View>

      {startedAt && alertAt && !expired && (
        <Text style={styles.alertInfo}>Alerte à {formatClock(alertAt)} · 5 min avant la fin</Text>
      )}

      <View style={{ flex: 1 }} />

      {startedAt ? (
        <Pressable style={({ pressed }) => [styles.stopBtn, pressed && { opacity: 0.85 }]} onPress={stop}>
          <Text style={styles.stopBtnText}>Arrêter le minuteur</Text>
        </Pressable>
      ) : (
        <Pressable style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.88 }]} onPress={start}>
          <Text style={styles.startBtnText}>Démarrer le minuteur</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 22 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 22, fontFamily: "Manrope_800ExtraBold", color: COLORS.text },
  intro: { fontSize: 14, fontFamily: "Manrope_400Regular", color: COLORS.textMuted, lineHeight: 20, marginBottom: 28 },

  ringWrap: { alignSelf: "center", alignItems: "center", justifyContent: "center" },
  ringCenter: { position: "absolute", alignItems: "center" },
  ringBig: { fontSize: 38, fontFamily: "Manrope_800ExtraBold" },
  ringUnit: { fontSize: 12, fontFamily: "Manrope_700Bold", color: COLORS.textMuted, letterSpacing: 0.8, marginTop: 2 },

  alertInfo: { textAlign: "center", fontSize: 13, fontFamily: "Manrope_600SemiBold", color: COLORS.textMuted, marginTop: 22 },

  startBtn: { backgroundColor: COLORS.green, borderRadius: 16, minHeight: 58, alignItems: "center", justifyContent: "center" },
  startBtnText: { color: "#fff", fontFamily: "Manrope_800ExtraBold", fontSize: 16 },
  stopBtn: {
    backgroundColor: COLORS.redBg, borderWidth: 1.5, borderColor: "#F1C9C9",
    borderRadius: 16, minHeight: 58, alignItems: "center", justifyContent: "center",
  },
  stopBtnText: { color: COLORS.red, fontFamily: "Manrope_800ExtraBold", fontSize: 16 },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  emptyText: { textAlign: "center", color: COLORS.textMuted, fontSize: 14.5, fontFamily: "Manrope_600SemiBold", lineHeight: 21 },
});
