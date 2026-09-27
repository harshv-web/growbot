import SwiftUI
import WebKit

@main
struct JeevoApp: App {
  var body: some Scene { WindowGroup { ContentView().preferredColorScheme(.dark) } }
}

struct ContentView: View {
  @AppStorage("hubURL") private var hubURL = "http://jeevo-fire7:8047"
  @AppStorage("hubToken") private var hubToken = ""
  @State private var showSettings = false
  @State private var reloadKey = UUID()
  var body: some View {
    ZStack(alignment: .topTrailing) {
      if let u = Hub(url: hubURL, token: hubToken).appURL { WebView(url: u).id(reloadKey).ignoresSafeArea() }
      Button { showSettings = true } label: { Image(systemName: "gearshape").padding(10).background(.ultraThinMaterial, in: Circle()) }
        .padding(.trailing, 14).padding(.top, 4)
    }
    .background(Color.black)
    .sheet(isPresented: $showSettings, onDismiss: { reloadKey = UUID() }) { SettingsView() }
  }
}

struct WebView: UIViewRepresentable {
  let url: URL
  func makeUIView(context: Context) -> WKWebView {
    let c = WKWebViewConfiguration(); c.allowsInlineMediaPlayback = true
    let w = WKWebView(frame: .zero, configuration: c)
    w.isOpaque = false; w.backgroundColor = .black; w.scrollView.contentInsetAdjustmentBehavior = .never
    w.load(URLRequest(url: url)); return w
  }
  func updateUIView(_ w: WKWebView, context: Context) {}
}

struct SettingsView: View {
  @AppStorage("hubURL") private var hubURL = "http://jeevo-fire7:8047"
  @AppStorage("hubToken") private var hubToken = ""
  @State private var status = ""
  var body: some View {
    NavigationStack {
      Form {
        Section("Your hub") {
          TextField("http://jeevo-fire7:8047", text: $hubURL).textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.URL)
          SecureField("HUB_TOKEN", text: $hubToken)
          Button("Test") { Task { do { let r = try await Hub(url: hubURL, token: hubToken).input(kind: "text", text: "how are you?"); status = r.line ?? "ok" } catch { status = error.localizedDescription } } }
          if !status.isEmpty { Text(status).foregroundStyle(.secondary) }
        }
        Section("Apple Health") {
          Button("Allow Health and sync now") { Task { status = await HealthSync.shared.syncNow() } }
          Text("Steps, sleep, resting heart rate and active energy go to your own hub once a day when you open the app, or via the Daily Sync Shortcut.").font(.footnote).foregroundStyle(.secondary)
        }
        Section("Siri") {
          Text("Say “Ask Jeevo” or “Remind me with Jeevo”. Add them to the Action button or Back Tap from the Shortcuts app.").font(.footnote)
        }
      }.navigationTitle("Jeevo")
    }
  }
}
