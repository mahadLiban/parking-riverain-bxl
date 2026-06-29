import * as Notifications from "expo-notifications";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { RegulationZone } from "../data/regulationZones";
import { getParkingTimer, setParkingTimer } from "../storage/parkingTimer";

type Props = {
  zone: RegulationZone;
};

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

export default function ParkingTimerCard({ zone }: Props) {
  const maxtimeMinutes = zone.maxtime ? parseInt(zone.maxtime, 10) : null;
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    getParkingTimer().then((t) => {
      if (t && t.zoneCode === zone.code) setStartedAt(t.startedAt);
    });
  }, [zone.code]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!maxtimeMinutes) return null;

  const endAt = startedAt ? startedAt + maxtimeMinutes * 60_000 : null;
  const remaining = endAt ? endAt - now : null;
  const expired = remaining !== null && remaining <= 0;

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
              body: `Il te reste environ 5 minutes sur cette place (${zone.typeLabel ?? "zone réglementée"}).`,
            },
            trigger: { seconds: fireInSeconds } as Notifications.TimeIntervalTriggerInput,
          });
        }
      } catch {
        // notifications unavailable (e.g. web) — timer still works visually
      }
    }

    setStartedAt(startTime);
    await setParkingTimer({ startedAt: startTime, maxtimeMinutes, zoneCode: zone.code, notificationId });
  };

  const stop = async () => {
    const t = await getParkingTimer();
    if (t?.notificationId && Platform.OS !== "web") {
      Notifications.cancelScheduledNotificationAsync(t.notificationId).catch(() => {});
    }
    setStartedAt(null);
    await setParkingTimer(null);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Minuteur de stationnement</Text>
      {startedAt ? (
        <>
          <Text style={[styles.time, expired && styles.timeExpired]}>
            {expired ? "Temps écoulé" : formatRemaining(remaining!)}
          </Text>
          <Text style={styles.sub}>
            {expired
              ? "Pense à déplacer ton véhicule ou à reprendre un ticket."
              : `Sur une durée max de ${maxtimeMinutes} min. Tu seras averti ~5 min avant la fin.`}
          </Text>
          <Pressable style={styles.stopBtn} onPress={stop}>
            <Text style={styles.stopBtnText}>Arrêter le minuteur</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.sub}>Démarre un minuteur pour ne pas dépasser les {maxtimeMinutes} min autorisées.</Text>
          <Pressable style={styles.startBtn} onPress={start}>
            <Text style={styles.startBtnText}>Démarrer mon stationnement</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: "100%",
    maxWidth: 340,
  },
  label: {
    fontSize: 10.5,
    fontFamily: "Manrope_700Bold",
    color: "#9b9ba1",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  time: { fontSize: 30, fontFamily: "Manrope_800ExtraBold", color: "#1a1a1a", marginBottom: 4 },
  timeExpired: { color: "#D8333A" },
  sub: { fontSize: 13, fontFamily: "Manrope_400Regular", color: "#4a4a4f", lineHeight: 18, marginBottom: 12 },
  startBtn: { backgroundColor: "#1FAA59", borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  startBtnText: { color: "#fff", fontFamily: "Manrope_700Bold", fontSize: 13.5 },
  stopBtn: { backgroundColor: "#F2F2F7", borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  stopBtnText: { color: "#7E161B", fontFamily: "Manrope_700Bold", fontSize: 13.5 },
});
