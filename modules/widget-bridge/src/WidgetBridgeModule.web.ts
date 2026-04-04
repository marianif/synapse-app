import type { WidgetEntry } from "./WidgetBridgeModule";

// No-op on web
export async function syncWidgetEntries(
  _entries: WidgetEntry[],
): Promise<void> {}
