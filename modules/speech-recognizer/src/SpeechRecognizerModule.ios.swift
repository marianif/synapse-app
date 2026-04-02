import ExpoModulesCore
import Speech
import AVFoundation

private let onTranscriptUpdate = "onTranscriptUpdate"

public class SpeechRecognizerModule: Module {
  private var audioEngine: AVAudioEngine?
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "it-IT"))

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

    OnDestroy {
      self.stopRecognitionInternal()
    }
  }

  // MARK: - Private

  private func startRecognitionInternal() throws {
    stopRecognitionInternal()

    guard let recognizer = speechRecognizer, recognizer.isAvailable else {
      throw NSError(
        domain: "SpeechRecognizer",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Speech recognizer not available"]
      )
    }

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
    recognitionRequest?.endAudio()
    recognitionTask?.cancel()
    audioEngine = nil
    recognitionRequest = nil
    recognitionTask = nil
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }
}
