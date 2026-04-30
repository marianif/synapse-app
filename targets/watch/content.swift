import SwiftUI
import WatchConnectivity

// MARK: - Session Manager
class WatchSessionManager: NSObject, WCSessionDelegate, ObservableObject {
    static let shared = WatchSessionManager()
    
    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }
    
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        print("WCSession activated: \(activationState.rawValue)")
    }
    
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        // Handle incoming data from phone (for future iteration)
        if let phoneNotes = applicationContext["phone_notes"] as? [String] {
            print("Received notes from phone: \(phoneNotes)")
            // Here you could update a local @Published list of notes
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        if let phoneNotes = message["phone_notes"] as? [String] {
            print("Received immediate message from phone: \(phoneNotes)")
        }
    }
    
    func syncNoteToPhone(_ note: String) {
        guard WCSession.default.activationState == .activated else {
            print("WCSession not activated")
            return
        }
        
        // Option 1: Send immediate message
        WCSession.default.sendMessage(["notes": [note]], replyHandler: nil) { error in
            print("Error sending message: \(error.localizedDescription)")
        }
        
        // Option 2: Update application context (more reliable for background)
        var context = WCSession.default.applicationContext
        var notes = context["notes"] as? [String] ?? []
        notes.append(note)
        try? WCSession.default.updateApplicationContext(["notes": notes])
    }
}

struct ContentView: View {

    @State private var noteText: String = ""
    @State private var isSaving: Bool = false
    @State private var showSuccess: Bool = false
    
    @StateObject private var sessionManager = WatchSessionManager.shared

    private let groupID = "group.dev.the-wedge.synapse-app"
    private let storageKey = "pending_notes"
    
    // Design System Tokens
    private let primaryGradient = LinearGradient(
        colors: [Color(red: 173/255, green: 198/255, blue: 255/255), Color(red: 77/255, green: 142/255, blue: 255/255)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    private let surfaceContainer = Color(red: 31/255, green: 31/255, blue: 34/255)
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            VStack(spacing: 20) {
                if showSuccess {
                    successView
                } else {
                    headerView
                    
                    inputField
                    
                    actionButton
                }
            }
            .padding()
        }
        .onOpenURL { url in
            if url.host == "new-note" || url.absoluteString.contains("new-note") {
                // Delay slightly to ensure the view hierarchy is ready
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                    triggerDictation()
                }
            }
        }

    }
    
    private var headerView: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("SYNAPSE")
                .font(.system(size: 10, weight: .bold))
                .kerning(2)
                .foregroundColor(Color(red: 173/255, green: 198/255, blue: 255/255).opacity(0.6))
            
            Text("Quick Capture")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    private var inputField: some View {
        TextField("Tap to edit manually...", text: $noteText)
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(surfaceContainer)
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color.white.opacity(0.05), lineWidth: 1)
                    )
            )
            .onSubmit {
                saveNote()
            }
    }
    
    private var actionButton: some View {
        Button(action: triggerDictation) {
            ZStack {
                Circle()
                    .fill(noteText.isEmpty ? Color.white.opacity(0.1) : Color.white.opacity(0.2))
                    .frame(width: 72, height: 72) // Slightly larger
                    .overlay(
                        Circle()
                            .stroke(
                                noteText.isEmpty ? 
                                AnyShapeStyle(Color.white.opacity(0.1)) : 
                                AnyShapeStyle(primaryGradient.opacity(0.5)), 
                                lineWidth: 2
                            )
                    )
                
                if isSaving {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "mic.fill")
                        .font(.system(size: 28, weight: .semibold))
                        .foregroundStyle(noteText.isEmpty ? AnyShapeStyle(Color.white.opacity(0.4)) : AnyShapeStyle(primaryGradient))
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(isSaving)
        .scaleEffect(isSaving ? 0.9 : 1.0)
    }

    private func triggerDictation() {
        WKExtension.shared().visibleInterfaceController?.presentTextInputController(
            withSuggestions: nil, 
            allowedInputMode: .plain
        ) { results in
            guard let result = results?.first as? String, !result.isEmpty else { return }
            
            DispatchQueue.main.async {
                self.noteText = result
                WKInterfaceDevice.current().play(.click)
                
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                    if !self.noteText.isEmpty {
                        self.saveNote()
                    }
                }
            }
        }
    }


    
    private var successView: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.green.opacity(0.15))
                    .frame(width: 80, height: 80)
                
                Image(systemName: "checkmark")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.green)
            }
            
            Text("SYNCED")
                .font(.system(size: 12, weight: .bold))
                .kerning(1.5)
                .foregroundColor(.green.opacity(0.8))
        }
        .transition(.scale.combined(with: .opacity))
        .onAppear {
            WKInterfaceDevice.current().play(.success)
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                withAnimation(.spring()) {
                    showSuccess = false
                    noteText = ""
                }
            }
        }
    }
    
    private func saveNote() {
        guard !noteText.isEmpty else { return }
        isSaving = true

        // 1. Save to App Group local storage (for Watch widgets)
        if let defaults = UserDefaults(suiteName: groupID) {
            var currentNotes: [String] = []
            if let data = defaults.data(forKey: storageKey),
               let decoded = try? JSONSerialization.jsonObject(with: data) as? [String] {
                currentNotes = decoded
            }
            currentNotes.append(noteText)
            if let encoded = try? JSONSerialization.data(withJSONObject: currentNotes) {
                defaults.set(encoded, forKey: storageKey)
                defaults.synchronize()
            }
        }

        // 2. Sync to Phone via WCSession (Real-time)
        sessionManager.syncNoteToPhone(noteText)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            withAnimation(.spring()) {
                isSaving = false
                showSuccess = true
            }
        }
    }
}


struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
