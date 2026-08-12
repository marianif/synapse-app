import UIKit
import UniformTypeIdentifiers
import UserNotifications

// MARK: - Share Extension
//
// Synapse's entry in the iOS share sheet. It shows a small Field Lab-styled
// confirmation card (graphite paper, cyan capture dot) while it extracts the
// shared link (plus the page title when the source app supplies one) or a
// shared text selection, writes it into the App Group container, and asks the
// host to foreground the app.
//
// The app picks the payload up on next foreground (see hooks/use-shared-intake.ts)
// and routes it through the normal JS path — useDiary().addEntry via
// DatabaseContext — so widget sync and notifications stay consistent. A
// Swift-side SQLite write would bypass all of that.
//
// Two channels, two responsibilities:
// - The App Group write is the durable channel. It survives foreground failures
//   and queued shares while the app is closed, with no dependency on deep links.
// - Foregrounding is best-effort: the extension asks the HOST (the app
//   presenting the share sheet) to open the `synapseapp` scheme via
//   `NSExtensionContext.openURL(_:completionHandler:)` — the public API for
//   "open a URL on the extension's behalf". The host is a normal app process,
//   so it can open the scheme and iOS routes it to Synapse. If the host reports
//   failure, we fall back to a local notification so the capture isn't silent.

class ShareViewController: UIViewController {

  // Field Lab tokens (mirrors constants/theme.ts — dark scheme, the extension
  // has no access to the app's color-scheme preference so it fixes dark, which
  // matches the share sheet's own chrome).
  private enum FieldLab {
    static let paper = UIColor(red: 0x17 / 255, green: 0x1A / 255, blue: 0x20 / 255, alpha: 1) // color.dark.paper
    static let surface = UIColor(red: 0x1F / 255, green: 0x24 / 255, blue: 0x2C / 255, alpha: 1) // color.dark.surface
    static let ink = UIColor(red: 0xE9 / 255, green: 0xED / 255, blue: 0xF3 / 255, alpha: 1) // color.dark.ink
    static let inkMuted = UIColor(red: 0x8A / 255, green: 0x93 / 255, blue: 0xA3 / 255, alpha: 1) // color.dark.inkMuted
    static let todo = UIColor(red: 0x22 / 255, green: 0xD3 / 255, blue: 0xEE / 255, alpha: 1) // color.type.todo
  }

  private let statusLabel = UILabel()
  private let captureDot = UIView()

  /// Must match the group in app.json and targets/share/expo-target.config.js.
  private let appGroup = "group.dev.the-wedge.synapse-app"
  /// Key the JS side reads. Keep in sync with hooks/use-shared-intake.ts.
  private let payloadKey = "shared_incoming"
  /// Foregrounds the app on the Notes tab, where the drained payload seeds the
  /// composer. Must match the app's `scheme` in app.json and the Notes route
  /// (app/(tabs)/notes.tsx).
  private let foregroundURL = URL(string: "synapseapp://notes")!

  private var didHandle = false
  private var didComplete = false

  override func viewDidLoad() {
    super.viewDidLoad()
    buildUI()
  }

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

  // MARK: - UI

