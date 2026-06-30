import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { BlurView } from "expo-blur";
import { useFonts } from "expo-font";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Defs, RadialGradient, Rect, Stop, Svg } from "react-native-svg";
import { CheckIcon, CrossIcon, LogoutIcon, PinIcon, RefreshIcon } from "../components/icons";
import ParkingTimerCard from "../components/ParkingTimerCard";
import RegulationMap from "../components/RegulationMap";
import { findRegulationZone, RegulationMatch } from "../data/regulationZones";
import { getZoneById } from "../data/zones";
import { getLastResult, setLastResult } from "../storage/lastResult";
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
  | { kind: "result"; inside: boolean; accuracy: number | null; regulation: RegulationMatch | null; position: { latitude: number; longitude: number }; stale?: boolean };

const GREEN = "#22D17E";
const RED = "#FF3B5C";

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
      body: "Pas de données pour cette rue. Vérifie la signalisation sur place.",
    };
  }
  const z = match.zone;
  const label = REGULATION_LABELS[z.type] ?? z.typeLabel ?? "Inconnu";
  const prefix = match.exact ? "" : `Rue proche (~${Math.round(match.distanceMeters)} m) · `;

  if (z.type === "gratuit")
    return { title: `${prefix}${label}`, body: "Stationnement gratuit, sans carte riverain." };
  if (z.type === "reserve-riverain")
    return { title: `${prefix}${label}`, body: "Réservé aux détenteurs d'une carte riverain de ce secteur." };
  if (z.type === "poids-lourds")
    return { title: `${prefix}${label}`, body: "Zone poids-lourds. Pour une voiture normale, la règle habituelle de la rue s'applique." };
  if (z.type === "evenement")
    return { title: `${prefix}${label}`, body: "Réglementation événementielle ponctuelle. Vérifie la signalisation temporaire sur place, elle prime sur la règle habituelle." };

  const parts: string[] = [];
  if (z.starthour && z.endhour) parts.push(`Payant ${z.starthour}–${z.endhour}`);
  else parts.push("Horaires variables");
  if (z.type === "bleue") parts.push("disque requis");
  if (z.maxtime) parts.push(`max ${z.maxtime} min`);
  if (z.freetime && z.freetime !== "0") parts.push(`${z.freetime} min offertes`);
  if (z.charge60) parts.push(`${z.charge60} €/1h`);
  if (z.charge120) parts.push(`${z.charge120} €/2h`);

  return { title: `${prefix}${label}`, body: parts.join(" · ") + " (sans carte riverain)." };
}

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
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />;
}

function GlassCard({ children, style }: { children: React.ReactNode; style?: object }) {
  if (Platform.OS === "web") {
    return <View style={[styles.glassCardWeb, style]}>{children}</View>;
  }
  return (
    <BlurView intensity={22} tint="dark" style={[styles.glassCard, style]}>
      {children}
    </BlurView>
  );
}

