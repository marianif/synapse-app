import { Stack } from "expo-router";

// The projects tab owns its own stack, mirroring (home): the shelf (index) is
// the entry point, and a project opened from it pushes on top. Both screens
// supply their own header via <Stack.Screen options={{ header }}> (dynamic,
// driven by live DB data), so the layout just leaves headerShown on.
export default function ProjectsStackLayout(): React.ReactElement {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="project" />
    </Stack>
  );
}
