Sharing data between targets
To share values between the app and the target, you must use App Groups and NSUserDefaults. I've added a native module to make the React Native API a bit easier.

Configuring App Groups
Start by defining an App Group, a good default is group.<bundle identifier>. App Groups can be used across apps so you may want something more generic or less generic if you plan on having multiple extensions.

First, define your main App Group entitlement in your app.json:

{
"expo": {
"ios": {
"entitlements": {
"com.apple.security.application-groups": ["group.bacon.data"]
}
},
"plugins": ["@bacons/apple-targets"]
}
}
Second, define the same App Group in your target's expo-target.config.js:

/\*_ @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} _/
module.exports = (config) => ({
type: "widget",
entitlements: {
// Use the same app groups:
"com.apple.security.application-groups":
config.ios.entitlements["com.apple.security.application-groups"],
},
});
Now you can prebuild to generate the entitlements. You may need to create an EAS Build or open Xcode to sync the entitlements.

Setting shared data
To define shared data, we'll use a native module (ExtensionStorage) that interacts with NSUserDefaults.

Somewhere in your Expo app, you can set a value:

import { ExtensionStorage } from "@bacons/apple-targets";

// Create a storage object with the App Group.
const storage = new ExtensionStorage(
// Your app group identifier. Should match the values in the app.json and expo-target.config.json.
"group.bacon.data"
);

// Then you can set data:
storage.set("myKey", "myValue");

// Finally, you can reload the widget:
ExtensionStorage.reloadWidget();
ExtensionStorage has the following API:

set(key: string, value: string | number | Record<string, string | number> | Array<Record<string, string | number>> | undefined): void - Sets a value in the shared storage for a given key. Setting undefined will remove the key.
ExtensionStorage.reloadWidget(name?: string): void - A static method for reloading the widget. Behind the scenes, this calls WidgetCenter.shared.reloadAllTimelines(). If given a name, it will reload a specific widget using WidgetCenter.shared.reloadTimelines(ofKind: timeline).
ExtensionStorage.reloadControls(name?: string): void - A static method for reloading the controls. Behind the scenes, this calls ControlCenter.shared.reloadAllControls(): void. If given a name, it will reload a specific widget using ControlCenter.shared.reloadControls(ofKind?: string): void.
remove(key: string): void - A method for removing the key from the shared storage.
get(key: string): string | null - A static method for getting the value from the shared storage.
Accessing shared data
Assuming this is done using Swift code, you'll access data using NSUserDefaults directly. Here's an example of how you might access the data in a widget:

let defaults = UserDefaults(suiteName:
// Use the App Group from earlier.
"group.bacon.data"
)
// Access the value you set:
let index = defaults?.string(forKey: "myKey")
More data updates
For more advanced uses, I recommend the following resources:
