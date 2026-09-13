import { Redirect } from "expo-router";

/**
 * Deep-link gate for the Habits tab.
 *
 * Unlike /edit or /detail, the tab itself has no addressable URL: it lives in
 * a group and resolves to bare "/", where the Field wins. The Habits widget's
 * overflow and empty states point at `synapseapp:///habits`, so this forwards
 * them to the group-qualified route — the same href the tab bar uses.
 */
export default function HabitsGate(): React.ReactElement {
  return <Redirect href="/(tabs)/(habits)" />;
}
