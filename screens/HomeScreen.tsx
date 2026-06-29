import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
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
import { CheckIcon, CrossIcon, LogoutIcon, PinIcon, RefreshIcon } from "../components/icons";
import { findRegulationZone, RegulationMatch } from "../data/regulationZones";
import { getZoneById } from "../data/zones";
import { isPointInPolygon } from "../utils/geo";

type Props = {
  zoneId: string;
  username: string;
  onChangeZone: () => void;
  onLogout: () => void;
};

type Status =
  | { kind: "loading" }
  | { kind: "permission-denied" }
  | { kind: "error"; message: string }
  | { kind: "result"; inside: boolean; accuracy: number | null; regulation: RegulationMatch | null };

const REGULATION_LABELS: Record<string, string> = {
  rouge: "Zone rouge",
  bleue: "Zone bleue · disque obligatoire",
  verte: "Zone verte",
  grise: "Zone grise",
  orange: "Zone orange",
  evenement: "Zone événement",
  "poids-lourds": "Zone poids-lourds",
  "reserve-riverain": "Réservé riverains",
  gratuit: "Stationnement gratuit",
  inconnu: "Réglementation inconnue",
};

function regulationSummary(match: RegulationMatch | null): { title: string; body: string } {
  if (!match) {
    return {
      title: "Réglementation inconnue ici",
      body: "On n'a pas encore de données précises pour cette rue. Vérifie la signalisation sur place.",
    };
  }
  const z = match.zone;
  const label = REGULATION_LABELS[z.type] ?? z.typeLabel;
  const prefix = match.exact ? "" : `Rue la plus proche (~${Math.round(match.distanceMeters)} m) · `;

  if (z.type === "gratuit") {
    return { title: `${prefix}${label}`, body: "Stationnement gratuit, sans carte riverain nécessaire." };
  }
  if (z.type === "reserve-riverain") {
    return { title: `${prefix}${label}`, body: "Réservé aux détenteurs d'une carte riverain de ce secteur." };
  }

  const parts: string[] = [];
  if (z.starthour && z.endhour) parts.push(`payant ${z.starthour}–${z.endhour}`);
  else parts.push("réglementation horaire variable");
  if (z.type === "bleue") parts.push("disque de stationnement requis");
  if (z.maxtime) parts.push(`durée max ${z.maxtime} min`);
  if (z.freetime) parts.push(`${z.freetime} min gratuites`);
  if (z.fee) parts.push(`tarif ${z.fee} €/h`);

  return { title: `${prefix}${label}`, body: parts.join(" · ") + " (sans carte riverain)." };
}

const PALETTES = {
  loading: ["#2C2C30", "#15151A"] as const,
  ok: ["#3FCB7A", "#0E8A47"] as const,
  ko: ["#F0565C", "#9E1F26"] as const,
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
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />;
}

