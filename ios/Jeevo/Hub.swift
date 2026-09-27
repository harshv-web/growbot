import Foundation

// Talks to your Jeevo hub (the Fire 7). The same code is used by the app, Siri and the widget.
struct HubReply: Decodable { let line: String?; let deep: String? }
struct Today: Decodable {
  struct Plan: Decodable { let headline: String?; let blocks: [Block]? }
  struct Block: Decodable { let time: String; let title: String }
  struct Scooter: Decodable { let soc: Double?; let rangeKm: Double?; let charging: Bool? }
  struct Task: Decodable { let title: String }
  let mood: String?; let plan: Plan?; let scooter: Scooter?; let tasks: [Task]?; let needsYou: Int?
}

struct Hub {
  var url: String
  var token: String
  static var saved: Hub {
    let d = UserDefaults.standard
    return Hub(url: d.string(forKey: "hubURL") ?? "http://jeevo-fire7:8047", token: d.string(forKey: "hubToken") ?? "")
  }
  private func request(_ path: String, body: [String: Any]? = nil) throws -> URLRequest {
    guard let u = URL(string: url.trimmingCharacters(in: CharacterSet(charactersIn: "/ ")) + path) else { throw URLError(.badURL) }
    var r = URLRequest(url: u, timeoutInterval: 25)
    if !token.isEmpty { r.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
    if let body {
      r.httpMethod = "POST"
      r.setValue("application/json", forHTTPHeaderField: "Content-Type")
      r.httpBody = try JSONSerialization.data(withJSONObject: body)
    }
    return r
  }
  func input(kind: String, text: String = "", data: [String: Any]? = nil) async throws -> HubReply {
    var b: [String: Any] = ["kind": kind, "text": text, "from": "iphone-app"]
    if let data { b["data"] = data }
    let (d, _) = try await URLSession.shared.data(for: try request("/input", body: b))
    return try JSONDecoder().decode(HubReply.self, from: d)
  }
  func today() async throws -> Today {
    let (d, _) = try await URLSession.shared.data(for: try request("/api/today"))
    return try JSONDecoder().decode(Today.self, from: d)
  }
  var appURL: URL? { URL(string: url.trimmingCharacters(in: CharacterSet(charactersIn: "/ ")) + "/app/" + (token.isEmpty ? "" : "?token=\(token)") + "#today") }
}
