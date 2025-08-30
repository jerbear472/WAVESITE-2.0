import SwiftUI

struct PredictionsView: View {
    @State private var trends: [Trend] = Trend.mockTrends
    @State private var selectedFilter = "All"
    let filters = ["All", "Rising", "Peaking", "Declining"]
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Filter Pills
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(filters, id: \.self) { filter in
                                FilterPill(
                                    title: filter,
                                    isSelected: selectedFilter == filter,
                                    action: { selectedFilter = filter }
                                )
                            }
                        }
                        .padding(.horizontal)
                    }
                    
                    // Trends Grid
                    LazyVStack(spacing: 16) {
                        ForEach(filteredTrends) { trend in
                            PredictionCard(trend: trend)
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Predictions")
            .navigationBarTitleDisplayMode(.large)
        }
    }
    
    private var filteredTrends: [Trend] {
        switch selectedFilter {
        case "Rising":
            return trends.filter { $0.velocity == "Picking Up" }
        case "Peaking":
            return trends.filter { $0.velocity == "Going Viral" }
        case "Declining":
            return trends.filter { $0.velocity == "Saturated" }
        default:
            return trends
        }
    }
}

struct PredictionCard: View {
    let trend: Trend
    @State private var selectedPrediction: String?
    @State private var hasVoted = false
    
    let predictions = [
        ("🌊", "Next Wave", "1-2 weeks"),
        ("🔥", "Hot Now", "Peak"),
        ("📉", "Declining", "Past peak"),
        ("💀", "Dead", "Over")
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(trend.title)
                        .font(.headline)
                    
                    HStack(spacing: 8) {
                        Label(trend.platform, systemImage: "apps.iphone")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        if let velocity = trend.velocity {
                            Text("•")
                                .foregroundColor(.secondary)
                            
                            Label(velocity, systemImage: "arrow.up.right")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                    }
                }
                
                Spacer()
                
                if hasVoted {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                }
            }
            
            // Description
            Text(trend.description)
                .font(.body)
                .foregroundColor(.secondary)
                .lineLimit(2)
            
            // Voting Options
            VStack(spacing: 12) {
                Text("When will this peak?")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ForEach(predictions, id: \.1) { emoji, title, timing in
                        PredictionButton(
                            emoji: emoji,
                            title: title,
                            subtitle: timing,
                            isSelected: selectedPrediction == title,
                            isDisabled: hasVoted && selectedPrediction != title,
                            action: {
                                if !hasVoted {
                                    selectedPrediction = title
                                    withAnimation {
                                        hasVoted = true
                                    }
                                }
                            }
                        )
                    }
                }
            }
            
            // Current Votes (if voted)
            if hasVoted {
                VoteResultsBar()
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.05), radius: 10)
        )
    }
}

struct PredictionButton: View {
    let emoji: String
    let title: String
    let subtitle: String
    let isSelected: Bool
    let isDisabled: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text(emoji)
                    .font(.title2)
                
                Text(title)
                    .font(.caption)
                    .fontWeight(isSelected ? .semibold : .regular)
                
                Text(subtitle)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? 
                          Color.blue.opacity(0.15) : 
                          Color.gray.opacity(0.05)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 2)
                    )
            )
            .opacity(isDisabled ? 0.5 : 1.0)
        }
        .disabled(isDisabled)
    }
}

struct VoteResultsBar: View {
    let results = [
        ("Next Wave", 0.35, Color.blue),
        ("Hot Now", 0.45, Color.orange),
        ("Declining", 0.15, Color.yellow),
        ("Dead", 0.05, Color.gray)
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Community Predictions")
                .font(.caption)
                .foregroundColor(.secondary)
            
            HStack(spacing: 2) {
                ForEach(results, id: \.0) { name, percentage, color in
                    Rectangle()
                        .fill(color)
                        .frame(width: max(20, CGFloat(percentage * 300)))
                        .overlay(
                            Text("\(Int(percentage * 100))%")
                                .font(.caption2)
                                .foregroundColor(.white)
                                .opacity(percentage > 0.1 ? 1 : 0)
                        )
                }
            }
            .frame(height: 30)
            .cornerRadius(6)
        }
    }
}

struct FilterPill: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.callout)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(isSelected ? 
                              LinearGradient(
                                colors: [.blue, .purple],
                                startPoint: .leading,
                                endPoint: .trailing
                              ) : 
                              LinearGradient(
                                colors: [Color(.systemBackground)],
                                startPoint: .leading,
                                endPoint: .trailing
                              )
                        )
                        .overlay(
                            Capsule()
                                .stroke(isSelected ? Color.clear : Color.gray.opacity(0.3), lineWidth: 1)
                        )
                )
                .foregroundColor(isSelected ? .white : .primary)
        }
    }
}

#Preview {
    PredictionsView()
}