export default function HomeScreen({ zoneId, username, onChangeZone, onLogout }: Props) {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const zone = getZoneById(zoneId);

  const scale = useRef(new Animated.Value(0.82)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(14)).current;
  const colorFade = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  const checkPosition = useCallback(async () => {
    setStatus({ kind: "loading" });
    fade.setValue(0);
    slideUp.setValue(14);
    colorFade.setValue(0);

    const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
    if (permStatus !== "granted") {
      setStatus({ kind: "permission-denied" });
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!zone) {
        setStatus({ kind: "error", message: "Zone introuvable." });
        return;
      }
      const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const inside = isPointInPolygon(coords, zone.polygon);
      const regulation = findRegulationZone(coords);
      setStatus({ kind: "result", inside, accuracy: position.coords.accuracy ?? null, regulation });
      setLastChecked(new Date());
      hapticFeedback(inside ? "success" : "warning");
    } catch (e) {
      setStatus({ kind: "error", message: "Impossible d'obtenir ta position." });
    }
  }, [zone, fade, slideUp, colorFade]);

  useEffect(() => {
    checkPosition();
  }, [checkPosition]);

  useEffect(() => {
    if (status.kind === "result") {
      scale.setValue(0.8);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
        Animated.timing(colorFade, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(fade, { toValue: 1, duration: 420, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 420, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [status.kind, scale, fade, slideUp, colorFade]);

  const handlePressIn = () =>
    Animated.spring(pressScale, { toValue: 0.95, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () =>
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  if (!fontsLoaded) return <View style={styles.root} />;

  const isResult = status.kind === "result";
  const palette = isResult ? (status.inside ? PALETTES.ok : PALETTES.ko) : PALETTES.loading;
  const accentColor = isResult ? (status.inside ? "#0B6E38" : "#7E161B") : "#000";
  const cardTextColor = isResult ? (status.inside ? "#0B6E38" : "#7E161B") : "#1a1a1a";

  return (
    <View style={styles.root}>
      <LinearGradient colors={PALETTES.loading} style={StyleSheet.absoluteFill} />
      {isResult && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: colorFade }]}>
          <LinearGradient colors={palette} style={StyleSheet.absoluteFill} start={{ x: 0.1, y: 0 }} end={{ x: 0.95, y: 1 }} />
        </Animated.View>
      )}

      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.zoneChip}>
            <PinIcon size={14} color="rgba(255,255,255,0.85)" />
            <View style={styles.zoneChipTextWrap}>
              <Text style={styles.zoneChipCommune}>{zone?.commune ?? "—"}</Text>
              <Text style={styles.zoneChipName}>{zone?.name ?? "Zone inconnue"}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.changeBtn} onPress={onChangeZone} hitSlop={10}>
              <Text style={styles.changeBtnText}>Changer</Text>
            </Pressable>
            <Pressable style={styles.logoutBtn} onPress={onLogout} hitSlop={10}>
              <LogoutIcon size={15} color="#fff" />
            </Pressable>
          </View>
        </View>
        <Text style={styles.greeting}>Salut {username} 👋</Text>

        <View style={styles.center}>
          <Animated.View
            style={[
              styles.buttonShadowWrap,
              isResult && { transform: [{ scale: Animated.multiply(scale, pressScale) }] },
              !isResult && { transform: [{ scale: pressScale }] },
            ]}
          >
            <Pressable style={styles.button} onPress={checkPosition} onPressIn={handlePressIn} onPressOut={handlePressOut}>
              <View style={styles.buttonRing}>
                <View style={styles.buttonInner}>
                  {status.kind === "loading" && (
                    <>
                      <Spinner />
                      <Text style={styles.buttonTextSmall}>Localisation...</Text>
                    </>
                  )}
                  {status.kind === "permission-denied" && (
                    <>
                      <PinIcon size={26} color="#fff" />
                      <Text style={styles.buttonTextSmall}>Active la localisation pour utiliser l'app</Text>
                    </>
                  )}
                  {status.kind === "error" && <Text style={styles.buttonTextSmall}>{status.message}</Text>}
                  {isResult && (
                    <>
                      <View style={styles.iconCircle}>
                        {status.inside ? <CheckIcon size={34} /> : <CrossIcon size={34} />}
                      </View>
                      <Text style={styles.buttonText}>{status.inside ? "OUI" : "NON"}</Text>
                    </>
                  )}
                </View>
              </View>
            </Pressable>
          </Animated.View>

          {isResult && (
            <Animated.View
              style={[styles.infoCard, { opacity: fade, transform: [{ translateY: slideUp }] }]}
            >
              <Text style={[styles.infoTitle, { color: cardTextColor }]}>
                {status.inside ? "Stationnement gratuit" : "Stationnement payant"}
              </Text>
              <Text style={styles.infoBody}>
                {status.inside
                  ? "Tu es dans ta zone riverain. Tu peux te garer gratuitement ici avec ta carte."
                  : "Tu es hors de ta zone riverain. Le tarif normal s'applique sur cette rue."}
              </Text>
              {lastChecked && (
                <View style={styles.infoMetaRow}>
                  <View style={styles.infoMetaDot} />
                  <Text style={styles.infoMeta}>
                    Vérifié à {formatTime(lastChecked)}
                    {status.accuracy ? ` · précision ±${Math.round(status.accuracy)} m` : ""}
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          {isResult &&
            (() => {
              const reg = regulationSummary(status.regulation);
              return (
                <Animated.View
                  style={[styles.infoCard, styles.regCard, { opacity: fade, transform: [{ translateY: slideUp }] }]}
                >
                  <Text style={styles.regLabel}>Sans carte riverain</Text>
                  <Text style={[styles.infoTitle, { color: "#1a1a1a" }]}>{reg.title}</Text>
                  <Text style={styles.infoBody}>{reg.body}</Text>
                </Animated.View>
              );
            })()}
        </View>

        <Pressable
          style={({ pressed }) => [styles.refresh, { backgroundColor: accentColor }, pressed && { opacity: 0.85 }]}
          onPress={checkPosition}
        >
          <RefreshIcon size={15} />
          <Text style={styles.refreshText}>Actualiser ma position</Text>
        </Pressable>
      </View>
    </View>
  );
}

const RING = 248;

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 36 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  zoneChip: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  zoneChipTextWrap: {},
  zoneChipCommune: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "Manrope_600SemiBold", letterSpacing: 0.3 },
  zoneChipName: { fontSize: 15, color: "#fff", fontFamily: "Manrope_700Bold", marginTop: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  changeBtn: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  changeBtnText: { fontSize: 13, color: "#fff", fontFamily: "Manrope_700Bold" },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: { color: "rgba(255,255,255,0.85)", fontFamily: "Manrope_600SemiBold", fontSize: 13, marginTop: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 24 },
  buttonShadowWrap: {
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
  },
  button: { width: RING, height: RING, borderRadius: RING / 2, alignItems: "center", justifyContent: "center" },
  buttonRing: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  buttonInner: {
    flex: 1,
    width: "100%",
    borderRadius: (RING - 24) / 2,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  buttonText: { fontSize: 44, fontFamily: "Manrope_800ExtraBold", color: "#fff", letterSpacing: 1.5 },
  buttonTextSmall: {
    fontSize: 14,
    fontFamily: "Manrope_600SemiBold",
    color: "#fff",
    textAlign: "center",
    paddingHorizontal: 26,
    marginTop: 14,
    lineHeight: 19,
  },
  infoCard: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  infoTitle: { fontSize: 16, fontFamily: "Manrope_800ExtraBold", marginBottom: 6 },
  regCard: { backgroundColor: "rgba(255,255,255,0.9)" },
  regLabel: {
    fontSize: 10.5,
    fontFamily: "Manrope_700Bold",
    color: "#9b9ba1",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  infoBody: { fontSize: 13.5, fontFamily: "Manrope_400Regular", color: "#4a4a4f", lineHeight: 19 },
  infoMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  infoMetaDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#9b9ba1" },
  infoMeta: { fontSize: 12, fontFamily: "Manrope_600SemiBold", color: "#9b9ba1" },
  spinner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.25)",
    borderTopColor: "#fff",
  },
  refresh: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    alignSelf: "center",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  refreshText: { fontSize: 14, color: "#fff", fontFamily: "Manrope_700Bold" },
});
