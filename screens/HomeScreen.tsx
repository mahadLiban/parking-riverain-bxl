import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { getZoneById } from "../data/zones";
import { clearSelectedZoneId } from "../storage/selectedZone";
import { isPointInPolygon } from "../utils/geo";

type Props = {
  zoneId: string;
  onChangeZone: () => void;
};

type Status =
  | { kind: "loading" }
  | { kind: "permission-denied" }
  | { kind: "error"; message: string }
  | { kind: "result"; inside: boolean; accuracy: number | null };

function formatTime(date: Date) {
  return date.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
}

export default function HomeScreen({ zoneId, onChangeZone }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const zone = getZoneById(zoneId);

  const scale = useRef(new Animated.Value(0.9)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const checkPosition = useCallback(async () => {
    setStatus({ kind: "loading" });
    fade.setValue(0);

    const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
    if (permStatus !== "granted") {
      setStatus({ kind: "permission-denied" });
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (!zone) {
        setStatus({ kind: "error", message: "Zone introuvable." });
        return;
      }
      const inside = isPointInPolygon(
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        zone.polygon
      );
      setStatus({ kind: "result", inside, accuracy: position.coords.accuracy ?? null });
      setLastChecked(new Date());
    } catch (e) {
      setStatus({ kind: "error", message: "Impossible d'obtenir ta position." });
    }
  }, [zone, fade]);

  useEffect(() => {
    checkPosition();
  }, [checkPosition]);

  useEffect(() => {
    if (status.kind === "result") {
      scale.setValue(0.85);
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
      Animated.timing(fade, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [status.kind, scale, fade]);

  const handleChangeZone = async () => {
    await clearSelectedZoneId();
    onChangeZone();
  };

  const isResult = status.kind === "result";
  const backgroundColor = isResult ? (status.inside ? "#1FAA59" : "#D8333A") : "#2C2C2E";
  const accentColor = isResult ? (status.inside ? "#16803F" : "#A6242B") : "#1c1c1e";

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <View style={styles.zoneChip}>
          <Text style={styles.zoneChipCommune}>{zone?.commune ?? "—"}</Text>
          <Text style={styles.zoneChipName}>{zone?.name ?? "Zone inconnue"}</Text>
        </View>
        <Pressable style={styles.changeBtn} onPress={handleChangeZone} hitSlop={10}>
          <Text style={styles.changeBtnText}>Changer</Text>
        </Pressable>
      </View>

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.button,
            { backgroundColor: "rgba(255,255,255,0.16)", borderColor: "rgba(255,255,255,0.35)" },
            isResult && { transform: [{ scale }] },
          ]}
        >
          <Pressable style={styles.buttonInner} onPress={checkPosition}>
            {status.kind === "loading" && (
              <Text style={styles.buttonTextSmall}>Localisation...</Text>
            )}
            {status.kind === "permission-denied" && (
              <Text style={styles.buttonTextSmall}>
                Active la localisation pour utiliser l'app
              </Text>
            )}
            {status.kind === "error" && (
              <Text style={styles.buttonTextSmall}>{status.message}</Text>
            )}
            {isResult && (
              <>
                <Text style={styles.buttonIcon}>{status.inside ? "✓" : "✕"}</Text>
                <Text style={styles.buttonText}>{status.inside ? "OUI" : "NON"}</Text>
              </>
            )}
          </Pressable>
        </Animated.View>

        {isResult && (
          <Animated.View style={{ opacity: fade, alignItems: "center" }}>
            <Text style={styles.helper}>
              {status.inside
                ? "Tu peux te garer gratuitement ici avec ta carte riverain."
                : "Tu es hors de ta zone riverain — le stationnement payant s'applique."}
            </Text>
            {lastChecked && (
              <Text style={[styles.meta, { color: "rgba(255,255,255,0.75)" }]}>
                Vérifié à {formatTime(lastChecked)}
                {status.accuracy ? ` · précision ±${Math.round(status.accuracy)}m` : ""}
              </Text>
            )}
          </Animated.View>
        )}
      </View>

      <Pressable
        style={[styles.refresh, { backgroundColor: accentColor }]}
        onPress={checkPosition}
      >
        <Text style={styles.refreshText}>↻ Actualiser ma position</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 36 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  zoneChip: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  zoneChipCommune: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "600", letterSpacing: 0.3 },
  zoneChipName: { fontSize: 16, color: "#fff", fontWeight: "700", marginTop: 1 },
  changeBtn: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  changeBtnText: { fontSize: 14, color: "#fff", fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 28 },
  button: {
    width: 260,
    height: 260,
    borderRadius: 130,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  buttonInner: { alignItems: "center", justifyContent: "center", width: "100%", height: "100%" },
  buttonIcon: { fontSize: 44, fontWeight: "900", color: "#fff", marginBottom: 4 },
  buttonText: { fontSize: 56, fontWeight: "800", color: "#fff", letterSpacing: 1 },
  buttonTextSmall: { fontSize: 16, fontWeight: "600", color: "#fff", textAlign: "center", paddingHorizontal: 20 },
  helper: { fontSize: 16, color: "#fff", textAlign: "center", fontWeight: "600", paddingHorizontal: 12, lineHeight: 22 },
  meta: { fontSize: 13, marginTop: 8, fontWeight: "500" },
  refresh: {
    alignSelf: "center",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
  },
  refreshText: { fontSize: 15, color: "#fff", fontWeight: "700" },
});