  /// Small Field Lab card: capture dot + status line, centered on a graphite
  /// sheet. Programmatic (no storyboard) so the extension stays lightweight.
  private func buildUI() {
    view.backgroundColor = FieldLab.paper

    let card = UIView()
    card.backgroundColor = FieldLab.surface
    card.layer.cornerRadius = 14 // radius.lg
    card.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(card)

    captureDot.backgroundColor = FieldLab.todo
    captureDot.layer.cornerRadius = 5
    captureDot.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(captureDot)

    let titleLabel = UILabel()
    titleLabel.text = "SYNAPSE"
    titleLabel.font = UIFont.monospacedSystemFont(ofSize: 11, weight: .semibold)
    titleLabel.textColor = FieldLab.todo
    titleLabel.translatesAutoresizingMaskIntoConstraints = false

    statusLabel.text = "Capturing…"
    statusLabel.font = UIFont.systemFont(ofSize: 16, weight: .medium)
    statusLabel.textColor = FieldLab.ink
    statusLabel.numberOfLines = 2
    statusLabel.translatesAutoresizingMaskIntoConstraints = false

    let subtitleLabel = UILabel()
    subtitleLabel.text = "Saving to your Notes"
    subtitleLabel.font = UIFont.systemFont(ofSize: 13, weight: .regular)
    subtitleLabel.textColor = FieldLab.inkMuted
    subtitleLabel.translatesAutoresizingMaskIntoConstraints = false

    let textStack = UIStackView(arrangedSubviews: [titleLabel, statusLabel, subtitleLabel])
    textStack.axis = .vertical
    textStack.spacing = 6
    textStack.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(textStack)

    NSLayoutConstraint.activate([
      card.centerYAnchor.constraint(equalTo: view.centerYAnchor),
      card.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
      card.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),

      captureDot.widthAnchor.constraint(equalToConstant: 10),
      captureDot.heightAnchor.constraint(equalToConstant: 10),
      captureDot.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
      captureDot.centerYAnchor.constraint(equalTo: textStack.centerYAnchor),

      textStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 20),
      textStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -20),
      textStack.leadingAnchor.constraint(equalTo: captureDot.trailingAnchor, constant: 14),
      textStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20),
    ])
  }

  /// Update the card's status line as the capture resolves. Cross-fades so the
  /// brief lifecycle (capturing → saved) still reads as intentional UI rather
  /// than a stuck screen.
  private func setStatus(_ text: String) {
    UIView.transition(with: statusLabel, duration: 0.18, options: .transitionCrossDissolve) {
      self.statusLabel.text = text
    }
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

  /// Write to the shared container, then ask the host to foreground the app.
  ///
  /// `loadItem` calls back on a background queue, so this hops to main before
  /// touching `extensionContext`. The write happens *inside* the async callback
  /// (not after it) — completing the request outside would let the extension
  /// tear down before the payload lands.
  private func save(_ payload: String?) {
    DispatchQueue.main.async { [weak self] in
      guard let self, !self.didComplete else { return }

      var saved = false
      if let payload, let defaults = UserDefaults(suiteName: self.appGroup) {
        // Stored as an array so several shares queued while the app is closed
        // all survive instead of overwriting each other.
        var queue = defaults.stringArray(forKey: self.payloadKey) ?? []
        queue.append(payload)
        defaults.set(queue, forKey: self.payloadKey)
        NSLog("[SynapseShare] saved payload (queue depth %d)", queue.count)
        saved = true
      } else {
        NSLog("[SynapseShare] nothing to save (payload nil or app group unavailable)")
      }

      // Only foreground when there is something to hand off — an empty capture
      // has no reason to interrupt the user.
      if saved {
        self.setStatus("Saved to Synapse")
        self.foregroundHostApp()
      } else {
        self.setStatus("Nothing to save")
        self.completeAfterConfirmation()
      }
    }
  }

  /// Ask the host (the app presenting the share sheet) to open the app's URL
  /// scheme, foregrounding Synapse on the Notes tab. The completion handler
  /// reports whether the host honored the request; when it reports failure,
  /// fall back to a local notification so the user knows the capture landed.
  /// If the host never calls back, the watchdog in `viewDidAppear` still
  /// dismisses the sheet.
  private func foregroundHostApp() {
    extensionContext?.open(foregroundURL) { [weak self] success in
      guard let self else { return }
      if !success {
        NSLog("[SynapseShare] host refused to open URL — posting fallback notification")
        self.postFallbackNotification()
      }
      self.completeAfterConfirmation()
    }
  }

  /// Hold the "Saved" card on screen briefly so the confirmation is legible
  /// before the sheet dismisses, instead of vanishing the instant the write
  /// finishes. Short enough to stay out of the user's way.
  private func completeAfterConfirmation() {
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
      self?.complete()
    }
  }

  /// Last-resort signal: the payload is safe in the App Group, and the
  /// notification (which the containing app owns — permission is requested at
  /// first launch) at least tells the user the capture succeeded. Tapping it
  /// foregrounds Synapse.
  private func postFallbackNotification() {
    let content = UNMutableNotificationContent()
    content.title = "Saved to Synapse"
    content.body = "Your shared note is waiting on the Notes tab."
    content.sound = .default
    let request = UNNotificationRequest(
      identifier: UUID().uuidString,
      content: content,
      trigger: nil
    )
    UNUserNotificationCenter.current().add(request) { error in
      if let error {
        NSLog("[SynapseShare] fallback notification failed: %@", error.localizedDescription)
      }
    }
  }

  private func complete() {
    guard !didComplete else { return }
    didComplete = true
    extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
  }
}
