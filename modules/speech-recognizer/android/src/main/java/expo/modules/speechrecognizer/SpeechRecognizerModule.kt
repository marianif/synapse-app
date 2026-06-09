package expo.modules.speechrecognizer

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.content.ContextCompat
import expo.modules.interfaces.permissions.PermissionsResponse
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale

private const val ON_TRANSCRIPT_UPDATE = "onTranscriptUpdate"

// Mirrors the iOS SpeechRecognizerModule contract: real-time partial transcripts
// streamed over onTranscriptUpdate, with a final flag and optional error.
class SpeechRecognizerModule : Module() {

  private var speechRecognizer: SpeechRecognizer? = null
  // Tracks whether we've already emitted a terminal (isFinal=true) event for the
  // current session, so onResults/onError don't double-fire to JS.
  private var sessionEnded = false

  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val currentActivity
    get() = appContext.activityProvider?.currentActivity

  override fun definition() = ModuleDefinition {
    Name("SpeechRecognizer")
    Events(ON_TRANSCRIPT_UPDATE)

    AsyncFunction("requestPermissions") { promise: Promise ->
      val micGranted = ContextCompat.checkSelfPermission(
        context, Manifest.permission.RECORD_AUDIO
      ) == PackageManager.PERMISSION_GRANTED

      if (micGranted) {
        resolvePermissions(promise, true)
        return@AsyncFunction
      }

      val permissions = appContext.permissions
      if (permissions == null) {
        resolvePermissions(promise, false)
        return@AsyncFunction
      }

      // Defer to expo-modules-core's permission delegate via a one-shot request.
      permissions.askForPermissions(
        { result: Map<String, PermissionsResponse> ->
          val granted = result[Manifest.permission.RECORD_AUDIO]?.status ==
            PermissionsStatus.GRANTED
          resolvePermissions(promise, granted)
        },
        Manifest.permission.RECORD_AUDIO
      )
    }

    AsyncFunction("startRecognition") { promise: Promise ->
      runOnMain {
        try {
          startRecognitionInternal()
          promise.resolve(null)
        } catch (e: Exception) {
          promise.reject("START_FAILED", e.message ?: "Failed to start recognition", e)
        }
      }
    }

    AsyncFunction("stopRecognition") { promise: Promise ->
      runOnMain {
        stopRecognitionInternal()
        promise.resolve(null)
      }
    }

    // One-shot file transcription. Android's SpeechRecognizer does not accept an
    // audio file URI as input (it only consumes the live mic), so this is not
    // supported on Android and rejects clearly rather than failing silently.
    AsyncFunction("transcribeFile") { _: String, promise: Promise ->
      promise.reject(
        "UNSUPPORTED",
        "File transcription is not supported on Android; use live startRecognition().",
        null
      )
    }

    OnDestroy {
      runOnMain { stopRecognitionInternal() }
    }
  }

  // MARK: - Private

  private fun resolvePermissions(promise: Promise, micGranted: Boolean) {
    // Android has no separate "speech recognition" permission as iOS does; the
    // mic grant plus an available recognizer is sufficient. Report `speech` as
    // whether on-device recognition is available so JS can treat both alike.
    val speechAvailable = SpeechRecognizer.isRecognitionAvailable(context)
    promise.resolve(
      mapOf(
        "speech" to (speechAvailable && micGranted),
        "microphone" to micGranted
      )
    )
  }

  private fun startRecognitionInternal() {
    stopRecognitionInternal()

    if (!SpeechRecognizer.isRecognitionAvailable(context)) {
      throw IllegalStateException("Speech recognition is not available on this device")
    }

    sessionEnded = false
    val recognizer = SpeechRecognizer.createSpeechRecognizer(context)
    recognizer.setRecognitionListener(object : RecognitionListener {
      override fun onReadyForSpeech(params: Bundle?) {}
      override fun onBeginningOfSpeech() {}
      override fun onRmsChanged(rmsdB: Float) {}
      override fun onBufferReceived(buffer: ByteArray?) {}
      override fun onEndOfSpeech() {}

      override fun onPartialResults(partialResults: Bundle?) {
        val text = firstResult(partialResults) ?: return
        emit(text, isFinal = false)
      }

      override fun onResults(results: Bundle?) {
        if (sessionEnded) return
        val text = firstResult(results) ?: ""
        sessionEnded = true
        emit(text, isFinal = true)
        stopRecognitionInternal()
      }

      override fun onError(error: Int) {
        if (sessionEnded) return
        sessionEnded = true
        emit("", isFinal = true, error = errorMessage(error))
        stopRecognitionInternal()
      }

      override fun onEvent(eventType: Int, params: Bundle?) {}
    })

    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
      putExtra(
        RecognizerIntent.EXTRA_LANGUAGE_MODEL,
        RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
      )
      // Prefer the device locale; the recognizer falls back on its own if unset.
      putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
      putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
    }

    speechRecognizer = recognizer
    recognizer.startListening(intent)
  }

  private fun stopRecognitionInternal() {
    speechRecognizer?.let { recognizer ->
      try {
        recognizer.stopListening()
        recognizer.cancel()
        recognizer.destroy()
      } catch (_: Exception) {
        // Recognizer may already be torn down; nothing actionable.
      }
    }
    speechRecognizer = null
  }

  private fun emit(transcript: String, isFinal: Boolean, error: String? = null) {
    val payload = mutableMapOf<String, Any>(
      "transcript" to transcript,
      "isFinal" to isFinal
    )
    if (error != null) payload["error"] = error
    sendEvent(ON_TRANSCRIPT_UPDATE, payload)
  }

  private fun firstResult(bundle: Bundle?): String? {
    val matches = bundle?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
    return matches?.firstOrNull()
  }

  private fun errorMessage(error: Int): String = when (error) {
    SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
    SpeechRecognizer.ERROR_CLIENT -> "Client side error"
    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
    SpeechRecognizer.ERROR_NETWORK -> "Network error"
    SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
    SpeechRecognizer.ERROR_NO_MATCH -> "No speech matched"
    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognizer is busy"
    SpeechRecognizer.ERROR_SERVER -> "Server error"
    SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input"
    else -> "Unknown recognition error ($error)"
  }

  private fun runOnMain(block: () -> Unit) {
    val activity = currentActivity
    if (activity != null) {
      activity.runOnUiThread(block)
    } else {
      block()
    }
  }
}
