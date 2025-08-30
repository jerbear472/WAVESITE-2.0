import Foundation

struct Trend: Identifiable, Codable {
    let id: String
    let title: String
    let description: String
    let platform: String
    let category: String
    let postUrl: String?
    let thumbnailUrl: String?
    let screenshotUrl: String?
    let creatorHandle: String?
    let spotterId: String
    let spotterUsername: String?
    let status: String
    let validationCount: Int
    let createdAt: Date
    
    // Metadata
    let velocity: String?
    let size: String?
    let aiAngle: String?
    let sentiment: Int?
    let audienceAge: [String]?
    let hashtags: [String]?
    let viewsCount: Int?
    let likesCount: Int?
    let commentsCount: Int?
    let drivingGeneration: String?
    let trendOrigin: String?
    let evolutionStatus: String?
    
    // Predictions
    var predictions: [String: Int]?
    
    enum CodingKeys: String, CodingKey {
        case id, title, description, platform, category, status, hashtags
        case postUrl = "post_url"
        case thumbnailUrl = "thumbnail_url"
        case screenshotUrl = "screenshot_url"
        case creatorHandle = "creator_handle"
        case spotterId = "spotter_id"
        case spotterUsername = "spotter_username"
        case validationCount = "validation_count"
        case createdAt = "created_at"
        case velocity = "trend_velocity"
        case size = "trend_size"
        case aiAngle = "ai_angle"
        case sentiment
        case audienceAge = "audience_age"
        case viewsCount = "views_count"
        case likesCount = "likes_count"
        case commentsCount = "comments_count"
        case drivingGeneration = "driving_generation"
        case trendOrigin = "trend_origin"
        case evolutionStatus = "evolution_status"
        case predictions
    }
}

// MARK: - Mock Data
extension Trend {
    static let mockTrends: [Trend] = [
        Trend(
            id: UUID().uuidString,
            title: "Silent Walking",
            description: "Gen Z ditches podcasts and music for mindful walks in complete silence",
            platform: "TikTok",
            category: "Lifestyle",
            postUrl: nil,
            thumbnailUrl: nil,
            screenshotUrl: nil,
            creatorHandle: "@mindfulwalker",
            spotterId: "user123",
            spotterUsername: "TrendSpotter",
            status: "submitted",
            validationCount: 0,
            createdAt: Date(),
            velocity: "Picking Up",
            size: "Niche",
            aiAngle: "wellness",
            sentiment: 85,
            audienceAge: ["18-24", "25-34"],
            hashtags: ["silentwalking", "mindfulness", "mentalhealth"],
            viewsCount: 45000,
            likesCount: 8900,
            commentsCount: 342,
            drivingGeneration: "gen_z",
            trendOrigin: "organic",
            evolutionStatus: "original",
            predictions: nil
        ),
        Trend(
            id: UUID().uuidString,
            title: "Deinfluencing",
            description: "Creators actively telling followers NOT to buy trending products",
            platform: "Instagram",
            category: "Fashion",
            postUrl: nil,
            thumbnailUrl: nil,
            screenshotUrl: nil,
            creatorHandle: "@honestreviewer",
            spotterId: "user456",
            spotterUsername: "CultureWatch",
            status: "submitted",
            validationCount: 0,
            createdAt: Date(),
            velocity: "Going Viral",
            size: "Viral",
            aiAngle: "authenticity",
            sentiment: 92,
            audienceAge: ["25-34", "35-44"],
            hashtags: ["deinfluencing", "honestreviews", "sustainability"],
            viewsCount: 230000,
            likesCount: 45000,
            commentsCount: 2100,
            drivingGeneration: "millennials",
            trendOrigin: "influencer",
            evolutionStatus: "variants",
            predictions: nil
        ),
        Trend(
            id: UUID().uuidString,
            title: "AI Therapy Sessions",
            description: "People using ChatGPT as their personal therapist and life coach",
            platform: "Twitter",
            category: "Tech",
            postUrl: nil,
            thumbnailUrl: nil,
            screenshotUrl: nil,
            creatorHandle: "@techtherapy",
            spotterId: "user789",
            spotterUsername: "FutureSeer",
            status: "submitted",
            validationCount: 0,
            createdAt: Date(),
            velocity: "Just Starting",
            size: "Micro",
            aiAngle: "ai_powered",
            sentiment: 68,
            audienceAge: ["18-24"],
            hashtags: ["aitherapy", "chatgpttherapist", "mentaltech"],
            viewsCount: 12000,
            likesCount: 890,
            commentsCount: 156,
            drivingGeneration: "gen_z",
            trendOrigin: "organic",
            evolutionStatus: "original",
            predictions: nil
        )
    ]
}