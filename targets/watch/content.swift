import SwiftUI
import WatchConnectivity
import AVFoundation

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
    
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {}
    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {}
    
    func syncNoteToPhone(_ note: String) {
        guard WCSession.default.activationState == .activated else { return }
        WCSession.default.sendMessage(["notes": [note]], replyHandler: nil)
    }
    
    func sendAudioFileToPhone(_ url: URL) {
        print("[SynapseWatch] Preparing to send audio: \(url.lastPathComponent)")
        
        guard WCSession.default.activationState == .activated else {
            print("[SynapseWatch] Error: WCSession not activated")
            return
        }

        // 1. Try sending via sendMessage (Faster, but limited to ~64KB-1MB)
        if let audioData = try? Data(contentsOf: url) {
            print("[SynapseWatch] Attempting sendMessage (\(audioData.count) bytes)...")
            WCSession.default.sendMessage(["audioData": audioData, "type": "voice_note"], replyHandler: { _ in
                print("[SynapseWatch] sendMessage success!")
            }) { error in
                let nsError = error as NSError
                print("[SynapseWatch] sendMessage failed. Code: \(nsError.code), Domain: \(nsError.domain)")
                
                if nsError.code == 7009 { // WCErrorPayloadTooLarge
                    print("[SynapseWatch] Payload too large (7009). Falling back to transferFile...")
                    WCSession.default.transferFile(url, metadata: ["type": "voice_note"])
                } else {
                    print("[SynapseWatch] sendMessage failed with error: \(error.localizedDescription). Falling back anyway...")
                    WCSession.default.transferFile(url, metadata: ["type": "voice_note"])
                }
            }
        } else {
            print("[SynapseWatch] Could not read Data. Using transferFile directly...")
            WCSession.default.transferFile(url, metadata: ["type": "voice_note"])
        }
    }
}

// MARK: - Main View
struct ContentView: View {
    @State private var showSuccess: Bool = false
    @StateObject private var sessionManager = WatchSessionManager.shared

    private let groupID = "group.dev.the-wedge.synapse-app"
    private let storageKey = "pending_notes"
    
    private let primaryGradient = LinearGradient(
        colors: [Color(red: 173/255, green: 198/255, blue: 255/255), Color(red: 77/255, green: 142/255, blue: 255/255)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            if showSuccess {
                successView
            } else {
                mainCaptureView
            }
        }
        .onOpenURL { url in
            if url.host == "new-note" || url.absoluteString.contains("new-note") {
                triggerVoiceCapture()
            }
        }
    }
    
    private var mainCaptureView: some View {
        VStack(spacing: 12) {
            headerView
            
            Spacer()
            
            // Large Record Button
            Button(action: triggerVoiceCapture) {
                ZStack {
                    Circle()
                        .fill(Color.white.opacity(0.1))
                        .frame(width: 80, height: 80)
                        .overlay(
                            Circle()
                                .stroke(primaryGradient.opacity(0.5), lineWidth: 2)
                        )
                    
                    Image(systemName: "mic.fill")
                        .font(.system(size: 32, weight: .bold))
                        .foregroundStyle(primaryGradient)
                }
            }
            .buttonStyle(.plain)
            
            Text("Tap to record")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.white.opacity(0.4))
            
            Spacer()
            
            // Manual Input Shortcut
            Button(action: triggerManualInput) {
                Text("Type manually...")
                    .font(.system(size: 11))
                    .foregroundColor(Color(red: 173/255, green: 198/255, blue: 255/255))
                    .padding(.vertical, 4)
            }
            .buttonStyle(.plain)
        }
        .padding()
    }
    
    private var headerView: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("SYNAPSE")
                .font(.system(size: 9, weight: .bold))
                .kerning(1.5)
                .foregroundColor(Color(red: 173/255, green: 198/255, blue: 255/255).opacity(0.6))
            
            Text("Quick Capture")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    private var successView: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 44))
                .foregroundColor(.green)
            
            Text("SYNCED")
                .font(.system(size: 12, weight: .bold))
                .kerning(1.5)
                .foregroundColor(.green.opacity(0.8))
        }
        .onAppear {
            WKInterfaceDevice.current().play(.success)
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                withAnimation { showSuccess = false }
            }
        }
    }
    
    private func triggerVoiceCapture() {
        // Use temporary directory for more stable file access
        let tempDir = FileManager.default.temporaryDirectory
        let outputURL = tempDir.appendingPathComponent("voice_note_\(UUID().uuidString).wav")
        
        print("[SynapseWatch] Presenting recorder for: \(outputURL.lastPathComponent)")
        
        // Ensure we are on the main thread for UI presentation
        DispatchQueue.main.async {
            WKExtension.shared().visibleInterfaceController?.presentAudioRecorderController(
                withOutputURL: outputURL,
                preset: .highQualityAudio,
                options: nil
            ) { didSave, error in
                if didSave {
                    print("[SynapseWatch] Recording saved successfully")
                    self.sessionManager.sendAudioFileToPhone(outputURL)
                    withAnimation { self.showSuccess = true }
                } else if let err = error {
                    print("[SynapseWatch] Recording failed: \(err)")
                }
            }
        }
    }
    
    private func triggerManualInput() {
        DispatchQueue.main.async {
            WKExtension.shared().visibleInterfaceController?.presentTextInputController(
                withSuggestions: nil, 
                allowedInputMode: .plain
            ) { results in
                guard let result = results?.first as? String, !result.isEmpty else { return }
                self.sessionManager.syncNoteToPhone(result)
                withAnimation { self.showSuccess = true }
            }
        }
    }
    
    private func getDocumentsDirectory() -> URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }
}
