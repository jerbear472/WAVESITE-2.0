import Foundation

struct Trend: Identifiable {
    let id: UUID
    let title: String
    let description: String
    let category: String
    let platform: String
    let status: String
    let confidence: Int
    let validationCount: Int
    let submittedBy: String
    let submittedAt: Date
    let velocity: String?
    let isTrending: Bool?
    let viewsCount: Int?
    
    init(
        id: UUID = UUID(),
        title: String,
        description: String,
        category: String,
        platform: String = "TikTok",
        status: String = "submitted",
        confidence: Int = 0,
        validationCount: Int = 0,
        submittedBy: String = "Anonymous",
        submittedAt: Date = Date(),
        velocity: String? = nil,
        isTrending: Bool? = false,
        viewsCount: Int? = nil
    ) {
        self.id = id
        self.title = title
        self.description = description
        self.category = category
        self.platform = platform
        self.status = status
        self.confidence = confidence
        self.validationCount = validationCount
        self.submittedBy = submittedBy
        self.submittedAt = submittedAt
        self.velocity = velocity
        self.isTrending = isTrending
        self.viewsCount = viewsCount
    }
    
    static var mockTrends: [Trend] {
        [
            Trend(
                title: "Silent luxury becomes mainstream",
                description: "Quiet, understated fashion replacing logo-heavy designs",
                category: "Fashion",
                status: "validated",
                confidence: 85,
                validationCount: 42,
                submittedBy: "TrendSpotter",
                velocity: "Picking Up",
                isTrending: true
            ),
            Trend(
                title: "AI-powered personal assistants",
                description: "Everyone will have their own AI assistant for daily tasks",
                category: "Technology",
                status: "submitted",
                confidence: 72,
                validationCount: 15,
                submittedBy: "TechWatcher",
                velocity: "Going Viral"
            ),
            Trend(
                title: "Micro-communities replace social media",
                description: "Small, curated groups becoming preferred over large platforms",
                category: "Social",
                status: "validated",
                confidence: 78,
                validationCount: 28,
                submittedBy: "CultureAnalyst",
                velocity: "Saturated"
            )
        ]
    }
}