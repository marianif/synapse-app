import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import emojilib from "emojilib/dist/emoji-en-US.json";
import dataByGroup from "unicode-emoji-json/data-by-group.json";

import { ThemedText } from "@/components/atoms/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";

import type { IconSymbolName } from "@/components/ui/icon-symbol";

// ─── Data ────────────────────────────────────────────────────────────────────
// Emoji corpus from `unicode-emoji-json` (Unicode group/order data) merged with
// `emojilib` keywords (same author, built to pair with it) so search resolves
// plain words — "smile", "work", "plant" — not just official names. Precomputed
// once at module scope: the corpus is static, so the picker never re-parses it.

type RawCategory = {
  name: string;
  slug: string;
  emojis: RawEmoji[];
};

type RawEmoji = {
  emoji: string;
  name: string;
  slug: string;
};

type EmojiRow = {
  emoji: string;
  name: string;
  search: string;
};

type Category = {
  name: string;
  slug: string;
  emojis: EmojiRow[];
};

type PickerRow = {
  key: string;
  header: string;
  emojis: EmojiRow[];
};

const KEYWORDS = emojilib as Record<string, string[]>;

const CATEGORIES: Category[] = (dataByGroup as RawCategory[]).map((group) => ({
  name: group.name,
  slug: group.slug,
  emojis: group.emojis.map((emoji) => {
    const keywords = KEYWORDS[emoji.emoji] ?? [];
    return {
      emoji: emoji.emoji,
      name: emoji.name,
      search: `${emoji.name} ${emoji.slug} ${group.name} ${keywords.join(" ")}`.toLowerCase(),
    };
  }),
}));

// Reicon glyphs for the 9 Unicode groups, in data order.
const CATEGORY_ICONS: IconSymbolName[] = [
  "SmileCircle", // Smileys & Emotion
  "Users", // People & Body
  "Leaf", // Animals & Nature
  "Coffee2", // Food & Drink
  "Plane", // Travel & Places
  "Trophy", // Activities
  "Lamp", // Objects
  "Heart", // Symbols
  "Flag", // Flags
];

const ALL_ROWS: PickerRow[] = CATEGORIES.map((category) => ({
  key: category.slug,
  header: category.name,
  emojis: category.emojis,
}));

// ─── Grid geometry (portrait-only, so module-scope is stable) ─────────────────
// Cells are fixed 44pt squares wrapping in rows; section height is deterministic
// so `getItemLayout` can be exact and category jumps can `scrollToOffset` safely
// even to sections the list hasn't rendered yet.
const CELL_SIZE = 44;
const CELL_GAP = 4;
const SECTION_HEADER_H = 29; // micro line-height 13 + vertical padding 16
const SECTION_GAP = tokens.space.md;
const GRID_PADDING = tokens.space.xl;
const GRID_WIDTH = Dimensions.get("window").width - GRID_PADDING * 2;
const COLS = Math.max(1, Math.floor((GRID_WIDTH + CELL_GAP) / (CELL_SIZE + CELL_GAP)));

function sectionHeight(count: number): number {
  const rows = Math.ceil(count / COLS);
  const grid = rows * (CELL_SIZE + CELL_GAP) - CELL_GAP;
  return SECTION_HEADER_H + grid + SECTION_GAP;
}

function buildOffsets(rows: PickerRow[]): number[] {
  let cursor = 0;
  return rows.map((row) => {
    const offset = cursor;
    cursor += sectionHeight(row.emojis.length);
    return offset;
  });
}

const ALL_OFFSETS = buildOffsets(ALL_ROWS);

