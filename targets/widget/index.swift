import WidgetKit
import SwiftUI

@main
struct exportWidgets: WidgetBundle {
    var body: some Widget {
        entriesWidget()
        nextActionWidget()
        voiceInputWidget()
        habitsWidget()

        if #available(iOS 18.0, *) {
            speakControl()
            typeControl()
        }
    }
}
