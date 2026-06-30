import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { BlurView } from "expo-blur";
import { useFonts } from "expo-font";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackIcon, CheckIcon, ChevronIcon, CloseIcon, MenuIcon, SearchIcon } from "../components/icons";
import { RESIDENT_ZONES, ResidentZone } from "../data/zones";
import { getCollapsedCommunes, setCollapsedCommunes } from "../storage/collapsedCommunes";
import { getHiddenCommunes, setHiddenCommunes } from "../storage/hiddenCommunes";
import { setSelectedZoneId } from "../storage/selectedZone";

type HeaderOverride = { title: string; subtitle: string; onBack: () => void };
type Props = { onZoneSelected: (zoneId: string) => void; headerOverride?: HeaderOverride; currentZoneId?: string };

const DRAWER_WIDTH = 300;
const GREEN = "#22D17E";

function DrawerPanel({ children, style }: { children: React.ReactNode; style?: object }) {
  if (Platform.OS === "web") return <View style={[styles.drawerWeb, style]}>{children}</View>;
  return <BlurView intensity={30} tint="dark" style={[styles.drawer, style]}>{children}</BlurView>;
}

export default function ZonePickerScreen({ onZoneSelected, headerOverride, currentZoneId }: Props) {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Set<string> | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
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
    getCollapsedCommunes().then((list) => setCollapsed(new Set(list)));
  }, []);

  const toggleCollapsed = (commune: string) => {
    const next = new Set(collapsed);
    if (next.has(commune)) next.delete(commune); else next.add(commune);
    setCollapsed(next);
    setCollapsedCommunes(Array.from(next));
  };

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
    if (next.has(commune)) next.delete(commune); else next.add(commune);
    setHidden(next);
    setHiddenCommunes(Array.from(next));
  };

  const showAll = () => { setHidden(new Set()); setHiddenCommunes([]); };
  const hideAll = () => { const all = new Set(allCommunes); setHidden(all); setHiddenCommunes(Array.from(all)); };

  const handleSelect = async (zoneId: string) => {
    if (!headerOverride) await setSelectedZoneId(zoneId);
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
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 24) + 16, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.brandRow}>
        {headerOverride ? (
          <Pressable style={styles.iconBtn} onPress={headerOverride.onBack} hitSlop={10}>
            <BackIcon size={18} color="rgba(255,255,255,0.8)" />
          </Pressable>
        ) : (
          <Pressable style={styles.iconBtn} onPress={openMenu} hitSlop={10}>
            <MenuIcon size={18} color="rgba(255,255,255,0.8)" />
            {hiddenCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{hiddenCount}</Text>
              </View>
            )}
          </Pressable>
        )}
        {!headerOverride && <Image source={require("../assets/icon.png")} style={styles.logo} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{headerOverride?.title ?? "Riverain BXL"}</Text>
          <Text style={styles.subtitle}>
            {headerOverride?.subtitle ?? `${totalZonesVisible} zone${totalZonesVisible !== 1 ? "s" : ""} disponible${totalZonesVisible !== 1 ? "s" : ""}`}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchIcon}><SearchIcon size={15} color="rgba(255,255,255,0.35)" /></View>
        <TextInput
          style={styles.search}
          placeholder="Rechercher une commune ou une zone…"
          placeholderTextColor="rgba(255,255,255,0.28)"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* List */}
      {hidden === null ? null : visibleCommunes.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>{hiddenCount > 0 ? "🙈" : "🔎"}</Text>
          <Text style={styles.empty}>
            {hiddenCount > 0 ? "Toutes les communes sont masquées." : "Aucune zone ne correspond à ta recherche."}
          </Text>
          {hiddenCount > 0 && (
            <Pressable style={styles.emptyBtn} onPress={showAll}>
              <Text style={styles.emptyBtnText}>Tout réafficher</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {visibleCommunes.map((commune) => {
            const isOpen = !collapsed.has(commune);
            const zones = zonesByCommune.get(commune) ?? [];
            return (
              <View key={commune}>
                <Pressable
                  style={({ pressed }) => [styles.communeRow, pressed && { opacity: 0.6 }]}
                  onPress={() => toggleCollapsed(commune)}
                >
                  <Text style={styles.communeName}>{commune}</Text>
                  <Animated.View style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }}>
                    <ChevronIcon size={13} color={GREEN} />
                  </Animated.View>
                </Pressable>
                {isOpen && zones.map((item) => {
                  const isCurrent = item.id === currentZoneId;
                  return (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [styles.zoneRow, isCurrent && styles.zoneRowActive, pressed && styles.zoneRowPressed]}
                      onPress={() => handleSelect(item.id)}
                    >
                      <View style={[styles.zoneDot, isCurrent && { backgroundColor: GREEN }]} />
                      <Text style={[styles.zoneName, isCurrent && { color: GREEN }]}>{item.name}</Text>
                      {isCurrent ? <CheckIcon size={15} /> : <ChevronIcon size={14} color="rgba(255,255,255,0.3)" />}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Drawer */}
      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
        <Animated.View style={[styles.modalOverlay, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
        </Animated.View>
        <Animated.View style={[{ position: "absolute", left: 0, top: 0, bottom: 0, width: DRAWER_WIDTH }, { transform: [{ translateX: drawerX }] }]}>
          <DrawerPanel>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Communes</Text>
              <Pressable style={styles.drawerCloseBtn} onPress={closeMenu} hitSlop={10}>
                <CloseIcon size={12} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>
            <Text style={styles.drawerHint}>Masque les communes inutiles pour alléger la liste.</Text>
            <View style={styles.drawerActions}>
              <Pressable style={styles.drawerActionBtn} onPress={showAll}>
                <Text style={styles.drawerActionText}>Tout afficher</Text>
              </Pressable>
              <Pressable style={styles.drawerActionBtn} onPress={hideAll}>
                <Text style={styles.drawerActionText}>Tout masquer</Text>
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {allCommunes.map((commune) => {
                const isVisible = !hidden?.has(commune);
                const count = zonesByCommune.get(commune)?.length ?? 0;
                return (
                  <Pressable key={commune} style={styles.drawerRow} onPress={() => toggleCommune(commune)}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.drawerRowName, !isVisible && { color: "rgba(255,255,255,0.25)" }]}>{commune}</Text>
                      <Text style={styles.drawerRowCount}>{count} zone{count !== 1 ? "s" : ""}</Text>
                    </View>
                    <Switch
                      value={isVisible}
                      onValueChange={() => toggleCommune(commune)}
                      trackColor={{ true: GREEN, false: "rgba(255,255,255,0.1)" }}
                      thumbColor="#fff"
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          </DrawerPanel>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#08080D", paddingHorizontal: 20 },

  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF3B5C",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: "#08080D",
  },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "Manrope_800ExtraBold" },
  logo: { width: 42, height: 42, borderRadius: 13 },
  title: { fontSize: 20, fontFamily: "Manrope_800ExtraBold", color: "#fff" },
  subtitle: { fontSize: 12, color: GREEN, marginTop: 2, fontFamily: "Manrope_700Bold" },

  searchWrap: { position: "relative", marginBottom: 16 },
  searchIcon: { position: "absolute", left: 14, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 },
  search: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingLeft: 40,
    paddingRight: 14,
    paddingVertical: 13,
    fontSize: 14.5,
    fontFamily: "Manrope_400Regular",
    color: "#fff",
  },

  list: { paddingBottom: 48, gap: 4 },
  communeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 6,
    paddingVertical: 2,
  },
  communeName: { fontSize: 12, fontFamily: "Manrope_700Bold", color: GREEN, textTransform: "uppercase", letterSpacing: 0.8 },
  zoneRow: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  zoneRowPressed: { backgroundColor: "rgba(255,255,255,0.09)" },
  zoneRowActive: { backgroundColor: "rgba(34,209,126,0.1)", borderColor: "rgba(34,209,126,0.35)" },
  zoneDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: GREEN },
  zoneName: { fontSize: 15, fontFamily: "Manrope_600SemiBold", color: "#fff", flex: 1 },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, gap: 10, marginTop: -60 },
  emptyEmoji: { fontSize: 40 },
  empty: { textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 14, fontFamily: "Manrope_600SemiBold" },
  emptyBtn: { marginTop: 6, backgroundColor: GREEN, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 999 },
  emptyBtnText: { color: "#08080D", fontFamily: "Manrope_700Bold", fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  drawer: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  drawerWeb: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#12121A",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.08)",
  },
  drawerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  drawerTitle: { fontSize: 19, fontFamily: "Manrope_800ExtraBold", color: "#fff" },
  drawerCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerHint: { fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 16, lineHeight: 17, fontFamily: "Manrope_400Regular" },
  drawerActions: { flexDirection: "row", gap: 10, marginBottom: 12 },
  drawerActionBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  drawerActionText: { fontSize: 13, fontFamily: "Manrope_700Bold", color: GREEN },
  drawerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  drawerRowName: { fontSize: 14.5, color: "#fff", fontFamily: "Manrope_600SemiBold" },
  drawerRowCount: { fontSize: 11.5, color: "rgba(255,255,255,0.3)", marginTop: 2, fontFamily: "Manrope_400Regular" },
});
