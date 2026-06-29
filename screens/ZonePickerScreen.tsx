import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { RESIDENT_ZONES, ResidentZone } from "../data/zones";
import { getCommuneOrder, setCommuneOrder } from "../storage/communeOrder";
import { setSelectedZoneId } from "../storage/selectedZone";

type Props = {
  onZoneSelected: (zoneId: string) => void;
};

const GAP = 8;

export default function ZonePickerScreen({ onZoneSelected }: Props) {
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<string[] | null>(null);

  const zonesByCommune = useMemo(() => {
    const map = new Map<string, ResidentZone[]>();
    for (const zone of RESIDENT_ZONES) {
      const list = map.get(zone.commune) ?? [];
      list.push(zone);
      map.set(zone.commune, list);
    }
    return map;
  }, []);

  useEffect(() => {
    getCommuneOrder().then((saved) => {
      const allCommunes = Array.from(zonesByCommune.keys()).sort((a, b) =>
        a.localeCompare(b)
      );
      if (saved) {
        const known = saved.filter((c) => allCommunes.includes(c));
        const missing = allCommunes.filter((c) => !known.includes(c));
        setOrder([...known, ...missing]);
      } else {
        setOrder(allCommunes);
      }
    });
  }, [zonesByCommune]);

  const q = query.trim().toLowerCase();
  const matchesQuery = (commune: string, zones: ResidentZone[]) => {
    if (!q) return true;
    if (commune.toLowerCase().includes(q)) return true;
    return zones.some((z) => z.name.toLowerCase().includes(q));
  };

  const visibleOrder = (order ?? []).filter((commune) => {
    const zones = zonesByCommune.get(commune) ?? [];
    return matchesQuery(commune, zones);
  });

  const handleSelect = async (zoneId: string) => {
    await setSelectedZoneId(zoneId);
    onZoneSelected(zoneId);
  };

  const handleReorder = (newOrder: string[]) => {
    setOrder(newOrder);
    setCommuneOrder(newOrder);
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

      {!q && (
        <Text style={styles.dragHint}>↕ Maintiens un titre pour le glisser et le réordonner</Text>
      )}

      {order === null ? null : visibleOrder.length === 0 ? (
        <Text style={styles.empty}>Aucune zone ne correspond à ta recherche.</Text>
      ) : (
        <DraggableCommuneList
          order={visibleOrder}
          zonesByCommune={zonesByCommune}
          onReorder={q ? undefined : handleReorder}
          onSelectZone={handleSelect}
        />
      )}
    </View>
  );
}

type DraggableCommuneListProps = {
  order: string[];
  zonesByCommune: Map<string, ResidentZone[]>;
  onReorder?: (newOrder: string[]) => void;
  onSelectZone: (zoneId: string) => void;
};

function DraggableCommuneList({
  order,
  zonesByCommune,
  onReorder,
  onSelectZone,
}: DraggableCommuneListProps) {
  const heightsRef = useRef<Record<string, number>>({});
  const [, forceRender] = useState(0);
  const dragY = useRef(new Animated.Value(0)).current;
  const [draggingCommune, setDraggingCommune] = useState<string | null>(null);
  const dragStartIndexRef = useRef(0);
  const liveOrderRef = useRef(order);
  liveOrderRef.current = order;

  const getOffsets = (ord: string[]) => {
    const offsets: number[] = [];
    let acc = 0;
    for (const commune of ord) {
      offsets.push(acc);
      acc += (heightsRef.current[commune] ?? 80) + GAP;
    }
    return offsets;
  };

  const makeResponder = (commune: string) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartIndexRef.current = liveOrderRef.current.indexOf(commune);
        setDraggingCommune(commune);
        dragY.setValue(0);
      },
      onPanResponderMove: (_evt, gesture) => {
        dragY.setValue(gesture.dy);
        if (!onReorder) return;

        const ord = liveOrderRef.current;
        const startIndex = ord.indexOf(commune);
        const offsets = getOffsets(ord);
        const draggedHeight = heightsRef.current[commune] ?? 80;
        const draggedCenter = offsets[startIndex] + draggedHeight / 2 + gesture.dy;

        let targetIndex = startIndex;
        let acc = 0;
        for (let i = 0; i < ord.length; i++) {
          const h = (heightsRef.current[ord[i]] ?? 80) + GAP;
          if (ord[i] !== commune && draggedCenter > acc && draggedCenter < acc + h) {
            targetIndex = i;
          }
          acc += h;
        }

        if (targetIndex !== startIndex) {
          const newOrder = ord.slice();
          newOrder.splice(startIndex, 1);
          newOrder.splice(targetIndex, 0, commune);
          liveOrderRef.current = newOrder;
          onReorder(newOrder);
        }
      },
      onPanResponderRelease: () => {
        Animated.spring(dragY, { toValue: 0, useNativeDriver: false }).start();
        setDraggingCommune(null);
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, { toValue: 0, useNativeDriver: false }).start();
        setDraggingCommune(null);
      },
    });

  const responders = useRef<Map<string, ReturnType<typeof PanResponder.create>>>(new Map());
  for (const commune of order) {
    if (!responders.current.has(commune)) {
      responders.current.set(commune, makeResponder(commune));
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
      {order.map((commune) => {
        const zones = zonesByCommune.get(commune) ?? [];
        const isDragging = draggingCommune === commune;
        const responder = responders.current.get(commune)!;
        return (
          <View
            key={commune}
            onLayout={(e) => {
              heightsRef.current[commune] = e.nativeEvent.layout.height;
              forceRender((n) => n + 1);
            }}
            style={isDragging ? { zIndex: 10 } : undefined}
          >
            <Animated.View
              style={[
                isDragging && {
                  transform: [{ translateY: dragY }],
                  shadowColor: "#000",
                  shadowOpacity: 0.18,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  backgroundColor: "#fff",
                  borderRadius: 10,
                },
              ]}
            >
              <View
                style={[styles.sectionHeaderRow, isDragging && styles.sectionHeaderRowActive]}
                {...(onReorder ? responder.panHandlers : {})}
              >
                {onReorder && <Text style={styles.dragHandle}>⠿</Text>}
                <Text style={styles.sectionHeader}>{commune}</Text>
              </View>
              {zones.map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                  onPress={() => onSelectZone(item.id)}
                >
                  <View style={styles.cardDot} />
                  <Text style={styles.cardZone}>{item.name}</Text>
                </Pressable>
              ))}
            </Animated.View>
          </View>
        );
      })}
    </ScrollView>
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
    marginBottom: 8,
  },
  dragHint: { fontSize: 12, color: "#999", marginBottom: 8 },
  list: { paddingBottom: 40, gap: GAP },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  sectionHeaderRowActive: { backgroundColor: "#EAFBF1" },
  dragHandle: { fontSize: 16, color: "#bbb" },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1FAA59",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#F7F7F9",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  cardPressed: { backgroundColor: "#ECECF0" },
  cardDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#1FAA59" },
  cardZone: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  empty: { textAlign: "center", color: "#888", marginTop: 40, fontSize: 14 },
});
