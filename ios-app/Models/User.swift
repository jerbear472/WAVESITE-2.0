import Foundation

struct User: Identifiable, Codable {
    let id: UUID
    let email: String
    let username: String
    let currentLevel: Int
    let totalXP: Int
    let currentStreak: Int
    let trendsSpotted: Int
    let accuracyScore: Double
    
    var levelProgress: Double {
        // XP needed per level increases by 500 each level
        let xpForCurrentLevel = currentLevel * 500
        let xpProgress = totalXP % 500
        return Double(xpProgress) / 500.0
    }
}