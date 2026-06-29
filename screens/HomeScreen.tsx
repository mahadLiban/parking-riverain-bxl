import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
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

const PALETTES = {
  loading: ["#3A3A3C", "#1c1c1e"] as const,
  ok: ["#34C166", "#168A46"] as const,
  ko: ["#E5484D", "#A6242B"] as const,
};

function formatTime(date: Date) {
  return date.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
}

function hapticFeedback(kind: "success" | "warning") {
  if (Platform.OS === "web") return;
  if (kind === "success") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }
}

function Spinner() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />;
}

export default function HomeScreen({ zoneId, onChangeZone }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const zone = getZoneById(zoneId);

  const scale = useRef(new Animated.Value(0.9)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const colorFade = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  const checkPosition = useCallback(async () => {
    setStatus({ kind: "loading" });
    fade.setValue(0);
    colorFade.setValue(0);

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
      hapticFeedback(inside ? "success" : "warning");
    } catch (e) {
      setStatus({ kind: "error", message: "Impossible d'obtenir ta position." });
    }
  }, [zone, fade, colorFade]);

  useEffect(() => {
    checkPosition();
  }, [checkPosition]);

  useEffect(() => {
    if (status.kind === "result") {
      scale.setValue(0.82);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 5.5, tension: 70, useNativeDriver: true }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(colorFade, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [status.kind, scale, fade, colorFade]);

  const handleChangeZone = async () => {
    await clearSelectedZoneId();
    onChangeZone();
  };

  const handlePressIn = () =>
    Animated.spring(pressScale, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () =>
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  const isResult = status.kind === "result";
  const palette = isResult ? (status.inside ? PALETTES.ok : PALETTES.ko) : PALETTES.loading;
  const accentColor = isResult ? (status.inside ? "#0E5C30" : "#7A1A1F") : "#000";

  return (
    <View style={styles.root}>
      <LinearGradient colors={PALETTES.loading} style={StyleSheet.absoluteFill} />
      {isResult && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: colorFade }]}>
          <LinearGradient colors={palette} style={StyleSheet.absoluteFill} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} />
        </Animated.View>
      )}

      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.zoneChip}>
            <View style={styles.zoneDot} />
            <View>
              <Text style={styles.zoneChipCommune}>{zone?.commune ?? "—"}</Text>
              <Text style={styles.zoneChipName}>{zone?.name ?? "Zone inconnue"}</Text>
            </View>
          </View>
          <Pressable style={styles.changeBtn} onPress={handleChangeZone} hitSlop={10}>
            <Text style={styles.changeBtnText}>Changer</Text>
          </Pressable>
        </View>

        <View style={styles.center}>
          <Animated.View
            style={[
              styles.buttonShadowWrap,
              isResult && { transform: [{ scale: Animated.multiply(scale, pressScale) }] },
              !isResult && { transform: [{ scale: pressScale }] },
            ]}
          >
            <Pressable
              style={styles.button}
              onPress={checkPosition}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <View style={styles.buttonRing}>
                <View style={styles.buttonInner}>
                  {status.kind === "loading" && (
                    <>
                      <Spinner />
                      <Text style={styles.buttonTextSmall}>Localisation...</Text>
                    </>
                  )}
                  {status.kind === "permission-denied" && (
                    <Text style={styles.buttonTextSmall}>
                      📍 Active la localisation pour utiliser l'app
                    </Text>
                  )}
                  {status.kind === "error" && (
                    <Text style={styles.buttonTextSmall}>{status.message}</Text>
                  )}
                  {isResult && (
                    <>
                      <View style={styles.iconCircle}>
                        <Text style={styles.buttonIcon}>{status.inside ? "✓" : "✕"}</Text>
                      </View>
                      <Text style={styles.buttonText}>{status.inside ? "OUI" : "NON"}</Text>
                    </>
                  )}
                </View>
              </View>
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
                <Text style={styles.meta}>
                  Vérifié à {formatTime(lastChecked)}
                  {status.accuracy ? ` · précision ±${Math.round(status.accuracy)}m` : ""}
                </Text>
              )}
            </Animated.View>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.refresh,
            { backgroundColor: accentColor },
            pressed && { opacity: 0.85 },
          ]}
          onPress={checkPosition}
        >
          <Text style={styles.refreshIcon}>↻</Text>
          <Text style={styles.refreshText}>Actualiser ma position</Text>
        </Pressable>
      </View>
    </View>
  );
}

const RING = 270;

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 36 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  zoneChip: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  zoneDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#fff" },
  zoneChipCommune: { fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "600", letterSpacing: 0.3 },
  zoneChipName: { fontSize: 16, color: "#fff", fontWeight: "700", marginTop: 1 },
  changeBtn: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  changeBtnText: { fontSize: 14, color: "#fff", fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 30 },
  buttonShadowWrap: {
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  button: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonRing: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.32)",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  buttonInner: {
    flex: 1,
    width: "100%",
    borderRadius: (RING - 28) / 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  buttonIcon: { fontSize: 30, fontWeight: "900", color: "#fff" },
  buttonText: { fontSize: 50, fontWeight: "800", color: "#fff", letterSpacing: 2 },
  buttonTextSmall: { fontSize: 15, fontWeight: "600", color: "#fff", textAlign: "center", paddingHorizontal: 24, marginTop: 14 },
  helper: { fontSize: 16, color: "#fff", textAlign: "center", fontWeight: "600", paddingHorizontal: 16, lineHeight: 22 },
  meta: { fontSize: 13, marginTop: 10, fontWeight: "500", color: "rgba(255,255,255,0.8)" },
  spinner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.25)",
    borderTopColor: "#fff",
  },
  refresh: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "center",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  refreshIcon: { fontSize: 16, color: "#fff", fontWeight: "800" },
  refreshText: { fontSize: 15, color: "#fff", fontWeight: "700" },
});
