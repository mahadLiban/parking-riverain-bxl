import { BlurView } from "expo-blur";
import * as Notifications from "expo-notifications";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { RegulationZone } from "../data/regulationZones";
import { getParkingTimer, setParkingTimer } from "../storage/parkingTimer";

type Props = { zone: RegulationZone };

const GREEN = "#22D17E";
const RED = "#FF3B5C";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0
    ? `${h}h ${String(m).padStart(2, "0")}min`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Wrapper({ children }: { children: React.ReactNode }) {
  if (Platform.OS === "web") return <View style={styles.cardWeb}>{children}</View>;
  return <BlurView intensity={22} tint="dark" style={styles.card}>{children}</BlurView>;
}

export default function ParkingTimerCard({ zone }: Props) {
  const maxtimeMinutes = zone.maxtime ? parseInt(zone.maxtime, 10) : null;
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    getParkingTimer().then((t) => { if (t && t.zoneCode === zone.code) setStartedAt(t.startedAt); });
  }, [zone.code]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!maxtimeMinutes) return null;

  const endAt = startedAt ? startedAt + maxtimeMinutes * 60_000 : null;
  const remaining = endAt ? endAt - now : null;
  const expired = remaining !== null && remaining <= 0;
  const pct = remaining !== null && !expired ? Math.max(0, remaining / (maxtimeMinutes * 60_000)) : 0;
  const timeColor = pct > 0.33 ? GREEN : pct > 0 ? "#F5C842" : RED;

  const start = async () => {
    const startTime = Date.now();
    let notificationId: string | null = null;
    if (Platform.OS !== "web") {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === "granted") {
          const fireInSeconds = Math.max(maxtimeMinutes * 60 - 300, 30);
          notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: "Stationnement bientôt expiré",
              body: `Il te reste ~5 min sur cette place.`,
            },
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
    <Wrapper>
      <Text style={styles.label}>Minuteur</Text>
      {startedAt ? (
        <>
          <Text style={[styles.time, { color: expired ? RED : timeColor }]}>
            {expired ? "Temps écoulé !" : formatRemaining(remaining!)}
          </Text>
          {!expired && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: timeColor }]} />
            </View>
          )}
          <Text style={styles.sub}>
            {expired
              ? "Déplace ton véhicule ou renouvelle ton ticket."
              : `Max ${maxtimeMinutes} min · notification 5 min avant la fin.`}
          </Text>
          <Pressable style={[styles.btn, styles.btnStop]} onPress={stop}>
            <Text style={[styles.btnText, { color: RED }]}>Arrêter</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.sub}>Lance un minuteur pour ne pas dépasser les {maxtimeMinutes} min autorisées.</Text>
          <Pressable style={[styles.btn, styles.btnStart]} onPress={start}>
            <Text style={[styles.btnText, { color: "#08080D" }]}>Démarrer mon stationnement</Text>
          </Pressable>
        </>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: 18,
    paddingHorizontal: 20,
    width: "100%",
  },
  cardWeb: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: 18,
    paddingHorizontal: 20,
    width: "100%",
  },
  label: { fontSize: 10, fontFamily: "Manrope_700Bold", color: "rgba(255,255,255,0.35)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  time: { fontSize: 34, fontFamily: "Manrope_800ExtraBold", marginBottom: 8 },
  progressTrack: { height: 4, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 2, marginBottom: 10, overflow: "hidden" },
  progressBar: { height: 4, borderRadius: 2 },
  sub: { fontSize: 13, fontFamily: "Manrope_400Regular", color: "rgba(255,255,255,0.45)", lineHeight: 18, marginBottom: 14 },
  btn: { borderRadius: 999, paddingVertical: 13, alignItems: "center" },
  btnStart: { backgroundColor: GREEN },
  btnStop: { backgroundColor: "rgba(255,59,92,0.12)", borderWidth: 1, borderColor: "rgba(255,59,92,0.3)" },
  btnText: { fontFamily: "Manrope_700Bold", fontSize: 14 },
});
