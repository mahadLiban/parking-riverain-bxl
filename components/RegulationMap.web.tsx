import * as Linking from "expo-linking";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PinIcon } from "./icons";
import { COLORS } from "./theme";
import type { LatLng } from "../data/zones";

type Props = {
  position: LatLng;
  residentPolygon: LatLng[];
  regulationPolygons: LatLng[][];
  inside: boolean;
};

export default function RegulationMap({ position }: Props) {
  const openMaps = () => {
    const url = `https://maps.apple.com/?ll=${position.latitude},${position.longitude}&q=Ma+position`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Pressable style={[styles.wrap, styles.linkCard]} onPress={openMaps}>
      <PinIcon size={28} color={COLORS.green} />
      <Text style={styles.linkCardText}>Ouvrir dans Maps</Text>
      <Text style={styles.linkCardSub}>Voir ta position exacte sur la carte</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 340, height: 180, borderRadius: 18, overflow: "hidden" },
  linkCard: {
    backgroundColor: COLORS.greenBg,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(31,170,89,0.25)",
  },
  linkCardText: { fontSize: 15, fontFamily: "Manrope_800ExtraBold", color: COLORS.greenDark, marginTop: 4 },
  linkCardSub: { fontSize: 12.5, fontFamily: "Manrope_600SemiBold", color: COLORS.greenDark, opacity: 0.7 },
});
