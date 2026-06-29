import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { RESIDENT_ZONES, ResidentZone } from "../data/zones";
import { setSelectedZoneId } from "../storage/selectedZone";

type Props = {
  onZoneSelected: (zoneId: string) => void;
};

type Section = { title: string; data: ResidentZone[] };

export default function ZonePickerScreen({ onZoneSelected }: Props) {
  const [query, setQuery] = useState("");

  const sections = useMemo<Section[]>(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? RESIDENT_ZONES.filter(
          (z) => z.commune.toLowerCase().includes(q) || z.name.toLowerCase().includes(q)
        )
      : RESIDENT_ZONES;

    const byCommune = new Map<string, ResidentZone[]>();
    for (const zone of filtered) {
      const list = byCommune.get(zone.commune) ?? [];
      list.push(zone);
      byCommune.set(zone.commune, list);
    }
    return Array.from(byCommune.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([title, data]) => ({ title, data }));
  }, [query]);

  const handleSelect = async (zoneId: string) => {
    await setSelectedZoneId(zoneId);
    onZoneSelected(zoneId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <Image source={require("../assets/icon.png")} style={styles.logo} />
        <View>
          <Text style={styles.title}>Riverain BXL</Text>
          <Text style={styles.subtitle}>Choisis la zone de ta carte riverain</Text>
        </View>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Rechercher une commune ou une zone..."
        placeholderTextColor="#9b9ba1"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <SectionList
        sections={sections}
        keyExtractor={(z) => z.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => handleSelect(item.id)}
          >
            <View style={styles.cardDot} />
            <Text style={styles.cardZone}>{item.name}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Aucune zone ne correspond à ta recherche.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 64, paddingHorizontal: 20 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  logo: { width: 52, height: 52, borderRadius: 14 },
  title: { fontSize: 22, fontWeight: "800", color: "#1a1a1a" },
  subtitle: { fontSize: 13, color: "#777", marginTop: 2 },
  search: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  list: { paddingBottom: 40, gap: 8 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1FAA59",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 6,
  },
  card: {
    backgroundColor: "#F7F7F9",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardPressed: { backgroundColor: "#ECECF0" },
  cardDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#1FAA59" },
  cardZone: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  empty: { textAlign: "center", color: "#888", marginTop: 40, fontSize: 14 },
});
