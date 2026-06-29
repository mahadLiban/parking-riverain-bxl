import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
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

export default function RegulationMap({ position, residentPolygon, regulationPolygons, inside }: Props) {
  if (Platform.OS === "web" || !MapView) {
    return (
      <View style={styles.webFallback}>
        <Text style={styles.webFallbackText}>Carte disponible dans l'app mobile (Expo Go).</Text>
      </View>
    );
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
  webFallback: {
    width: "100%",
    maxWidth: 340,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
  },
  webFallbackText: { fontSize: 12.5, fontFamily: "Manrope_600SemiBold", color: "#777" },
});
