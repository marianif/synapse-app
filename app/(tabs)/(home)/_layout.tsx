import { AppHeader } from "@/components/organisms/app-header";
import { Stack } from "expo-router";

// The home tab owns its own stack: the Field (index) is the only entry point,
// and detail / settings are pushed on top of it. Projects now live in their
// own (projects) tab stack. Every screen wears a navigator-owned header
// (never one laid out in the screen body) — so the header is a Stack
// concern, declared here or set per-screen via <Stack.Screen>.
//
//   • index  — the persistent Synapse brand bar (AppHeader).
//   • detail — dynamic header (entry title, type hue, overflow menu) driven
//     by live DB data, so the screen supplies its own header from inside via
//     <Stack.Screen options={{ header }}>. Base config just leaves
//     headerShown on so it only overrides `header`.
export default function HomeStackLayout(): React.ReactElement {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ header: () => <AppHeader /> }} />
      <Stack.Screen name="settings" />
      {/* Shared routes: project.tsx and detail.tsx live in the (home,projects)
          array group, so each exists in this stack AND in the projects stack.
          Opening one from the Field pushes it here, which is what keeps Back
          returning to the Field instead of dumping you on the Projects shelf. */}
      <Stack.Screen name="project" />
      <Stack.Screen name="detail" />
      <Stack.Screen name="edit" />
    </Stack>
  );
}
