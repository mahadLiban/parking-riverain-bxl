import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackIcon } from "../components/icons";
import { COLORS } from "../components/theme";
import RegulationMap from "../components/RegulationMap";
import type { RegulationMatch } from "../data/regulationZones";
import type { LatLng, ResidentZone } from "../data/zones";

type Props = {
  inside: boolean;
  regulation: RegulationMatch | null;
  zone: ResidentZone;
  position: LatLng;
  onBack: () => void;
};

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
    return { title: "Réglementation inconnue ici", body: "Pas de données pour cette rue. Vérifie la signalisation sur place." };
  }
  const z = match.zone;
  const label = REGULATION_LABELS[z.type] ?? z.typeLabel ?? "Inconnu";
  const prefix = match.exact ? "" : `Rue proche (~${Math.round(match.distanceMeters)} m) · `;

  if (z.type === "gratuit") return { title: `${prefix}${label}`, body: "Stationnement gratuit, sans carte riverain." };
  if (z.type === "reserve-riverain") return { title: `${prefix}${label}`, body: "Réservé aux détenteurs d'une carte riverain de ce secteur." };
  if (z.type === "poids-lourds") return { title: `${prefix}${label}`, body: "Zone poids-lourds. Pour une voiture normale, la règle habituelle de la rue s'applique." };
  if (z.type === "evenement") return { title: `${prefix}${label}`, body: "Réglementation événementielle ponctuelle. Vérifie la signalisation temporaire sur place." };

  const parts: string[] = [];
  if (z.starthour && z.endhour) parts.push(`Payant ${z.starthour}–${z.endhour}`);
  else parts.push("Horaires variables");
  if (z.type === "bleue") parts.push("disque requis");
  if (z.maxtime) parts.push(`max ${z.maxtime} min`);
  if (z.freetime && z.freetime !== "0") parts.push(`${z.freetime} min offertes`);
  if (z.charge60) parts.push(`${z.charge60} €/1h`);
  if (z.charge120) parts.push(`${z.charge120} €/2h`);

  return { title: `${prefix}${label}`, body: parts.join(" · ") + "." };
}

export default function DetailsScreen({ inside, regulation, zone, position, onBack }: Props) {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  const insets = useSafeAreaInsets();

  if (!fontsLoaded) return <View style={styles.root} />;

  const reg = regulationSummary(regulation);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}><BackIcon size={18} color={COLORS.text} /></Pressable>
        <Text style={styles.title}>Le détail ici</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, inside ? styles.cardGreen : styles.cardRed]}>
          <Text style={[styles.cardTitle, { color: inside ? COLORS.greenDark : COLORS.redDark }]}>
            {inside ? "Gratuit avec ta carte" : "Hors zone riverain"}
          </Text>
          <Text style={styles.cardBody}>
            {inside
              ? "Tu es dans ta zone riverain. Stationnement gratuit ici tant que ta carte est valide."
              : "Tu es hors de ta zone riverain. Le tarif public s'applique sur cette rue."}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>SANS CARTE RIVERAIN</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{reg.title}</Text>
          <Text style={styles.cardBody}>{reg.body}</Text>
        </View>

        <View style={styles.mapCard}>
          <RegulationMap
            position={position}
            residentPolygon={zone.polygon}
            regulationPolygons={regulation?.zone.polygons ?? []}
            inside={inside}
          />
        </View>
      </ScrollView>
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
  title: { fontSize: 21, fontFamily: "Manrope_800ExtraBold", color: COLORS.text },

  scroll: { gap: 14 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  cardGreen: { backgroundColor: COLORS.greenBg, borderColor: "rgba(31,170,89,0.25)" },
  cardRed: { backgroundColor: COLORS.redBg, borderColor: "rgba(193,59,59,0.25)" },
  cardTitle: { fontSize: 16.5, fontFamily: "Manrope_800ExtraBold", color: COLORS.text, marginBottom: 6 },
  cardBody: { fontSize: 14, fontFamily: "Manrope_400Regular", color: COLORS.textMuted, lineHeight: 20 },

  sectionLabel: { fontSize: 11, fontFamily: "Manrope_700Bold", color: COLORS.textMuted, letterSpacing: 0.7, marginTop: 4 },

  mapCard: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border },
});