export default function HomeScreen({ zoneId, username, onChangeZone, onLogout }: Props) {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const zone = getZoneById(zoneId);
  const insets = useSafeAreaInsets();

  const scale = useRef(new Animated.Value(0.85)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;
  const tintOpacity = useRef(new Animated.Value(0)).current;
  const fade2 = useRef(new Animated.Value(0)).current;
  const fade3 = useRef(new Animated.Value(0)).current;
  const fade4 = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = useCallback(() => {
    pulseLoop.current?.stop();
    pulseScale.setValue(1);
    pulseOpacity.setValue(0.5);
    pulseLoop.current = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseScale, { toValue: 1.18, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 0, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  }, [pulseScale, pulseOpacity]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    pulseScale.setValue(1);
    pulseOpacity.setValue(0);
  }, [pulseScale, pulseOpacity]);

  const checkPosition = useCallback(async () => {
    setStatus({ kind: "loading" });
    fade.setValue(0);
    slideUp.setValue(20);
    tintOpacity.setValue(0);
    stopPulse();

    const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
    if (permStatus !== "granted") { setStatus({ kind: "permission-denied" }); return; }

    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!zone) { setStatus({ kind: "error", message: "Zone introuvable." }); return; }
      const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const inside = isPointInPolygon(coords, zone.polygon);
      const regulation = findRegulationZone(coords);
      setStatus({ kind: "result", inside, accuracy: position.coords.accuracy ?? null, regulation, position: coords });
      setLastChecked(new Date());
      hapticFeedback(inside ? "success" : "warning");
      setLastResult({ inside, regulation, checkedAt: Date.now(), latitude: coords.latitude, longitude: coords.longitude }).catch(() => {});
    } catch {
      const cached = await getLastResult().catch(() => null);
      if (cached) {
        setStatus({ kind: "result", inside: cached.inside, accuracy: null, regulation: cached.regulation, position: { latitude: cached.latitude, longitude: cached.longitude }, stale: true });
        setLastChecked(new Date(cached.checkedAt));
      } else {
        setStatus({ kind: "error", message: "Impossible d'obtenir ta position." });
      }
    }
  }, [zone, fade, slideUp, tintOpacity, stopPulse]);

  useEffect(() => { checkPosition(); }, [checkPosition]);

  useEffect(() => {
    if (status.kind === "result") {
      scale.setValue(0.82);
      fade2.setValue(0);
      fade3.setValue(0);
      fade4.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 55, useNativeDriver: true }),
        Animated.timing(tintOpacity, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 480, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 480, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade2, { toValue: 1, duration: 420, delay: 230, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade3, { toValue: 1, duration: 420, delay: 310, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade4, { toValue: 1, duration: 420, delay: 390, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
      startPulse();
    }
  }, [status.kind, scale, fade, slideUp, tintOpacity, fade2, fade3, fade4, startPulse]);

  const handlePressIn = () => Animated.spring(pressScale, { toValue: 0.93, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  if (!fontsLoaded) return <View style={styles.root} />;

  const isResult = status.kind === "result";
  const inside = isResult ? status.inside : null;
  const accentColor = inside === true ? GREEN : inside === false ? RED : "rgba(255,255,255,0.15)";
  const glowColor = inside === true ? "rgba(34,209,126,0.22)" : inside === false ? "rgba(255,59,92,0.22)" : "transparent";

  return (
    <View style={styles.root}>
      {/* Dark base */}
      <View style={StyleSheet.absoluteFill} />

      {/* Aurora background */}
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" width="100%" height="100%">
        <Defs>
          <RadialGradient id="b1" cx="15%" cy="22%" r="55%">
            <Stop offset="0%" stopColor="#6B21C8" stopOpacity="0.55" />
            <Stop offset="100%" stopColor="#6B21C8" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="b2" cx="85%" cy="72%" r="50%">
            <Stop offset="0%" stopColor="#0051CC" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0051CC" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="b3" cx="55%" cy="5%" r="40%">
            <Stop offset="0%" stopColor="#00C9A7" stopOpacity="0.28" />
            <Stop offset="100%" stopColor="#00C9A7" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#b1)" />
        <Rect width="100%" height="100%" fill="url(#b2)" />
        <Rect width="100%" height="100%" fill="url(#b3)" />
      </Svg>

      {/* Status tint overlay */}
      {isResult && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: tintOpacity, backgroundColor: glowColor }]}
        />
      )}

      <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) + 16, paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={styles.header}>
          <GlassCard style={styles.zoneChip}>
            <PinIcon size={13} color="rgba(255,255,255,0.7)" />
            <View>
              <Text style={styles.zoneCommune}>{zone?.commune ?? "—"}</Text>
              <Text style={styles.zoneName}>{zone?.name ?? "Zone inconnue"}</Text>
            </View>
          </GlassCard>
          <View style={styles.headerRight}>
            <Pressable style={styles.headerBtn} onPress={onChangeZone} hitSlop={10}>
              <Text style={styles.headerBtnText}>Changer</Text>
            </Pressable>
            <Pressable style={styles.headerIconBtn} onPress={onLogout} hitSlop={10}>
              <LogoutIcon size={14} color="rgba(255,255,255,0.8)" />
            </Pressable>
          </View>
        </View>

        <Text style={styles.greeting}>Salut {username} 👋</Text>

        {/* Button */}
        <View style={styles.buttonWrap}>
          {/* Pulsing ring */}
          {isResult && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseRing,
                { borderColor: accentColor, transform: [{ scale: Animated.multiply(scale, pulseScale) }], opacity: pulseOpacity },
              ]}
            />
          )}

          <Animated.View style={{ transform: [{ scale: Animated.multiply(scale, pressScale) }] }}>
            <Pressable
              onPress={checkPosition}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={[
                styles.button,
                isResult && {
                  shadowColor: accentColor,
                  shadowOpacity: 0.6,
                  shadowRadius: 42,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 24,
                },
              ]}
            >
              <View style={[styles.buttonRing, { borderColor: isResult ? accentColor : "rgba(255,255,255,0.18)" }]}>
                <View style={styles.buttonInner}>
                  {status.kind === "loading" && (
                    <>
                      <Spinner />
                      <Text style={styles.btnSmallText}>Localisation…</Text>
                    </>
                  )}
                  {status.kind === "permission-denied" && (
                    <>
                      <PinIcon size={28} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.btnSmallText}>Active la localisation</Text>
                    </>
                  )}
                  {status.kind === "error" && (
                    <Text style={styles.btnSmallText}>{status.message}</Text>
                  )}
                  {isResult && (
                    <>
                      <View style={[styles.iconBubble, { backgroundColor: `${accentColor}28` }]}>
                        {status.inside ? <CheckIcon size={32} /> : <CrossIcon size={32} />}
                      </View>
                      <Text style={[styles.btnBigText, { color: accentColor }]}>
                        {status.inside ? "OUI" : "NON"}
                      </Text>
                      <Text style={styles.btnSubText}>carte riverain</Text>
                    </>
                  )}
                </View>
              </View>
            </Pressable>
          </Animated.View>

          {status.kind === "permission-denied" && (
            <Pressable style={styles.settingsBtn} onPress={() => Linking.openSettings()}>
              <Text style={styles.settingsBtnText}>Ouvrir les réglages →</Text>
            </Pressable>
          )}
          {status.kind === "error" && (
            <Pressable style={styles.settingsBtn} onPress={checkPosition}>
              <Text style={styles.settingsBtnText}>Réessayer →</Text>
            </Pressable>
          )}
        </View>

        {/* Scrollable cards */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Stale banner */}
          {isResult && status.stale && (
            <View style={styles.staleBanner}>
              <Text style={styles.staleBannerText}>
                ⚠ Hors-ligne · Dernière position{lastChecked ? ` (${formatTime(lastChecked)})` : ""}
              </Text>
            </View>
          )}

          {/* Riverain card */}
          {isResult && (
            <Animated.View style={[styles.cardWrap, { opacity: fade, transform: [{ translateY: slideUp }] }]}>
              <GlassCard style={styles.infoCard}>
                <View style={[styles.cardAccentBar, { backgroundColor: accentColor }]} />
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, { color: accentColor }]}>
                    {status.inside ? "Gratuit avec ta carte" : "Hors zone riverain"}
                  </Text>
                  <Text style={styles.cardText}>
                    {status.inside
                      ? "Tu es dans ta zone riverain — stationnement gratuit ici avec ta carte."
                      : "Tu es hors de ta zone. Le tarif public s'applique."}
                  </Text>
                  {lastChecked && !status.stale && (
                    <View style={styles.metaRow}>
                      <View style={[styles.metaDot, { backgroundColor: accentColor }]} />
                      <Text style={styles.metaText}>
                        {formatTime(lastChecked)}
                        {status.accuracy ? ` · ±${Math.round(status.accuracy)} m` : ""}
                      </Text>
                    </View>
                  )}
                </View>
              </GlassCard>
            </Animated.View>
          )}

          {/* Regulation card */}
          {isResult && (() => {
            const reg = regulationSummary(status.regulation);
            return (
              <Animated.View style={[styles.cardWrap, { opacity: fade2, transform: [{ translateY: slideUp }] }]}>
                <GlassCard style={styles.infoCard}>
                  <View style={[styles.cardAccentBar, { backgroundColor: "rgba(255,255,255,0.25)" }]} />
                  <View style={styles.cardBody}>
                    <Text style={styles.cardLabel}>Sans carte riverain</Text>
                    <Text style={styles.cardTitle}>{reg.title}</Text>
                    <Text style={styles.cardText}>{reg.body}</Text>
                  </View>
                </GlassCard>
              </Animated.View>
            );
          })()}

          {/* Timer card */}
          {isResult && status.regulation && (
            <Animated.View style={[styles.cardWrap, { opacity: fade3, transform: [{ translateY: slideUp }] }]}>
              <ParkingTimerCard zone={status.regulation.zone} />
            </Animated.View>
          )}

          {/* Map */}
          {isResult && zone && (
            <Animated.View style={[styles.cardWrap, { opacity: fade4, transform: [{ translateY: slideUp }] }]}>
              <RegulationMap
                position={status.position}
                residentPolygon={zone.polygon}
                regulationPolygons={status.regulation?.zone.polygons ?? []}
                inside={status.inside}
              />
            </Animated.View>
          )}

          {/* Refresh */}
          <Pressable
            style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.75 }]}
            onPress={checkPosition}
          >
            <View style={[styles.refreshInner, { borderColor: accentColor }]}>
              <RefreshIcon size={14} color={accentColor} />
              <Text style={[styles.refreshText, { color: accentColor }]}>Actualiser</Text>
            </View>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const RING = 250;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#08080D" },
  container: { flex: 1, paddingHorizontal: 20 },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  zoneChip: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  zoneCommune: { fontSize: 10.5, color: "rgba(255,255,255,0.5)", fontFamily: "Manrope_600SemiBold", letterSpacing: 0.4 },
  zoneName: { fontSize: 14.5, color: "#fff", fontFamily: "Manrope_700Bold", marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  headerBtnText: { fontSize: 13, color: "rgba(255,255,255,0.85)", fontFamily: "Manrope_700Bold" },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },

  greeting: { color: "rgba(255,255,255,0.45)", fontFamily: "Manrope_600SemiBold", fontSize: 13, marginTop: 12, marginBottom: 4 },

  // Button
  buttonWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 30, gap: 18 },
  settingsBtn: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  settingsBtnText: { fontSize: 13.5, fontFamily: "Manrope_700Bold", color: "rgba(255,255,255,0.8)" },
  pulseRing: {
    position: "absolute",
    width: RING + 24,
    height: RING + 24,
    borderRadius: (RING + 24) / 2,
    borderWidth: 1.5,
  },
  button: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
  },
  buttonRing: {
    flex: 1,
    borderRadius: RING / 2,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  buttonInner: {
    flex: 1,
    width: "100%",
    borderRadius: (RING - 28) / 2,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  iconBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  btnBigText: { fontSize: 46, fontFamily: "Manrope_800ExtraBold", letterSpacing: 2 },
  btnSubText: { fontSize: 12, fontFamily: "Manrope_600SemiBold", color: "rgba(255,255,255,0.35)", letterSpacing: 0.5 },
  btnSmallText: {
    fontSize: 13.5,
    fontFamily: "Manrope_600SemiBold",
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    paddingHorizontal: 28,
    marginTop: 12,
    lineHeight: 19,
  },

  // Cards
  scrollArea: { flex: 1 },
  scrollContent: { alignItems: "center", gap: 12, paddingBottom: 32 },
  cardWrap: { width: "100%", maxWidth: 340 },
  glassCard: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
  },
  glassCardWeb: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
  },
  infoCard: { width: "100%" },
  cardAccentBar: { width: 3, borderRadius: 2, marginVertical: 18, marginLeft: 16 },
  cardBody: { flex: 1, paddingVertical: 18, paddingRight: 18, paddingLeft: 12 },
  cardLabel: { fontSize: 10, fontFamily: "Manrope_700Bold", color: "rgba(255,255,255,0.35)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 5 },
  cardTitle: { fontSize: 16, fontFamily: "Manrope_800ExtraBold", color: "#fff", marginBottom: 6 },
  cardText: { fontSize: 13.5, fontFamily: "Manrope_400Regular", color: "rgba(255,255,255,0.55)", lineHeight: 19 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  metaDot: { width: 5, height: 5, borderRadius: 2.5 },
  metaText: { fontSize: 11.5, fontFamily: "Manrope_600SemiBold", color: "rgba(255,255,255,0.3)" },

  // Stale banner
  staleBanner: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "rgba(255,185,0,0.14)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,185,0,0.25)",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  staleBannerText: { fontSize: 12.5, fontFamily: "Manrope_600SemiBold", color: "#F5C842", textAlign: "center" },

  // Refresh
  refreshBtn: { marginTop: 8, marginBottom: 8 },
  refreshInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
  },
  refreshText: { fontSize: 13.5, fontFamily: "Manrope_700Bold" },

  spinner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.15)",
    borderTopColor: "rgba(255,255,255,0.8)",
  },
});
