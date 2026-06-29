import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { RESIDENT_ZONES, ResidentZone } from "../data/zones";
import { getHiddenCommunes, setHiddenCommunes } from "../storage/hiddenCommunes";
import { setSelectedZoneId } from "../storage/selectedZone";

type Props = {
  onZoneSelected: (zoneId: string) => void;
};

export default function ZonePickerScreen({ onZoneSelected }: Props) {
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Set<string> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const zonesByCommune = useMemo(() => {
    const map = new Map<string, ResidentZone[]>();
    for (const zone of RESIDENT_ZONES) {
      const list = map.get(zone.commune) ?? [];
      list.push(zone);
      map.set(zone.commune, list);
    }
    return map;
  }, []);

  const allCommunes = useMemo(
    () => Array.from(zonesByCommune.keys()).sort((a, b) => a.localeCompare(b)),
    [zonesByCommune]
  );

  useEffect(() => {
    getHiddenCommunes().then((list) => setHidden(new Set(list)));
  }, []);

  const toggleCommune = (commune: string) => {
    if (!hidden) return;
    const next = new Set(hidden);
    if (next.has(commune)) {
      next.delete(commune);
    } else {
      next.add(commune);
    }
    setHidden(next);
    setHiddenCommunes(Array.from(next));
  };

  const showAll = () => {
    setHidden(new Set());
    setHiddenCommunes([]);
  };

  const hideAll = () => {
    const all = new Set(allCommunes);
    setHidden(all);
    setHiddenCommunes(Array.from(all));
  };

  const handleSelect = async (zoneId: string) => {
    await setSelectedZoneId(zoneId);
    onZoneSelected(zoneId);
  };

  const q = query.trim().toLowerCase();
  const visibleCommunes = allCommunes.filter((commune) => {
    if (hidden?.has(commune)) return false;
    if (!q) return true;
    const zones = zonesByCommune.get(commune) ?? [];
    return commune.toLowerCase().includes(q) || zones.some((z) => z.name.toLowerCase().includes(q));
  });

  const hiddenCount = hidden?.size ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <Pressable style={styles.hamburger} onPress={() => setMenuOpen(true)} hitSlop={10}>
          <Text style={styles.hamburgerIcon}>☰</Text>
          {hiddenCount > 0 && (
            <View style={styles.hamburgerBadge}>
              <Text style={styles.hamburgerBadgeText}>{hiddenCount}</Text>
            </View>
          )}
        </Pressable>
        <Image source={require("../assets/icon.png")} style={styles.logo} />
        <View style={{ flex: 1 }}>
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

      {hidden === null ? null : visibleCommunes.length === 0 ? (
        <Text style={styles.empty}>
          {hiddenCount > 0
            ? "Toutes les communes sont masquées — ouvre le menu ☰ pour en réafficher."
            : "Aucune zone ne correspond à ta recherche."}
        </Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {visibleCommunes.map((commune) => (
            <View key={commune}>
              <Text style={styles.sectionHeader}>{commune}</Text>
              {(zonesByCommune.get(commune) ?? []).map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                  onPress={() => handleSelect(item.id)}
                >
                  <View style={styles.cardDot} />
                  <Text style={styles.cardZone}>{item.name}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={menuOpen} animationType="slide" transparent onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMenuOpen(false)} />
        <View style={styles.menuPanel}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Communes affichées</Text>
            <Pressable onPress={() => setMenuOpen(false)} hitSlop={10}>
              <Text style={styles.menuClose}>Fermer</Text>
            </Pressable>
          </View>
          <Text style={styles.menuHint}>
            Désactive les communes que tu n'utilises pas pour alléger la liste.
          </Text>
          <View style={styles.menuActionsRow}>
            <Pressable style={styles.menuActionBtn} onPress={showAll}>
              <Text style={styles.menuActionText}>Tout afficher</Text>
            </Pressable>
            <Pressable style={styles.menuActionBtn} onPress={hideAll}>
              <Text style={styles.menuActionText}>Tout masquer</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.menuList}>
            {allCommunes.map((commune) => {
              const isVisible = !hidden?.has(commune);
              return (
                <View key={commune} style={styles.menuRow}>
                  <Text style={styles.menuRowText}>{commune}</Text>
                  <Switch
                    value={isVisible}
                    onValueChange={() => toggleCommune(commune)}
                    trackColor={{ true: "#1FAA59", false: "#ccc" }}
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 64, paddingHorizontal: 20 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  hamburger: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  hamburgerIcon: { fontSize: 20, color: "#1a1a1a" },
  hamburgerBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#D8333A",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  hamburgerBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  logo: { width: 44, height: 44, borderRadius: 12 },
  title: { fontSize: 20, fontWeight: "800", color: "#1a1a1a" },
  subtitle: { fontSize: 12, color: "#777", marginTop: 1 },
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
  empty: { textAlign: "center", color: "#888", marginTop: 40, fontSize: 14, paddingHorizontal: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  menuPanel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "82%",
    maxWidth: 340,
    backgroundColor: "#fff",
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  menuHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  menuTitle: { fontSize: 18, fontWeight: "800", color: "#1a1a1a" },
  menuClose: { fontSize: 14, color: "#1FAA59", fontWeight: "600" },
  menuHint: { fontSize: 12, color: "#888", marginTop: 8, marginBottom: 12, lineHeight: 17 },
  menuActionsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  menuActionBtn: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  menuActionText: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  menuList: { flex: 1 },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuRowText: { fontSize: 15, color: "#1a1a1a", fontWeight: "500", flex: 1, marginRight: 10 },
});
