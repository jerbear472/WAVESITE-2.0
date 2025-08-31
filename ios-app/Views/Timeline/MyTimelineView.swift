import SwiftUI

struct MyTimelineView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var userTrends: [Trend] = []
    @State private var isLoading = true
    @State private var selectedFilter = "all"
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Filter Pills
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            TimelineFilterPill(title: "All", isSelected: selectedFilter == "all") {
                                selectedFilter = "all"
                            }
                            TimelineFilterPill(title: "Submitted", isSelected: selectedFilter == "submitted") {
                                selectedFilter = "submitted"
                            }
                            TimelineFilterPill(title: "Validated", isSelected: selectedFilter == "validated") {
                                selectedFilter = "validated"
                            }
                            TimelineFilterPill(title: "Trending", isSelected: selectedFilter == "trending") {
                                selectedFilter = "trending"
                            }
                        }
                        .padding(.horizontal)
                    }
                    
                    if isLoading {
                        VStack(spacing: 16) {
                            ProgressView()
                            Text("Loading your trends...")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity, minHeight: 200)
                    } else if userTrends.isEmpty {
                        EmptyTimelineView()
                    } else {
                        LazyVStack(spacing: 16) {
                            ForEach(filteredTrends) { trend in
                                TimelineTrendCard(trend: trend)
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("My Timeline")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink(destination: ProfileView()) {
                        Image(systemName: "person.circle")
                            .font(.title3)
                    }
                }
            }
        }
        .onAppear {
            loadUserTrends()
        }
    }
    
    var filteredTrends: [Trend] {
        switch selectedFilter {
        case "submitted":
            return userTrends.filter { $0.status == "submitted" }
        case "validated":
            return userTrends.filter { $0.status == "validated" }
        case "trending":
            return userTrends.filter { $0.isTrending ?? false }
        default:
            return userTrends
        }
    }
    
    private func loadUserTrends() {
        // Simulated data loading
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            self.userTrends = [
                Trend(
                    id: UUID(),
                    title: "Silent luxury becomes mainstream",
                    description: "Quiet, understated fashion replacing logo-heavy designs",
                    category: "Fashion",
                    status: "validated",
                    confidence: 85,
                    validationCount: 42,
                    submittedBy: authManager.currentUser?.username ?? "You",
                    submittedAt: Date().addingTimeInterval(-86400),
                    isTrending: true
                ),
                Trend(
                    id: UUID(),
                    title: "AI-powered personal assistants",
                    description: "Everyone will have their own AI assistant for daily tasks",
                    category: "Technology",
                    status: "submitted",
                    confidence: 72,
                    validationCount: 15,
                    submittedBy: authManager.currentUser?.username ?? "You",
                    submittedAt: Date().addingTimeInterval(-172800)
                ),
                Trend(
                    id: UUID(),
                    title: "Micro-communities replace social media",
                    description: "Small, curated groups becoming preferred over large platforms",
                    category: "Social",
                    status: "validated",
                    confidence: 78,
                    validationCount: 28,
                    submittedBy: authManager.currentUser?.username ?? "You",
                    submittedAt: Date().addingTimeInterval(-259200)
                )
            ]
            self.isLoading = false
        }
    }
}

struct TimelineTrendCard: View {
    let trend: Trend
    
    var statusColor: Color {
        switch trend.status {
        case "validated":
            return .green
        case "trending":
            return .orange
        default:
            return .blue
        }
    }
    
    var statusIcon: String {
        switch trend.status {
        case "validated":
            return "checkmark.seal.fill"
        case "trending":
            return "flame.fill"
        default:
            return "clock.fill"
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Label(trend.category, systemImage: categoryIcon(for: trend.category))
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                HStack(spacing: 4) {
                    Image(systemName: statusIcon)
                        .font(.caption)
                    Text(trend.status.capitalized)
                        .font(.caption)
                        .fontWeight(.medium)
                }
                .foregroundColor(statusColor)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(statusColor.opacity(0.15))
                .cornerRadius(8)
            }
            
            // Content
            VStack(alignment: .leading, spacing: 8) {
                Text(trend.title)
                    .font(.headline)
                    .lineLimit(2)
                
                Text(trend.description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(3)
            }
            
            // Stats
            HStack(spacing: 16) {
                Label("\(trend.confidence)% confidence", systemImage: "chart.line.uptrend.xyaxis")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Label("\(trend.validationCount) validations", systemImage: "checkmark.circle")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Text(timeAgo(from: trend.submittedAt))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            if trend.isTrending ?? false {
                HStack {
                    Image(systemName: "flame.fill")
                    Text("This trend is gaining momentum!")
                    Spacer()
                }
                .font(.caption)
                .foregroundColor(.orange)
                .padding(8)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(8)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
    
    private func categoryIcon(for category: String) -> String {
        switch category.lowercased() {
        case "technology":
            return "cpu"
        case "fashion":
            return "tshirt"
        case "food":
            return "fork.knife"
        case "social":
            return "person.3"
        case "health":
            return "heart"
        case "entertainment":
            return "tv"
        default:
            return "sparkle"
        }
    }
    
    private func timeAgo(from date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

struct EmptyTimelineView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            Text("No trends yet")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Start spotting trends to build your timeline")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            NavigationLink(destination: SpotTrendsView()) {
                Text("Spot Your First Trend")
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(
                        LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .cornerRadius(25)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, minHeight: 300)
    }
}

struct TimelineFilterPill: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundColor(isSelected ? .white : .primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    isSelected ?
                    AnyView(
                        LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    ) :
                    AnyView(Color(.systemGray5))
                )
                .cornerRadius(20)
        }
    }
}

#Preview {
    MyTimelineView()
        .environmentObject(AuthManager.shared)
}