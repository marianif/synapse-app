import { Stack } from "expo-router";

// The projects tab owns its own stack, mirroring (home): the shelf (index) is
// the entry point, and a project (or an entry inside it) opened from it
// pushes on top. Every screen supplies its own header via
// <Stack.Screen options={{ header }}> (dynamic, driven by live DB data), so
// the layout just leaves headerShown on.
export default function ProjectsStackLayout(): React.ReactElement {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" />
      {/* Shared routes: project.tsx and detail.tsx live in the (home,projects)
          array group, so each exists in this stack AND in the home stack. */}
      <Stack.Screen name="project" />
      <Stack.Screen name="detail" />
      <Stack.Screen name="edit" />
    </Stack>
  );
}
