import * as Location from "expo-location";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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

export default function HomeScreen({ zoneId, onChangeZone }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const zone = getZoneById(zoneId);

  const checkPosition = useCallback(async () => {
    setStatus({ kind: "loading" });

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
    } catch (e) {
      setStatus({ kind: "error", message: "Impossible d'obtenir ta position." });
    }
  }, [zone]);

  useEffect(() => {
    checkPosition();
  }, [checkPosition]);

  const handleChangeZone = async () => {
    await clearSelectedZoneId();
    onChangeZone();
  };

  const backgroundColor =
    status.kind === "result" ? (status.inside ? "#1FAA59" : "#D8333A") : "#E5E5EA";

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Text style={styles.zoneLabel}>
          {zone ? `${zone.commune} · ${zone.name}` : "Zone inconnue"}
        </Text>
        <Pressable onPress={handleChangeZone}>
          <Text style={styles.changeZone}>Changer</Text>
        </Pressable>
      </View>

      <Pressable style={styles.button} onPress={checkPosition}>
        {status.kind === "loading" && <Text style={styles.buttonText}>...</Text>}
        {status.kind === "permission-denied" && (
          <Text style={styles.buttonTextSmall}>
            Active la localisation pour utiliser l'app
          </Text>
        )}
        {status.kind === "error" && (
          <Text style={styles.buttonTextSmall}>{status.message}</Text>
        )}
        {status.kind === "result" && (
          <Text style={styles.buttonText}>{status.inside ? "OUI" : "NON"}</Text>
        )}
      </Pressable>

      {status.kind === "result" && (
        <Text style={styles.helper}>
          {status.inside
            ? "Tu peux te garer gratuitement ici avec ta carte riverain."
            : "Tu es hors de ta zone riverain — le stationnement payant s'applique."}
        </Text>
      )}

      <Pressable style={styles.refresh} onPress={checkPosition}>
        <Text style={styles.refreshText}>Actualiser ma position</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  header: {
    position: "absolute",
    top: 60,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  zoneLabel: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  changeZone: { fontSize: 15, color: "#1A1A1A", textDecorationLine: "underline" },
  button: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 64, fontWeight: "800", color: "#fff" },
  buttonTextSmall: { fontSize: 16, fontWeight: "600", color: "#fff", textAlign: "center", paddingHorizontal: 16 },
  helper: { marginTop: 28, fontSize: 16, color: "#fff", textAlign: "center", fontWeight: "500" },
  refresh: { marginTop: 40 },
  refreshText: { fontSize: 14, color: "#1A1A1A", textDecorationLine: "underline" },
});
