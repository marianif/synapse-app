import UIKit
import UniformTypeIdentifiers

// MARK: - Share Extension
//
// Synapse's entry in the iOS share sheet. It presents no UI of its own: it
// extracts the shared link (plus the page title when the source app supplies
// one) or a shared text selection, writes it into the App Group container, and
// dismisses.
//
// The app picks the payload up on next foreground (see hooks/use-shared-intake.ts)
// and routes it through the normal JS path — useDiary().addEntry via
// DatabaseContext — so widget sync and notifications stay consistent. A
// Swift-side SQLite write would bypass all of that.
//
// Why App Group rather than a deep link: an extension can only launch its host
// app by walking the responder chain for `openURL:`, which iOS has progressively
// restricted and which fails silently when it doesn't work. Writing to shared
// storage has no such dependency.

class ShareViewController: UIViewController {

  /// Must match the group in app.json and targets/share/expo-target.config.js.
  private let appGroup = "group.dev.the-wedge.synapse-app"
  /// Key the JS side reads. Keep in sync with hooks/use-shared-intake.ts.
  private let payloadKey = "shared_incoming"

  private var didHandle = false
  private var didComplete = false

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    guard !didHandle else { return }
    didHandle = true

    // Watchdog: if a provider never calls back, dismiss anyway rather than
    // leaving the user stuck staring at the share sheet.
    DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) { [weak self] in
      guard let self, !self.didComplete else { return }
      NSLog("[SynapseShare] watchdog fired — completing without payload")
      self.complete()
    }

    handleShare()
  }

  // MARK: - Payload resolution

  private func handleShare() {
    guard
      let item = extensionContext?.inputItems.first as? NSExtensionItem,
      let providers = item.attachments
    else {
      NSLog("[SynapseShare] no input items")
      return complete()
    }

    // Prefer a URL attachment (shared article/link); fall back to plain text.
    if let urlProvider = providers.first(where: {
      $0.hasItemConformingToTypeIdentifier(UTType.url.identifier)
    }) {
      urlProvider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] value, _ in
        let url = (value as? URL)?.absoluteString
        // attributedContentText is usually the page title.
        let title = item.attributedContentText?.string
        self?.save(self?.buildPayload(title: title, url: url))
      }
      return
    }

    if let textProvider = providers.first(where: {
      $0.hasItemConformingToTypeIdentifier(UTType.plainText.identifier)
    }) {
      textProvider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] value, _ in
        self?.save(self?.buildPayload(title: nil, url: value as? String))
      }
      return
    }

    NSLog("[SynapseShare] no url or text attachment")
    complete()
  }

  /// Compose the note seed. A link becomes "title\nurl"; bare text passes through.
  private func buildPayload(title: String?, url: String?) -> String? {
    let parts = [title, url]
      .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
      .filter { !$0.isEmpty }
    return parts.isEmpty ? nil : parts.joined(separator: "\n")
  }

  // MARK: - Hand-off

  /// Write to the shared container, then dismiss.
  ///
  /// `loadItem` calls back on a background queue, so this hops to main before
  /// touching `extensionContext`. The write happens *inside* the async callback
  /// (not after it) — completing the request outside would let the extension
  /// tear down before the payload lands.
  private func save(_ payload: String?) {
    DispatchQueue.main.async { [weak self] in
      guard let self, !self.didComplete else { return }

      if let payload, let defaults = UserDefaults(suiteName: self.appGroup) {
        // Stored as an array so several shares queued while the app is closed
        // all survive instead of overwriting each other.
        var queue = defaults.stringArray(forKey: self.payloadKey) ?? []
        queue.append(payload)
        defaults.set(queue, forKey: self.payloadKey)
        NSLog("[SynapseShare] saved payload (queue depth %d)", queue.count)
      } else {
        NSLog("[SynapseShare] nothing to save (payload nil or app group unavailable)")
      }

      self.complete()
    }
  }

  private func complete() {
    guard !didComplete else { return }
    didComplete = true
    extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
  }
}
