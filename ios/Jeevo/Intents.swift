import AppIntents

// Siri and Shortcuts: "Ask Jeevo", "Remind me with Jeevo", "Tell Jeevo". They run without opening the app.
struct AskJeevo: AppIntent {
  static var title: LocalizedStringResource = "Ask Jeevo"
  static var description = IntentDescription("Ask your Jeevo anything: your day, the scooter, orders, what you told it.")
  @Parameter(title: "Question", requestValueDialog: "What do you want to ask?") var question: String
  func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
    let r = try await Hub.saved.input(kind: "voice", text: question)
    let line = r.line ?? "Done."
    return .result(value: line, dialog: IntentDialog(stringLiteral: line))
  }
}

struct RemindWithJeevo: AppIntent {
  static var title: LocalizedStringResource = "Remind me with Jeevo"
  static var description = IntentDescription("A reminder that reaches your tablet, iPhone and keychain.")
  @Parameter(title: "What and when", requestValueDialog: "What should I remind you about, and when?") var what: String
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let r = try await Hub.saved.input(kind: "voice", text: "remind me to " + what)
    return .result(dialog: IntentDialog(stringLiteral: r.line ?? "Okay."))
  }
}

struct TellJeevo: AppIntent {
  static var title: LocalizedStringResource = "Tell Jeevo"
  static var description = IntentDescription("Log a note, a feeling or a win.")
  @Parameter(title: "Note", requestValueDialog: "What should I remember?") var note: String
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let r = try await Hub.saved.input(kind: "voice", text: "remember " + note)
    return .result(dialog: IntentDialog(stringLiteral: r.line ?? "Saved."))
  }
}

struct JeevoShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(intent: AskJeevo(), phrases: ["Ask \(.applicationName)", "Talk to \(.applicationName)"], shortTitle: "Ask Jeevo", systemImageName: "bubble.left.and.bubble.right")
    AppShortcut(intent: RemindWithJeevo(), phrases: ["Remind me with \(.applicationName)"], shortTitle: "Remind", systemImageName: "bell")
    AppShortcut(intent: TellJeevo(), phrases: ["Tell \(.applicationName)", "Note to \(.applicationName)"], shortTitle: "Tell Jeevo", systemImageName: "square.and.pencil")
  }
}