function buildSearchRows(query: string): PickerRow[] {
  const matches: EmojiRow[] = [];
  for (const category of CATEGORIES) {
    for (const emoji of category.emojis) {
      if (emoji.search.includes(query)) {
        matches.push(emoji);
      }
    }
  }
  return [
    {
      key: "results",
      header: matches.length ? `Search results · ${matches.length}` : "No matches",
      emojis: matches,
    },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

interface EmojiPickerProps {
  /** Current project emoji — highlighted in the grid and gates the Clear action. */
  selected: string | null;
  /** Commit a pick (the sheet then returns to the menu pane). */
  onSelect: (emoji: string) => void;
  /** Clear the project emoji. Rendered only when `selected` is set. */
  onClear: () => void;
  /** Back to the menu pane without changing anything. */
  onCancel: () => void;
}

/**
 * In-app emoji picker — the Field Lab replacement for the bundled third-party
 * keyboard. A search field, an icon-only rail of the 9 Unicode groups, and a
 * lazy grid of the full corpus grouped by category. Data is local
 * (`unicode-emoji-json` + `emojilib`), so picking never opens the system
 * keyboard and the whole set is reachable in one sheet.
 *
 * The grid renders one PickerRow per section (not per emoji), so the full
 * ~1,900-emoji corpus costs ~9 list items; each section wraps its own cells.
 * Section height is deterministic (fixed cell size), so tapping a category rail
 * icon scrolls to that section via a computed offset, and the rail tracks the
 * section in view.
 */
export function EmojiPicker({
  selected,
  onSelect,
  onClear,
  onCancel,
}: EmojiPickerProps): React.ReactElement {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const listRef = useRef<FlatList<PickerRow>>(null);

  const searching = query.trim().length > 0;
  const rows = searching ? buildSearchRows(query.trim().toLowerCase()) : ALL_ROWS;
  const offsets = searching ? buildOffsets(rows) : ALL_OFFSETS;

  // Leaving search returns the list to the top of the full set — reset the rail
  // highlight so it can't claim a section it isn't showing.
  useEffect(() => {
    if (!searching) {
      setActiveCategory(0);
    }
  }, [searching]);

  const getItemLayout = (
    _data: ArrayLike<PickerRow> | null | undefined,
    index: number,
  ): { length: number; offset: number; index: number } => ({
    length: sectionHeight(rows[index].emojis.length),
    offset: offsets[index],
    index,
  });

  const jumpToCategory = (index: number): void => {
    setActiveCategory(index);
    listRef.current?.scrollToOffset({
      offset: ALL_OFFSETS[index],
      animated: true,
    });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const y = event.nativeEvent.contentOffset.y;
    let active = 0;
    for (let index = 0; index < ALL_OFFSETS.length; index++) {
      if (ALL_OFFSETS[index] <= y + 1) {
        active = index;
      }
    }
    setActiveCategory(active);
  };

  const renderRow = ({ item }: ListRenderItemInfo<PickerRow>): React.ReactElement => (
    <View style={styles.section}>
      <ThemedText
        type="micro"
        numberOfLines={1}
        style={[styles.sectionHeader, { color: colors.inkMuted }]}
      >
        {item.header}
      </ThemedText>
      <View style={styles.grid}>
        {item.emojis.map((emoji) => {
          const isSelected = emoji.emoji === selected;
          return (
            <Pressable
              key={emoji.emoji}
              onPress={() => onSelect(emoji.emoji)}
              accessibilityRole="button"
              accessibilityLabel={emoji.name}
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [
                styles.cell,
                isSelected && { backgroundColor: colors.surfaceSubtle },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.emojiGlyph}>{emoji.emoji}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search — recessed, mono-free editorial input. Filters name, slug,
          group, and emojilib keywords. */}
      <View style={[styles.searchBox, { backgroundColor: colors.surfaceSubtle }]}>
        <IconSymbol name="Search" size={16} color={colors.inkMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search emoji"
          placeholderTextColor={colors.inkMuted}
          style={[styles.searchInput, { color: colors.ink }]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Search emoji"
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => setQuery("")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={({ pressed }) => pressed && styles.pressed}
          >
            <IconSymbol name="X" size={16} color={colors.inkMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Category rail — hidden while searching so results read as one flat set. */}
      {!searching ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
        >
          {CATEGORIES.map((category, index) => {
            const active = activeCategory === index;
            return (
              <Pressable
                key={category.slug}
                onPress={() => jumpToCategory(index)}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={category.name}
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.categoryButton,
                  active && { backgroundColor: colors.surfaceSubtle },
                  pressed && styles.pressed,
                ]}
              >
                <IconSymbol
                  name={CATEGORY_ICONS[index]}
                  size={20}
                  color={active ? colors.ink : colors.inkMuted}
                />
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Grid — one item per section; sections wrap their own cells. */}
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={renderRow}
        getItemLayout={getItemLayout}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      {/* Footer — same quiet-action vocabulary as the rename pane. */}
      <View style={styles.actions}>
        {selected ? (
          <Pressable
            onPress={onClear}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Clear project emoji"
          >
            <ThemedText type="bodyBold" muted>
              Clear emoji
            </ThemedText>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <ThemedText type="bodyBold" muted>
            Cancel
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: Dimensions.get("window").height * 0.7,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    minHeight: 44,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.md,
    marginHorizontal: GRID_PADDING,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    fontSize: tokens.type.body.size,
    fontFamily: tokens.type.fontInter.regular,
    paddingVertical: 0,
  },
  rail: {
    flexDirection: "row",
    gap: tokens.space.xs,
    paddingHorizontal: GRID_PADDING,
    paddingVertical: tokens.space.md,
  },
  categoryButton: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: tokens.space.md,
  },
  section: {
    paddingBottom: SECTION_GAP,
  },
  sectionHeader: {
    paddingVertical: tokens.space.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiGlyph: {
    fontSize: 26,
    lineHeight: 30,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: tokens.space.sm,
    paddingHorizontal: GRID_PADDING,
    paddingTop: tokens.space.xs,
  },
  action: {
    minHeight: 44,
    paddingHorizontal: tokens.space.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
  },
  pressed: {
    opacity: 0.7,
  },
});