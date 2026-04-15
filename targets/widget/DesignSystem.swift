import SwiftUI

// MARK: - Design System Tokens (Dark Sanctuary)

extension Color {
    // Surface Hierarchy
    static let surfaceBase = Color(hex: "131316")
    static let surfaceContainerLow = Color(hex: "1B1B1E")
    static let surfaceContainer = Color(hex: "1F1F22")
    static let surfaceContainerHigh = Color(hex: "2A2A2D")
    static let surfaceContainerHighest = Color(hex: "353438")
    static let surfaceContainerLowest = Color(hex: "0E0E11")
    static let surfaceBright = Color(hex: "39393C")

    // Text Colors
    static let textPrimary = Color(hex: "FAFAFA")
    static let textSecondary = Color(hex: "A1A1AA")
    static let textTertiary = Color(hex: "71717A")
    static let textDisabled = Color(hex: "3F3F46")

    // Brand Colors
    static let brandPrimary = Color(hex: "ADC6FF")
    static let brandPrimaryContainer = Color(hex: "4D8EFF")

    // Entry Accent Colors
    static let accentTodo = Color(hex: "6EA8FF")
    static let accentDeadline = Color(hex: "FF6B6B")
    static let accentEvent = Color(hex: "C084FC")
    static let accentSomeday = Color(hex: "40FBCF")
    static let accentToday = Color(hex: "E5EE90")
    static let accentIdea = Color(hex: "FBB040")
    static let accentDone = Color(hex: "40FBCF")

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

// MARK: - Radius Tokens

enum Radius {
    static let sm: CGFloat = 4
    static let md: CGFloat = 6
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
}

// MARK: - Spacing Tokens

enum Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 20
    static let xxl: CGFloat = 24
}
