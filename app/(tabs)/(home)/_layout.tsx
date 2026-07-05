import { AppHeader } from "@/components/organisms/app-header";
import { Stack } from "expo-router";

// The home tab owns its own stack: the Field (index) is the only entry point,
// and detail / project / projects are pushed on top of it. Every screen wears a
// navigator-owned header (never one laid out in the screen body) — so the header
// is a Stack concern, declared here or set per-screen via <Stack.Screen>.
//
//   • index    — the persistent Synapse brand bar (AppHeader).
//   • projects — a static "Projects" spine, fully owned here.
//   • detail / project — dynamic headers (entry/project title, type hue, emoji,
//     overflow menu) driven by live DB data, so each screen supplies its own
//     header from inside via <Stack.Screen options={{ header }}>. Base config
//     just leaves headerShown on so they only override `header`.
export default function HomeStackLayout(): React.ReactElement {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ header: () => <AppHeader /> }} />
      <Stack.Screen name="detail" />
      <Stack.Screen name="projects" />
      <Stack.Screen name="project" />
    </Stack>
  );
}
