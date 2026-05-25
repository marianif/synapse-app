import ExpoModulesCore
import WatchConnectivity

public class WatchConnectivityModule: Module {
  private var delegate: WatchSessionDelegate?

  public func definition() -> ModuleDefinition {
    Name("WatchConnectivity")

    Events("onWatchMessageReceived", "onWatchContextReceived", "onWatchFileReceived")

    OnCreate {
      if WCSession.isSupported() {
        self.delegate = WatchSessionDelegate(module: self)
      }
    }

    AsyncFunction("updateApplicationContext") { (context: [String: Any]) in
      guard let session = WCSession.default as WCSession?, session.activationState == .activated else {
        throw Exception(name: "WCSessionError", description: "WCSession is not activated")
      }
      try session.updateApplicationContext(context)
    }

    AsyncFunction("sendMessage") { (message: [String: Any], promise: Promise) in
      guard let session = WCSession.default as WCSession?, session.activationState == .activated else {
        promise.reject("WCSessionError", "WCSession is not activated")
        return
      }
      
      session.sendMessage(message, replyHandler: { reply in
        promise.resolve(reply)
      }, errorHandler: { error in
        promise.reject("WCSessionError", error.localizedDescription)
      })
    }
  }
}

// Separate Delegate class inheriting from NSObject as required by WCSessionDelegate
class WatchSessionDelegate: NSObject, WCSessionDelegate {
  weak var module: WatchConnectivityModule?
  
  init(module: WatchConnectivityModule) {
    self.module = module
    super.init()
    if WCSession.isSupported() {
      WCSession.default.delegate = self
      WCSession.default.activate()
    }
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    print("[SynapseWatch] WCSession activated: \(activationState.rawValue)")
  }

  #if os(iOS)
  func sessionDidBecomeInactive(_ session: WCSession) {}
  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }
  #endif

  func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
    print("[SynapseNative] Received message from Watch")
    
    // Check if this is an audio data message (Simulator bypass)
    if let audioData = message["audioData"] as? Data {
      print("[SynapseNative] Message contains audio data (\(audioData.count) bytes)")
      let tempDir = FileManager.default.temporaryDirectory
      let fileURL = tempDir.appendingPathComponent("watch_voice_\(UUID().uuidString).wav")
      
      do {
        try audioData.write(to: fileURL)
        print("[SynapseNative] Saved audio data to: \(fileURL.path)")
        module?.sendEvent("onWatchFileReceived", [
          "url": fileURL.absoluteString,
          "metadata": ["type": "voice_note"]
        ])
      } catch {
        print("[SynapseNative] Error saving audio data: \(error)")
      }
    } else {
      module?.sendEvent("onWatchMessageReceived", message)
    }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
    module?.sendEvent("onWatchContextReceived", applicationContext)
  }
  
  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any]) {
    module?.sendEvent("onWatchMessageReceived", userInfo)
  }

  func session(_ session: WCSession, didReceive file: WCSessionFile) {
    print("[SynapseNative] Received file from Watch: \(file.fileURL.lastPathComponent)")
    // Files are temporary, we should pass the URL to JS immediately
    module?.sendEvent("onWatchFileReceived", [
      "url": file.fileURL.absoluteString,
      "metadata": file.metadata ?? [:]
    ])
  }
}
