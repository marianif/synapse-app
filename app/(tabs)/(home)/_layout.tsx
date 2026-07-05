import { AppHeader } from "@/components/organisms/app-header";
import { Stack } from "expo-router";

// The home tab owns its own stack: the Field (index) is the only entry point,
// and detail / project / projects are pushed on top of it. Nesting them here
// (rather than at the root) keeps the tab bar + AppHeader chrome mounted while
// these screens are open, since they live inside the (tabs) group.
export default function HomeStackLayout(): React.ReactElement {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{ headerShown: true, header: () => <AppHeader /> }}
      />
      <Stack.Screen name="detail" />
      <Stack.Screen name="projects" />
      <Stack.Screen name="project" />
    </Stack>
  );
}
