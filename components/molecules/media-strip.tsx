import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { MediaSourceSheet } from "@/components/molecules/media-source-sheet";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { tokens, useTheme } from "@/constants/theme";
import { deleteMediaFile, importPhoto } from "@/lib/media";

import type { NoteMedia } from "@/lib/types";

interface MediaStripProps {
  /** The current photo set, in order. */
  media: NoteMedia[];
  /** Replace the set (after an import or a removal). The caller owns
   *  persistence — this molecule only manages the files and the strip. */
  onChange: (next: NoteMedia[]) => void;
}

/**
 * The shared photo strip: thumbnails (tap to open the lightbox, X to remove,
 * which deletes the file from disk) plus an add-image key. The key opens the
 * MediaSourceSheet — Photo library / Camera as a bottom sheet — instead of an
 * inline row. Picked photos are downscaled + copied into the app's media dir
 * immediately via `importPhoto`, then handed to the caller through `onChange`.
 * Used by the note editor and the entry editor so both surfaces share one
 * capture vocabulary.
 */
export function MediaStrip({
  media,
  onChange,
}: MediaStripProps): React.ReactElement {
  const router = useRouter();
  const { colors } = useTheme();
  const [sourceOpen, setSourceOpen] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);

  const importPhotos = async (uris: string[]): Promise<void> => {
    if (uris.length === 0 || mediaBusy) return;
    setMediaBusy(true);
    try {
      const imported: NoteMedia[] = [];
      for (const uri of uris) {
        imported.push(await importPhoto(uri));
      }
      onChange([...media, ...imported]);
    } catch (error) {
      console.error("Failed to import photo:", error);
    } finally {
      setMediaBusy(false);
    }
  };

  const handleRemove = (item: NoteMedia): void => {
    void deleteMediaFile(item.uri).catch(() => {});
    onChange(media.filter((m) => m.uri !== item.uri));
  };

  const pickFromLibrary = async (): Promise<void> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 1,
    });
    if (!result.canceled) {
      await importPhotos(result.assets.map((a) => a.uri));
    }
  };

  const pickFromCamera = async (): Promise<void> => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled) {
      await importPhotos([result.assets[0].uri]);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        {media.map((item) => {
          const aspect = item.width / item.height;
          return (
            <View key={item.uri} style={styles.thumbWrap}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/lightbox",
                    params: { uri: item.uri },
                  })
                }
                accessibilityRole="imagebutton"
                accessibilityLabel="Open photo"
              >
                <Image
                  source={item.uri}
                  style={[styles.thumb, { aspectRatio: aspect, maxWidth: 96 }]}
                  contentFit="cover"
                  transition={120}
                />
              </Pressable>
              <Pressable
                onPress={() => handleRemove(item)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                style={({ pressed }) => [
                  styles.remove,
                  { backgroundColor: colors.paper },
                  pressed && styles.pressed,
                ]}
              >
                <IconSymbol name="X" size={10} color={colors.ink} />
              </Pressable>
            </View>
          );
        })}

        <Pressable
          onPress={() => setSourceOpen(true)}
          disabled={mediaBusy}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Add a photo"
          accessibilityState={{ busy: mediaBusy }}
          style={({ pressed }) => [styles.addKey, pressed && styles.pressed]}
        >
          <IconSymbol name="ImagePlus" size={22} color={colors.inkMuted} />
        </Pressable>
      </View>

      <MediaSourceSheet
        visible={sourceOpen}
        onPickLibrary={() => void pickFromLibrary()}
        onPickCamera={() => void pickFromCamera()}
        onClose={() => setSourceOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: tokens.space.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    flexWrap: "wrap",
  },
  thumbWrap: {
    position: "relative",
  },
  thumb: {
    height: 64,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.color.scrim.shadow,
  },
  remove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  addKey: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.pill,
  },
  pressed: {
    opacity: 0.7,
  },
});
