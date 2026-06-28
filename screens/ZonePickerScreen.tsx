import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { RESIDENT_ZONES } from "../data/zones";
import { setSelectedZoneId } from "../storage/selectedZone";

type Props = {
  onZoneSelected: (zoneId: string) => void;
};

export default function ZonePickerScreen({ onZoneSelected }: Props) {
  const [query, setQuery] = useState("");

  const filteredZones = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RESIDENT_ZONES;
    return RESIDENT_ZONES.filter(
      (z) => z.commune.toLowerCase().includes(q) || z.name.toLowerCase().includes(q)
    );
  }, [query]);

  const handleSelect = async (zoneId: string) => {
    await setSelectedZoneId(zoneId);
    onZoneSelected(zoneId);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quelle est ta zone riverain ?</Text>
      <Text style={styles.subtitle}>
        Choisis ta commune ou ta zone, indiquée sur ta carte de stationnement riverain.
      </Text>
      <TextInput
        style={styles.search}
        placeholder="Rechercher une commune ou une zone..."
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />
      <FlatList
        data={filteredZones}
        keyExtractor={(z) => z.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
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
  subtitle: { fontSize: 15, color: "#555", marginBottom: 16 },
  search: {
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  list: { gap: 12 },
  card: {
    backgroundColor: "#F2F2F7",
    borderRadius: 14,
    padding: 18,
  },
  cardCommune: { fontSize: 13, color: "#777", marginBottom: 4 },
  cardZone: { fontSize: 19, fontWeight: "600" },
});
