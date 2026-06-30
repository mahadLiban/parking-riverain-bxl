import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackIcon, CheckIcon, CloseIcon, MenuIcon, SearchIcon } from "../components/icons";
import { COLORS } from "../components/theme";
import { RESIDENT_ZONES, ResidentZone } from "../data/zones";
import { getHiddenCommunes, setHiddenCommunes } from "../storage/hiddenCommunes";
import { setSelectedZoneId } from "../storage/selectedZone";

type HeaderOverride = {
  title: string;
  subtitle: string;
  onBack: () => void;
  step?: { current: number; total: number };
};
type Props = { onZoneSelected: (zoneId: string) => void; headerOverride?: HeaderOverride; currentZoneId?: string };

export default function ZonePickerScreen({ onZoneSelected, headerOverride, currentZoneId }: Props) {
  const [fontsLoaded] = useFonts({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Set<string> | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(currentZoneId);

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
    if (next.has(commune)) next.delete(commune); else next.add(commune);
    setHidden(next);
    setHiddenCommunes(Array.from(next));
  };

  const showAll = () => { setHidden(new Set()); setHiddenCommunes([]); };
  const hideAll = () => { const all = new Set(allCommunes); setHidden(all); setHiddenCommunes(Array.from(all)); };

  const confirm = async () => {
    if (!selectedId) return;
    if (!headerOverride) await setSelectedZoneId(selectedId);
    onZoneSelected(selectedId);
  };

  const q = query.trim().toLowerCase();
  const visibleCommunes = allCommunes.filter((commune) => {
    if (hidden?.has(commune)) return false;
    if (!q) return true;
    const zones = zonesByCommune.get(commune) ?? [];
    return commune.toLowerCase().includes(q) || zones.some((z) => z.name.toLowerCase().includes(q));
  });

  const hiddenCount = hidden?.size ?? 0;
  const selectedZone = selectedId ? RESIDENT_ZONES.find((z) => z.id === selectedId) : null;

  if (!fontsLoaded) return <View style={styles.container} />;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom }]}>
      {/* Header */}
      {headerOverride?.step ? (
        <View style={styles.stepHeader}>
          <View style={styles.headerRow}>
            <Pressable style={styles.iconBtn} onPress={headerOverride.onBack} hitSlop={10}>
              <BackIcon size={18} color={COLORS.text} />
            </Pressable>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.stepLabel}>ÉTAPE {headerOverride.step.current} SUR {headerOverride.step.total}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${(headerOverride.step.current / headerOverride.step.total) * 100}%` as any }]} />
              </View>
            </View>
          </View>
          <Text style={styles.title}>{headerOverride.title}</Text>
        </View>
      ) : (
        <View style={styles.headerRow}>
          {headerOverride ? (
            <Pressable style={styles.iconBtn} onPress={headerOverride.onBack} hitSlop={10}>
              <BackIcon size={18} color={COLORS.text} />
            </Pressable>
          ) : (
            <Pressable style={styles.iconBtn} onPress={() => setMenuVisible(true)} hitSlop={10}>
              <MenuIcon size={18} color={COLORS.text} />
              {hiddenCount > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{hiddenCount}</Text></View>
              )}
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{headerOverride?.title ?? "Choisis ta zone"}</Text>
            {!!headerOverride?.subtitle && <Text style={styles.subtitle}>{headerOverride.subtitle}</Text>}
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchIcon}><SearchIcon size={16} color={COLORS.textMuted} /></View>
        <TextInput
          style={styles.search}
          placeholder="Rechercher une commune…"
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* List */}
      {hidden === null ? null : visibleCommunes.length === 0 ? (
        <View style={styles.emptyWrap}>
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
            const zones = zonesByCommune.get(commune) ?? [];
            return (
              <View key={commune}>
                <Text style={styles.communeName}>{commune}</Text>
                {zones.map((item) => {
                  const isSelected = item.id === selectedId;
                  return (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [styles.zoneRow, isSelected && styles.zoneRowSelected, pressed && { opacity: 0.85 }]}
                      onPress={() => setSelectedId(item.id)}
                    >
                      <View style={[styles.zoneDot, isSelected && { backgroundColor: COLORS.green }]} />
                      <Text style={[styles.zoneName, isSelected && { color: COLORS.greenDark }]}>{item.name}</Text>
                      {isSelected ? <CheckIcon size={16} color={COLORS.green} /> : <View style={{ width: 16 }} />}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      {/* Confirm button */}
      {selectedZone && (
        <View style={[styles.confirmWrap, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.88 }]} onPress={confirm}>
            <Text style={styles.confirmBtnText}>C'est ma zone</Text>
          </Pressable>
        </View>
      )}

      {/* Hamburger drawer (only when no step / no headerOverride context needing it) */}
      {!headerOverride?.step && (
        <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Communes</Text>
              <Pressable style={styles.sheetCloseBtn} onPress={() => setMenuVisible(false)} hitSlop={10}>
                <CloseIcon size={13} color={COLORS.text} />
              </Pressable>
            </View>
            <Text style={styles.sheetHint}>Masque les communes inutiles pour alléger la liste.</Text>
            <View style={styles.sheetActions}>
              <Pressable style={styles.sheetActionBtn} onPress={showAll}>
                <Text style={styles.sheetActionText}>Tout afficher</Text>
              </Pressable>
              <Pressable style={styles.sheetActionBtn} onPress={hideAll}>
                <Text style={styles.sheetActionText}>Tout masquer</Text>
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {allCommunes.map((commune) => {
                const isVisible = !hidden?.has(commune);
                return (
                  <Pressable key={commune} style={styles.sheetRow} onPress={() => toggleCommune(commune)}>
                    <Text style={[styles.sheetRowText, !isVisible && { color: COLORS.textMuted }]}>{commune}</Text>
                    <Switch value={isVisible} onValueChange={() => toggleCommune(commune)} trackColor={{ true: COLORS.green, false: COLORS.border }} thumbColor="#fff" />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 22 },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 8 },
  stepHeader: { marginBottom: 16, gap: 14 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute", top: -5, right: -5, backgroundColor: COLORS.red, borderRadius: 9,
    minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
    borderWidth: 2, borderColor: COLORS.bg,
  },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "Manrope_800ExtraBold" },
  stepLabel: { fontSize: 11, fontFamily: "Manrope_700Bold", color: COLORS.green, letterSpacing: 0.6 },
  progressTrack: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: "hidden" },
  progressBar: { height: 4, backgroundColor: COLORS.green, borderRadius: 2 },
  title: { fontSize: 22, fontFamily: "Manrope_800ExtraBold", color: COLORS.text },
  subtitle: { fontSize: 12.5, color: COLORS.green, marginTop: 2, fontFamily: "Manrope_700Bold" },

  searchWrap: { position: "relative", marginBottom: 14 },
  searchIcon: { position: "absolute", left: 14, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 },
  search: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingLeft: 40,
    paddingRight: 14,
    minHeight: 50,
    fontSize: 15,
    fontFamily: "Manrope_400Regular",
    color: COLORS.text,
  },

  list: { paddingBottom: 24, gap: 2 },
  communeName: { fontSize: 11.5, fontFamily: "Manrope_700Bold", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.7, marginTop: 18, marginBottom: 8 },
  zoneRow: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    minHeight: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  zoneRowSelected: { backgroundColor: COLORS.greenBg, borderColor: COLORS.green },
  zoneDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  zoneName: { fontSize: 15.5, fontFamily: "Manrope_600SemiBold", color: COLORS.text, flex: 1 },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, gap: 12, marginTop: -60 },
  empty: { textAlign: "center", color: COLORS.textMuted, fontSize: 14, fontFamily: "Manrope_600SemiBold" },
  emptyBtn: { backgroundColor: COLORS.green, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 999, minHeight: 48 },
  emptyBtnText: { color: "#fff", fontFamily: "Manrope_700Bold", fontSize: 14 },

  confirmWrap: {
    position: "absolute", left: 22, right: 22, bottom: 0,
    backgroundColor: COLORS.bg, paddingTop: 14,
  },
  confirmBtn: { backgroundColor: COLORS.green, borderRadius: 16, minHeight: 58, alignItems: "center", justifyContent: "center" },
  confirmBtnText: { color: "#fff", fontFamily: "Manrope_800ExtraBold", fontSize: 16.5 },

  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 22, paddingTop: 18,
  },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sheetTitle: { fontSize: 18, fontFamily: "Manrope_800ExtraBold", color: COLORS.text },
  sheetCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  sheetHint: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 8, marginBottom: 14, lineHeight: 17, fontFamily: "Manrope_400Regular" },
  sheetActions: { flexDirection: "row", gap: 10, marginBottom: 8 },
  sheetActionBtn: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  sheetActionText: { fontSize: 13, fontFamily: "Manrope_700Bold", color: COLORS.green },
  sheetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sheetRowText: { fontSize: 14.5, color: COLORS.text, fontFamily: "Manrope_600SemiBold" },
});
