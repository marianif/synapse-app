import { Stack } from "expo-router";

// The habits tab owns its own stack, mirroring (home) / (projects): the list
// (index) is the entry point and a habit's read-only detail pushes on top, so
// Back returns to the list and the tab bar stays put. The list draws its own
// in-body header; detail supplies a ScreenHeader from inside.
export default function HabitsStackLayout(): React.ReactElement {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="detail" />
    </Stack>
  );
}
