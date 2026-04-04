import ExpoModulesCore
import WidgetKit

private let appGroupID = "group.dev.the-wedge.synapse-app"
private let widgetDataKey = "widgetEntries"

public class WidgetBridgeModule: Module {
    public func definition() -> ModuleDefinition {
        Name("WidgetBridge")

        // Write serialized entries JSON to App Group UserDefaults
        // and tell WidgetKit to reload.
        AsyncFunction("syncEntries") { (entriesJSON: String, promise: Promise) in
            guard let defaults = UserDefaults(suiteName: appGroupID) else {
                promise.reject("APP_GROUP_ERROR", "Could not open app group suite")
                return
            }
            guard let data = entriesJSON.data(using: .utf8) else {
                promise.reject("ENCODING_ERROR", "Failed to encode entries string to data")
                return
            }
            defaults.set(data, forKey: widgetDataKey)
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
            promise.resolve(nil)
        }
    }
}
