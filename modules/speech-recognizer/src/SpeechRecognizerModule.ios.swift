import ExpoModulesCore
import Speech
import AVFoundation

private let onTranscriptUpdate = "onTranscriptUpdate"

public class SpeechRecognizerModule: Module {
  private var audioEngine: AVAudioEngine?
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private var speechRecognizer: SFSpeechRecognizer?

  public func definition() -> ModuleDefinition {
    Name("SpeechRecognizer")
    Events(onTranscriptUpdate)

    AsyncFunction("requestPermissions") { (promise: Promise) in
      SFSpeechRecognizer.requestAuthorization { speechStatus in
        AVAudioSession.sharedInstance().requestRecordPermission { micGranted in
          promise.resolve([
            "speech": speechStatus == .authorized,
            "microphone": micGranted
          ])
        }
      }
    }

    AsyncFunction("startRecognition") { (promise: Promise) in
      DispatchQueue.main.async {
        do {
          try self.startRecognitionInternal()
          promise.resolve(nil)
        } catch {
          promise.reject("START_FAILED", error.localizedDescription)
        }
      }
    }

    AsyncFunction("stopRecognition") { (promise: Promise) in
      DispatchQueue.main.async {
        self.stopRecognitionInternal()
        promise.resolve(nil)
      }
    }

    AsyncFunction("transcribeFile") { (fileUri: String, promise: Promise) in
      print("[SynapseNative] Transcription requested for: \(fileUri)")
      guard let url = URL(string: fileUri) else {
        promise.reject("INVALID_URL", "The provided file URI is invalid")
        return
      }
      
      let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
      let request = SFSpeechURLRecognitionRequest(url: url)
      
      print("[SynapseNative] Starting speech recognition task...")
      recognizer?.recognitionTask(with: request) { result, error in
        if let error = error {
          print("[SynapseNative] Transcription error: \(error.localizedDescription)")
          promise.reject("TRANSCRIBE_FAILED", error.localizedDescription)
          return
        }
        if let result = result, result.isFinal {
          print("[SynapseNative] Transcription success: \(result.bestTranscription.formattedString)")
          promise.resolve(result.bestTranscription.formattedString)
        }
      }
    }

    OnDestroy {
      self.stopRecognitionInternal()
    }
  }

  // MARK: - Private

  private func startRecognitionInternal() throws {
    stopRecognitionInternal()

    // Create recognizer: prefer it-IT, fall back to en-US, then system default.
    // Note: isAvailable can be false on simulator even when recognition works,
    // so we proceed as long as we can create an SFSpeechRecognizer instance.
    if let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "it-IT")), recognizer.isAvailable {
      speechRecognizer = recognizer
    } else if let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US")), recognizer.isAvailable {
      speechRecognizer = recognizer
    } else if let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "it-IT")) {
      // Simulator fallback: isAvailable may report false but recognition can still work
      speechRecognizer = recognizer
    } else if let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US")) {
      speechRecognizer = recognizer
    } else if let recognizer = SFSpeechRecognizer() {
      speechRecognizer = recognizer
    }

    guard let recognizer = speechRecognizer else {
      throw NSError(
        domain: "SpeechRecognizer",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Speech recognizer not available"]
      )
    }
    _ = recognizer // suppress unused warning

    let audioSession = AVAudioSession.sharedInstance()
    try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
    try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

    let engine = AVAudioEngine()
    let request = SFSpeechAudioBufferRecognitionRequest()
    request.shouldReportPartialResults = true

    let inputNode = engine.inputNode
    let recordingFormat = inputNode.outputFormat(forBus: 0)
    inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
      request.append(buffer)
    }

    engine.prepare()
    try engine.start()

    let task = recognizer.recognitionTask(with: request) { [weak self] result, error in
      guard let self = self else { return }

      if let result = result {
        self.sendEvent(onTranscriptUpdate, [
          "transcript": result.bestTranscription.formattedString,
          "isFinal": result.isFinal
        ])
        if result.isFinal {
          self.stopRecognitionInternal()
        }
      }

      if let error = error {
        let nsError = error as NSError
        // Code 301 = normal cancellation from stopRecognitionInternal(), not a real error
        if nsError.code != 301 {
          self.sendEvent(onTranscriptUpdate, [
            "transcript": "",
            "isFinal": true,
            "error": error.localizedDescription
          ])
        }
        self.stopRecognitionInternal()
      }
    }

    audioEngine = engine
    recognitionRequest = request
    recognitionTask = task
  }

  private func stopRecognitionInternal() {
    audioEngine?.inputNode.removeTap(onBus: 0)
    audioEngine?.stop()
    // endAudio() lets the recognizer flush buffered audio into a final result
    // (delivering the dictated text), whereas cancel() would discard it. Use
    // finish() to wind the task down gracefully; only fall back to cancel() if
    // there's nothing to finalize.
    recognitionRequest?.endAudio()
    recognitionTask?.finish()
    audioEngine = nil
    recognitionRequest = nil
    recognitionTask = nil
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }
}
