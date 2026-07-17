import SwiftUI
import UIKit

// MARK: - Design System Tokens (Field Lab)
//
// Your whole brain as a living instrument panel: cool graphite paper, three
// electric type-colors that glow at equal volume, a neutral accent slab, sharp
// edges. Never pure #FFF/#000. Mirrors `constants/theme.ts` — this file is a
// hand-maintained Swift copy since the widget extension can't import RN code;
// keep it in sync by hand whenever theme.ts's `color`/`accent`/`feedback`/
// `radius` tokens change.

extension Color {
    /// Resolve a light/dark hex pair to a single scheme-aware Color.
    static func dynamic(light: String, dark: String) -> Color {
        Color(uiColor: UIColor { traits in
            UIColor(Color(hex: traits.userInterfaceStyle == .dark ? dark : light))
        })
    }

    // Surfaces — cool graphite paper, not warm cream.
    static let paper = Color.dynamic(light: "EEF1F5", dark: "171A20")          // root background
    static let surface = Color.dynamic(light: "F8FAFC", dark: "1F242C")        // tile body
    static let surfaceSubtle = Color.dynamic(light: "E4E8EE", dark: "15181D")  // recessed / gutter

    // Text — cool near-black / cool near-white.
    static let ink = Color.dynamic(light: "1A1E25", dark: "E9EDF3")            // primary
    static let inkMuted = Color.dynamic(light: "5A6473", dark: "8A93A3")       // secondary / metadata

    // Primary action color — a scheme-aware NEUTRAL slab, not a hue, so it can
    // never be confused with a saturated entry-type code.
    static let clay = Color.dynamic(light: "3A4250", dark: "E9EDF3")
    static let clayPressed = Color.dynamic(light: "2B313C", dark: "CDD5E0")
    static let onClay = Color.dynamic(light: "EEF1F5", dark: "171A20")

    // Entry-type codes (dots / fills). Shared across schemes — equal volume.
    static let typeBills = Color(hex: "FB7185")   // coral — deadline
    static let typeIdea = Color(hex: "FBBF24")    // amber — idea
    static let typeTodo = Color(hex: "22D3EE")    // electric cyan — todo (never green)

    // AA-safe kicker shades — scheme-aware because the tints sit at opposite
    // lightness ends (dark hue on light tint, bright hue on dark tint).
    static let kickerBills = Color.dynamic(light: "AF3B51", dark: "FB7185")
    static let kickerIdea = Color.dynamic(light: "B39F06", dark: "FBBF24")
    static let kickerTodo = Color.dynamic(light: "0B7286", dark: "22D3EE")

    // Entry-type tile-tints (soft fills). Scheme-aware.
    static let tintBills = Color.dynamic(light: "FCE0E4", dark: "2E1C20")
    static let tintIdea = Color.dynamic(light: "FBEFCF", dark: "2E2611")
    static let tintTodo = Color.dynamic(light: "D6F2F7", dark: "102A30")

    // Feedback — success is the ONLY green, and it means completion only.
    static let success = Color(hex: "34D399")
    static let warning = Color(hex: "FBBF24")
    static let danger = Color(hex: "F43F5E")

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

// MARK: - Radius Tokens — sharp, instrument-panel edges.

enum Radius {
    static let sm: CGFloat = 6
    static let md: CGFloat = 10
    static let lg: CGFloat = 14
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
