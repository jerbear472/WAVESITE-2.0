import SwiftUI

struct EmptyStateView: View {
    let icon: String
    let title: String
    let subtitle: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: icon)
                .font(.system(size: 60))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.blue.opacity(0.6), .purple.opacity(0.6)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            
            VStack(spacing: 8) {
                Text(title)
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Text(subtitle)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            
            if let actionTitle = actionTitle, let action = action {
                Button(action: action) {
                    Text(actionTitle)
                        .fontWeight(.medium)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(
                            Capsule()
                                .fill(
                                    LinearGradient(
                                        colors: [.blue, .purple],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                        )
                        .foregroundColor(.white)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct TrendRowView: View {
    let trend: Trend
    
    var body: some View {
        HStack(spacing: 12) {
            // Thumbnail
            RoundedRectangle(cornerRadius: 8)
                .fill(
                    LinearGradient(
                        colors: [.blue.opacity(0.3), .purple.opacity(0.3)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 60, height: 60)
                .overlay(
                    Image(systemName: platformIcon)
                        .font(.title2)
                        .foregroundColor(.white.opacity(0.8))
                )
            
            VStack(alignment: .leading, spacing: 4) {
                Text(trend.title)
                    .font(.headline)
                    .lineLimit(1)
                
                Text(trend.platform)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                HStack(spacing: 8) {
                    if let velocity = trend.velocity {
                        Label(velocity, systemImage: "arrow.up.right")
                            .font(.caption2)
                            .foregroundColor(.orange)
                    }
                    
                    if let viewsCount = trend.viewsCount {
                        Label(formatNumber(viewsCount), systemImage: "eye")
                            .font(.caption2)
                            .foregroundColor(.blue)
                    }
                }
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.secondarySystemBackground))
        )
    }
    
    private var platformIcon: String {
        switch trend.platform.lowercased() {
        case "tiktok": return "music.note"
        case "instagram": return "camera"
        case "twitter", "x": return "bubble.left"
        case "youtube": return "play.rectangle"
        default: return "globe"
        }
    }
    
    private func formatNumber(_ num: Int) -> String {
        if num >= 1000000 {
            return "\(num / 1000000)M"
        } else if num >= 1000 {
            return "\(num / 1000)K"
        }
        return "\(num)"
    }
}

struct TrendsListView: View {
    var body: some View {
        List {
            ForEach(Trend.mockTrends) { trend in
                TrendRowView(trend: trend)
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
            }
        }
        .listStyle(PlainListStyle())
        .navigationTitle("All Trends")
        .navigationBarTitleDisplayMode(.inline)
    }
}