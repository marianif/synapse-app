import SwiftUI
import UIKit

// MARK: - Design System Tokens (The Field)
//
// "The New Yorker organizing your life." Warm oat-cream paper in light, warm
// soot-brown in dark — never pure #FFF/#000. One clay action color. Entry types
// carry a soft tile-tint + a saturated edge-code. No gradients, no glows, no
// neon. Mirrors `constants/theme.ts`; light/dark parity via a dynamic provider
// so the widget follows the system scheme like the app's `useTheme()`.

extension Color {
    /// Resolve a light/dark hex pair to a single scheme-aware Color.
    static func dynamic(light: String, dark: String) -> Color {
        Color(uiColor: UIColor { traits in
            UIColor(Color(hex: traits.userInterfaceStyle == .dark ? dark : light))
        })
    }

    // Surfaces — warm paper, not cold slate.
    static let paper = Color.dynamic(light: "F4EFE6", dark: "16140F")          // root background
    static let surface = Color.dynamic(light: "FBF7F0", dark: "211E18")        // tile body
    static let surfaceSubtle = Color.dynamic(light: "EFE8DB", dark: "1C1A14")  // recessed / gutter

    // Text — warm near-black brown / warm cream.
    static let ink = Color.dynamic(light: "2A2622", dark: "F0EAE0")            // primary
    static let inkMuted = Color.dynamic(light: "6B6358", dark: "A39B8C")       // secondary / metadata

    // The one action color — clay terracotta. Used sparingly.
    static let clay = Color(hex: "D86B3C")
    static let clayPressed = Color(hex: "BE5730")

    // Entry-type codes (dots / edge-bars / fills). Shared across schemes.
    static let typeBills = Color(hex: "D98C6A")   // peach
    static let typeIdea = Color(hex: "5B86A8")    // powder-blue
    static let typeTodo = Color(hex: "6E9466")    // sage

    // Entry-type tile-tints (soft fills). Scheme-aware.
    static let tintBills = Color.dynamic(light: "F7E3D6", dark: "3A2A22")
    static let tintIdea = Color.dynamic(light: "DDE7F0", dark: "22303A")
    static let tintTodo = Color.dynamic(light: "DCE7D6", dark: "26331F")
    static let tintEvent = Color.dynamic(light: "E6DCEC", dark: "2E2638")
    static let tintSomeday = Color.dynamic(light: "F2E6C9", dark: "352B14")

    // Feedback — warm even when signalling.
    static let success = Color(hex: "6E9466")
    static let warning = Color(hex: "C09A4B")
    static let danger = Color(hex: "C8553D")

    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Radius Tokens — large soft corners, "cards you could pick up".

enum Radius {
    static let sm: CGFloat = 10
    static let md: CGFloat = 14
    static let lg: CGFloat = 18
    static let pill: CGFloat = 999
}

// MARK: - Spacing Tokens — 4pt base.

enum Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 20
    static let xxl: CGFloat = 24
    static let xxxl: CGFloat = 32
}
