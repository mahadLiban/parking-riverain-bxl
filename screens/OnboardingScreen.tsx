import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
import React, { useRef, useState } from "react";
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckIcon, PinIcon } from "../components/icons";
import { COLORS } from "../components/theme";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    icon: "pin",
    title: "Ta position, en un coup d'œil",
    body: "L'app vérifie automatiquement si tu es dans ta zone riverain. OUI = tu peux garer gratuit. NON = tarif public.",
  },
  {
    icon: "check",
    title: "Détails de la rue",
    body: "Appuie sur « Détails » pour voir les horaires, le tarif au quart d'heure, et la réglementation exacte de la rue où tu es.",
  },
  {
    icon: "timer",
    title: "Minuteur intégré",
    body: "Lance un minuteur depuis « Minuteur » et reçois une alerte 5 min avant l'expiration de ta durée maximale.",
  },
];

type Props = { onDone: () => void };

function SlideIcon({ type }: { type: string }) {
  if (type === "pin") return <PinIcon size={44} color={COLORS.green} />;
  if (type === "check") return <CheckIcon size={44} color={COLORS.green} />;
  return (
    <View style={iconStyles.timer}>
      <Text style={iconStyles.timerText}>⏱</Text>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  timer: { width: 60, height: 60, alignItems: "center", justifyContent: "center" },
  timerText: { fontSize: 40 },
});

export default function OnboardingScreen({ onDone }: Props) {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  if (!fontsLoaded) return <View style={styles.root} />;

  const goTo = (next: number) => {
    Animated.timing(slideAnim, { toValue: -width * next, duration: 280, useNativeDriver: true }).start();
    setIdx(next);
  };

  const next = () => {
    if (idx < SLIDES.length - 1) goTo(idx + 1);
    else onDone();
  };

  const skip = () => onDone();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }]}>
      <Pressable style={styles.skipBtn} onPress={skip} hitSlop={12}>
        <Text style={styles.skipText}>Passer</Text>
      </Pressable>

      <View style={styles.slidesViewport}>
        <Animated.View style={[styles.slidesTrack, { transform: [{ translateX: slideAnim }] }]}>
          {SLIDES.map((s, i) => (
            <View key={i} style={[styles.slide, { width }]}>
              <View style={styles.iconWrap}><SlideIcon type={s.icon} /></View>
              <Text style={styles.slideTitle}>{s.title}</Text>
              <Text style={styles.slideBody}>{s.body}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
        ))}
      </View>

      <Pressable style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.88 }]} onPress={next}>
        <Text style={styles.nextText}>{idx < SLIDES.length - 1 ? "Suivant" : "C'est parti !"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  skipBtn: { alignSelf: "flex-end", paddingHorizontal: 22, paddingVertical: 8 },
  skipText: { fontSize: 14, fontFamily: "Manrope_600SemiBold", color: COLORS.textMuted },

  slidesViewport: { flex: 1, overflow: "hidden" },
  slidesTrack: { flexDirection: "row" },
  slide: { paddingHorizontal: 36, alignItems: "center", justifyContent: "center", gap: 20 },
  iconWrap: {
    width: 104, height: 104, borderRadius: 32,
    backgroundColor: COLORS.greenBg,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(31,170,89,0.2)",
  },
  slideTitle: { fontSize: 24, fontFamily: "Manrope_800ExtraBold", color: COLORS.text, textAlign: "center", lineHeight: 31 },
  slideBody: { fontSize: 15.5, fontFamily: "Manrope_400Regular", color: COLORS.textMuted, textAlign: "center", lineHeight: 23 },

  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 22 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.green, width: 22, borderRadius: 4 },

  nextBtn: {
    marginHorizontal: 22,
    backgroundColor: COLORS.green,
    borderRadius: 16,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  nextText: { color: "#fff", fontFamily: "Manrope_800ExtraBold", fontSize: 16.5 },
});
