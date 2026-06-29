import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
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
import { ChevronIcon, CloseIcon, MenuIcon, SearchIcon } from "../components/icons";
import { RESIDENT_ZONES, ResidentZone } from "../data/zones";
import { getHiddenCommunes, setHiddenCommunes } from "../storage/hiddenCommunes";
import { setSelectedZoneId } from "../storage/selectedZone";

type Props = {
  onZoneSelected: (zoneId: string) => void;
};

const DRAWER_WIDTH = 300;

export default function ZonePickerScreen({ onZoneSelected }: Props) {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Set<string> | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const drawerX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

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

  const openMenu = () => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.timing(drawerX, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(drawerX, { toValue: -DRAWER_WIDTH, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setMenuVisible(false));
  };

  const toggleCommune = (commune: string) => {
    if (!hidden) return;
    const next = new Set(hidden);
    if (next.has(commune)) next.delete(commune);
    else next.add(commune);
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
  const totalZonesVisible = visibleCommunes.reduce((sum, c) => sum + (zonesByCommune.get(c)?.length ?? 0), 0);

  if (!fontsLoaded) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <Pressable style={styles.hamburger} onPress={openMenu} hitSlop={10}>
          <MenuIcon size={19} />
          {hiddenCount > 0 && (
            <View style={styles.hamburgerBadge}>
              <Text style={styles.hamburgerBadgeText}>{hiddenCount}</Text>
            </View>
          )}
        </Pressable>
        <Image source={require("../assets/icon.png")} style={styles.logo} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Riverain BXL</Text>
          <Text style={styles.subtitle}>
            {totalZonesVisible} zone{totalZonesVisible !== 1 ? "s" : ""} disponible{totalZonesVisible !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchIconWrap}>
          <SearchIcon size={16} />
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
      </View>

      {hidden === null ? null : visibleCommunes.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>{hiddenCount > 0 ? "🙈" : "🔎"}</Text>
          <Text style={styles.empty}>
            {hiddenCount > 0 ? "Toutes les communes sont masquées." : "Aucune zone ne correspond à ta recherche."}
          </Text>
          {hiddenCount > 0 && (
            <Pressable style={styles.emptyAction} onPress={showAll}>
              <Text style={styles.emptyActionText}>Tout réafficher</Text>
            </Pressable>
          )}
        </View>
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
                  <ChevronIcon size={15} />
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
        <Animated.View style={[styles.modalOverlay, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
        </Animated.View>
        <Animated.View style={[styles.menuPanel, { transform: [{ translateX: drawerX }] }]}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Communes</Text>
            <Pressable onPress={closeMenu} hitSlop={10} style={styles.menuCloseBtn}>
              <CloseIcon size={13} />
            </Pressable>
          </View>
          <Text style={styles.menuHint}>Désactive les communes que tu n'utilises pas pour alléger la liste.</Text>
          <View style={styles.menuActionsRow}>
            <Pressable style={styles.menuActionBtn} onPress={showAll}>
              <Text style={styles.menuActionText}>Tout afficher</Text>
            </Pressable>
            <Pressable style={styles.menuActionBtn} onPress={hideAll}>
              <Text style={styles.menuActionText}>Tout masquer</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
            {allCommunes.map((commune) => {
              const isVisible = !hidden?.has(commune);
              const count = zonesByCommune.get(commune)?.length ?? 0;
              return (
                <Pressable key={commune} style={styles.menuRow} onPress={() => toggleCommune(commune)}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.menuRowText, !isVisible && styles.menuRowTextDim]}>{commune}</Text>
                    <Text style={styles.menuRowCount}>
                      {count} zone{count !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <Switch value={isVisible} onValueChange={() => toggleCommune(commune)} trackColor={{ true: "#1FAA59", false: "#d8d8dc" }} />
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 20 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  hamburger: { width: 44, height: 44, borderRadius: 13, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" },
  hamburgerBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#D8333A",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: "#fff",
  },
  hamburgerBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Manrope_800ExtraBold" },
  logo: { width: 44, height: 44, borderRadius: 13 },
  title: { fontSize: 20, fontFamily: "Manrope_800ExtraBold", color: "#1a1a1a" },
  subtitle: { fontSize: 12, color: "#1FAA59", marginTop: 1, fontFamily: "Manrope_700Bold" },
  searchWrap: { position: "relative", marginBottom: 12 },
  searchIconWrap: { position: "absolute", left: 14, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 },
  search: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingLeft: 40,
    paddingRight: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Manrope_400Regular",
    color: "#1a1a1a",
  },
  list: { paddingBottom: 40, gap: 8 },
  sectionHeader: {
    fontSize: 13,
    fontFamily: "Manrope_700Bold",
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
  cardZone: { fontSize: 15.5, fontFamily: "Manrope_600SemiBold", color: "#1a1a1a", flex: 1 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, gap: 10, marginTop: -60 },
  emptyEmoji: { fontSize: 40 },
  empty: { textAlign: "center", color: "#888", fontSize: 14, fontFamily: "Manrope_600SemiBold" },
  emptyAction: { marginTop: 6, backgroundColor: "#1FAA59", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999 },
  emptyActionText: { color: "#fff", fontFamily: "Manrope_700Bold", fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  menuPanel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
  },
  menuHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  menuTitle: { fontSize: 19, fontFamily: "Manrope_800ExtraBold", color: "#1a1a1a" },
  menuCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#F2F2F7", alignItems: "center", justifyContent: "center" },
  menuHint: { fontSize: 12, color: "#888", marginTop: 8, marginBottom: 14, lineHeight: 17, fontFamily: "Manrope_400Regular" },
  menuActionsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  menuActionBtn: { flex: 1, backgroundColor: "#F2F2F7", borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  menuActionText: { fontSize: 13, fontFamily: "Manrope_700Bold", color: "#1FAA59" },
  menuList: { flex: 1 },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuRowText: { fontSize: 15, color: "#1a1a1a", fontFamily: "Manrope_600SemiBold" },
  menuRowTextDim: { color: "#b5b5ba" },
  menuRowCount: { fontSize: 12, color: "#9b9ba1", marginTop: 2, fontFamily: "Manrope_400Regular" },
});
