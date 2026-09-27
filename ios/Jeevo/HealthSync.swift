import HealthKit

// Reads today's steps and active energy, last night's sleep and resting heart rate, and sends them to the hub.
final class HealthSync {
  static let shared = HealthSync()
  private let store = HKHealthStore()
  private let reads: Set<HKObjectType> = [HKQuantityType(.stepCount), HKQuantityType(.activeEnergyBurned), HKQuantityType(.restingHeartRate), HKCategoryType(.sleepAnalysis)]

  func syncNow() async -> String {
    guard HKHealthStore.isHealthDataAvailable() else { return "Health isn't available on this device." }
    do {
      try await store.requestAuthorization(toShare: [], read: reads)
      let start = Calendar.current.startOfDay(for: Date())
      let today = HKQuery.predicateForSamples(withStart: start, end: Date())
      let steps = try await sum(.stepCount, unit: .count(), today)
      let kcal = try await sum(.activeEnergyBurned, unit: .kilocalorie(), today)
      let sleep = try await sleepHours(since: start.addingTimeInterval(-12 * 3600))
      let rhr = try await latest(.restingHeartRate, unit: HKUnit.count().unitDivided(by: .minute()))
      var data: [String: Any] = ["steps": Int(steps), "activeKcal": Int(kcal), "sleepHours": (sleep * 10).rounded() / 10]
      if let rhr { data["restingHR"] = Int(rhr) }
      _ = try await Hub.saved.input(kind: "health", data: data)
      return "Synced: \(Int(steps)) steps, \(String(format: "%.1f", sleep)) h sleep."
    } catch { return "Health sync failed: \(error.localizedDescription)" }
  }
  private func sum(_ id: HKQuantityTypeIdentifier, unit: HKUnit, _ p: NSPredicate) async throws -> Double {
    let d = HKStatisticsQueryDescriptor(predicate: .quantitySample(type: HKQuantityType(id), predicate: p), options: .cumulativeSum)
    return try await d.result(for: store)?.sumQuantity()?.doubleValue(for: unit) ?? 0
  }
  private func latest(_ id: HKQuantityTypeIdentifier, unit: HKUnit) async throws -> Double? {
    let d = HKSampleQueryDescriptor(predicates: [.quantitySample(type: HKQuantityType(id))], sortDescriptors: [SortDescriptor(\.endDate, order: .reverse)], limit: 1)
    return try await d.result(for: store).first?.quantity.doubleValue(for: unit)
  }
  private func sleepHours(since: Date) async throws -> Double {
    let p = HKQuery.predicateForSamples(withStart: since, end: Date())
    let d = HKSampleQueryDescriptor(predicates: [.categorySample(type: HKCategoryType(.sleepAnalysis), predicate: p)], sortDescriptors: [])
    let asleep: Set<Int> = [HKCategoryValueSleepAnalysis.asleepCore.rawValue, HKCategoryValueSleepAnalysis.asleepDeep.rawValue, HKCategoryValueSleepAnalysis.asleepREM.rawValue, HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue]
    return try await d.result(for: store).filter { asleep.contains($0.value) }.reduce(0) { $0 + $1.endDate.timeIntervalSince($1.startDate) } / 3600
  }
}
