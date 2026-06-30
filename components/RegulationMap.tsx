import * as Linking from "expo-linking";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { PinIcon } from "./icons";
import { COLORS } from "./theme";
import type { LatLng } from "../data/zones";

type Props = {
  position: LatLng;
  residentPolygon: LatLng[];
  regulationPolygons: LatLng[][];
  inside: boolean;
};

let MapView: any = null;
let Marker: any = null;
let Polygon: any = null;
if (Platform.OS !== "web") {
  const maps = require("react-native-maps");
  MapView = maps.default;
  Marker = maps.Marker;
  Polygon = maps.Polygon;
}

function OpenInMapsCard({ position }: { position: LatLng }) {
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

export default function RegulationMap({ position, residentPolygon, regulationPolygons, inside }: Props) {
  if (Platform.OS === "web" || !MapView) {
    return <OpenInMapsCard position={position} />;
  }

  return (
    <View style={styles.wrap}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: position.latitude,
          longitude: position.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        pointerEvents="none"
      >
        <Marker coordinate={position} />
        <Polygon
          coordinates={residentPolygon}
          strokeColor={inside ? "#0B6E38" : "#7E161B"}
          fillColor={inside ? "rgba(63,203,122,0.18)" : "rgba(240,86,92,0.14)"}
          strokeWidth={2}
        />
        {regulationPolygons.map((ring, i) => (
          <Polygon
            key={i}
            coordinates={ring}
            strokeColor="rgba(30,30,30,0.5)"
            fillColor="rgba(30,30,30,0.06)"
            strokeWidth={1}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 340, height: 180, borderRadius: 18, overflow: "hidden" },
  map: { flex: 1 },
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
