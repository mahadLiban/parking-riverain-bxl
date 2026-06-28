import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { RESIDENT_ZONES } from "../data/zones";
import { setSelectedZoneId } from "../storage/selectedZone";

type Props = {
  onZoneSelected: (zoneId: string) => void;
};

export default function ZonePickerScreen({ onZoneSelected }: Props) {
  const handleSelect = async (zoneId: string) => {
    await setSelectedZoneId(zoneId);
    onZoneSelected(zoneId);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quelle est ta zone riverain ?</Text>
      <Text style={styles.subtitle}>
        Choisis la zone indiquée sur ta carte de stationnement riverain.
      </Text>
      <FlatList
        data={RESIDENT_ZONES}
        keyExtractor={(z) => z.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => handleSelect(item.id)}>
            <Text style={styles.cardCommune}>{item.commune}</Text>
            <Text style={styles.cardZone}>{item.name}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 80, paddingHorizontal: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "#555", marginBottom: 24 },
  list: { gap: 12 },
  card: {
    backgroundColor: "#F2F2F7",
    borderRadius: 14,
    padding: 18,
  },
  cardCommune: { fontSize: 13, color: "#777", marginBottom: 4 },
  cardZone: { fontSize: 19, fontWeight: "600" },
});
