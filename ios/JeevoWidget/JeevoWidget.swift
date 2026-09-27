import WidgetKit
import SwiftUI
import AppIntents

// Home Screen and Lock Screen widget: mood, the next thing on your plan, and the scooter.
// Long-press → Edit Widget to set the hub address and token (widgets can't see the app's settings on a free Apple ID).
struct HubConfig: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Jeevo hub"
  @Parameter(title: "Hub address", default: "http://jeevo-fire7:8047") var url: String
  @Parameter(title: "Token", default: "") var token: String
}

struct Entry: TimelineEntry { let date: Date; let mood: String; let next: String; let soc: String; let tasks: Int }

struct Provider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> Entry { Entry(date: .now, mood: "Content", next: "10:30 Design crit", soc: "63%", tasks: 3) }
  func snapshot(for c: HubConfig, in context: Context) async -> Entry { await load(c) }
  func timeline(for c: HubConfig, in context: Context) async -> Timeline<Entry> {
    Timeline(entries: [await load(c)], policy: .after(.now.addingTimeInterval(15 * 60)))
  }
  private func load(_ c: HubConfig) async -> Entry {
    do {
      let t = try await Hub(url: c.url, token: c.token).today()
      let f = DateFormatter(); f.dateFormat = "HH:mm"; f.timeZone = TimeZone(identifier: "Asia/Kolkata")
      let now = f.string(from: .now)
      let next = t.plan?.blocks?.first(where: { $0.time >= now }).map { "\($0.time) \($0.title)" } ?? (t.tasks?.first?.title ?? "Nothing next")
      let soc = t.scooter?.soc.map { "\(Int($0))%" } ?? "—"
      return Entry(date: .now, mood: t.mood ?? "", next: next, soc: soc, tasks: t.tasks?.count ?? 0)
    } catch { return Entry(date: .now, mood: "Offline", next: "Can't reach the hub", soc: "—", tasks: 0) }
  }
}

struct JeevoWidgetView: View {
  var e: Entry
  @Environment(\.widgetFamily) var family
  var body: some View {
    if family == .accessoryRectangular {
      VStack(alignment: .leading) { Text("JEEVO · \(e.mood)").font(.caption2).bold(); Text(e.next).font(.caption).lineLimit(1); Text("Scooter \(e.soc)").font(.caption2) }
    } else {
      VStack(alignment: .leading, spacing: 6) {
        HStack { RoundedRectangle(cornerRadius: 4).frame(width: 9, height: 14); RoundedRectangle(cornerRadius: 4).frame(width: 9, height: 14); Spacer(); Text(e.mood.uppercased()).font(.caption2).foregroundStyle(.secondary) }
        Spacer()
        Text(e.next).font(.headline).lineLimit(2)
        HStack { Label(e.soc, systemImage: "scooter"); Spacer(); Label("\(e.tasks)", systemImage: "checklist") }.font(.caption).foregroundStyle(.secondary)
      }.foregroundStyle(.white)
    }
  }
}

@main
struct JeevoWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: "JeevoWidget", intent: HubConfig.self, provider: Provider()) { e in
      JeevoWidgetView(e: e).containerBackground(.black, for: .widget)
    }
    .configurationDisplayName("Jeevo").description("Your next thing, the scooter, and how Jeevo feels.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
  }
}
