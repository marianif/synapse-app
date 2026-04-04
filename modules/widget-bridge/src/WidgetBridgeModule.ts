import { requireNativeModule } from "expo-modules-core";

export interface WidgetEntry {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduled_date: string | null;
  due_date: string | null;
}

interface WidgetBridgeNativeModule {
  syncEntries(entriesJSON: string): Promise<void>;
}

const WidgetBridge =
  requireNativeModule<WidgetBridgeNativeModule>("WidgetBridge");

export async function syncWidgetEntries(entries: WidgetEntry[]): Promise<void> {
  await WidgetBridge.syncEntries(JSON.stringify(entries));
}
