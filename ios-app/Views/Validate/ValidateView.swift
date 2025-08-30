import SwiftUI

struct ValidateView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var trendQueue: [Trend] = []
    @State private var currentIndex = 0
    @State private var dragOffset = CGSize.zero
    @State private var lastVote: Vote?
    @State private var streak = 0
    @State private var todaysValidations = 0
    @State private var isLoading = true
    @State private var showingFeedback = false
    @State private var consensusPercentage: Int = 0
    
    enum Vote {
        case approve, reject
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background
                LinearGradient(
                    colors: [
                        Color.purple.opacity(0.05),
                        Color.blue.opacity(0.05),
                        Color.green.opacity(0.05)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                if isLoading {
                    ProgressView("Loading trends...")
                        .progressViewStyle(CircularProgressViewStyle())
                } else if trendQueue.isEmpty {
                    EmptyStateView(
                        icon: "checkmark.circle",
                        title: "All caught up!",
                        subtitle: "No trends need validation right now"
                    )
                } else {
                    VStack(spacing: 20) {
                        // Stats Bar
                        statsBar
                        
                        // Swipe Cards
                        ZStack {
                            ForEach(trendQueue.indices.reversed(), id: \.self) { index in
                                if index >= currentIndex && index < currentIndex + 2 {
                                    TrendValidationCard(
                                        trend: trendQueue[index],
                                        isTopCard: index == currentIndex,
                                        dragOffset: index == currentIndex ? dragOffset : .zero,
                                        onSwipe: handleSwipe
                                    )
                                    .offset(y: CGFloat(index - currentIndex) * 10)
                                    .scaleEffect(index == currentIndex ? 1.0 : 0.95)
                                    .opacity(index == currentIndex ? 1.0 : 0.7)
                                    .animation(.spring(), value: currentIndex)
                                    .gesture(
                                        index == currentIndex ? dragGesture : nil
                                    )
                                }
                            }
                        }
                        .padding(.horizontal)
                        
                        // Action Buttons
                        actionButtons
                        
                        // Instructions
                        Text("Swipe or tap to validate")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical)
                }
            }
            .navigationTitle("Validate")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 16) {
                        Button(action: loadTrends) {
                            Image(systemName: "arrow.clockwise")
                        }
                        
                        NavigationLink(destination: ProfileView()) {
                            Image(systemName: "person.circle")
                                .font(.title3)
                        }
                    }
                }
            }
        }
        .task {
            await loadTrends()
        }
    }
    
    // MARK: - Components
    
    private var statsBar: some View {
        HStack(spacing: 20) {
            StatPill(
                icon: "flame.fill",
                value: "\(streak)",
                label: "Streak",
                color: .orange
            )
            
            StatPill(
                icon: "checkmark.circle.fill",
                value: "\(todaysValidations)",
                label: "Today",
                color: .green
            )
            
            StatPill(
                icon: "bolt.fill",
                value: "+\(todaysValidations * 10)",
                label: "XP",
                color: .yellow
            )
        }
        .padding(.horizontal)
    }
    
    private var actionButtons: some View {
        HStack(spacing: 40) {
            // Reject Button
            Button(action: { handleSwipe(.reject) }) {
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [.red, .pink],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 70, height: 70)
                        .shadow(color: .red.opacity(0.3), radius: 10)
                    
                    Image(systemName: "xmark")
                        .font(.system(size: 30, weight: .bold))
                        .foregroundColor(.white)
                }
            }
            .scaleEffect(dragOffset.width < -50 ? 1.2 : 1.0)
            .animation(.spring(), value: dragOffset)
            
            // Approve Button
            Button(action: { handleSwipe(.approve) }) {
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [.green, .mint],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 70, height: 70)
                        .shadow(color: .green.opacity(0.3), radius: 10)
                    
                    Image(systemName: "checkmark")
                        .font(.system(size: 30, weight: .bold))
                        .foregroundColor(.white)
                }
            }
            .scaleEffect(dragOffset.width > 50 ? 1.2 : 1.0)
            .animation(.spring(), value: dragOffset)
        }
    }
    
    // MARK: - Gestures
    
    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                dragOffset = value.translation
            }
            .onEnded { value in
                let threshold: CGFloat = 100
                
                if value.translation.width > threshold {
                    handleSwipe(.approve)
                } else if value.translation.width < -threshold {
                    handleSwipe(.reject)
                } else {
                    withAnimation(.spring()) {
                        dragOffset = .zero
                    }
                }
            }
    }
    
    // MARK: - Actions
    
    private func handleSwipe(_ vote: Vote) {
        guard currentIndex < trendQueue.count else { return }
        
        lastVote = vote
        todaysValidations += 1
        
        // Award XP
        Task {
            await authManager.awardXP(
                amount: 10,
                type: "validation",
                description: "Validated trend: \(trendQueue[currentIndex].title)"
            )
        }
        
        // Animate card off screen
        withAnimation(.spring()) {
            if vote == .approve {
                dragOffset = CGSize(width: 500, height: 0)
            } else {
                dragOffset = CGSize(width: -500, height: 0)
            }
        }
        
        // Show feedback briefly
        showingFeedback = true
        consensusPercentage = Int.random(in: 60...95)
        
        // Move to next card
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            currentIndex += 1
            dragOffset = .zero
            
            if currentIndex >= trendQueue.count - 2 {
                Task {
                    await loadMoreTrends()
                }
            }
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            showingFeedback = false
        }
    }
    
    private func loadTrends() async {
        isLoading = true
        
        // TODO: Implement actual Supabase query
        // Simulate loading
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        
        trendQueue = Trend.mockTrends
        currentIndex = 0
        isLoading = false
    }
    
    private func loadMoreTrends() async {
        // TODO: Load more trends from Supabase
        // For now, just cycle through mock data
        trendQueue.append(contentsOf: Trend.mockTrends)
    }
}

// MARK: - Trend Validation Card
struct TrendValidationCard: View {
    let trend: Trend
    let isTopCard: Bool
    let dragOffset: CGSize
    let onSwipe: (ValidateView.Vote) -> Void
    
    private var rotationAngle: Double {
        Double(dragOffset.width / 20)
    }
    
    private var overlayOpacity: Double {
        abs(Double(dragOffset.width / 150))
    }
    
    var body: some View {
        ZStack {
            // Card Content
            VStack(alignment: .leading, spacing: 16) {
                // Header with platform
                HStack {
                    Label(trend.platform, systemImage: platformIcon)
                        .font(.caption)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Capsule().fill(Color.blue.opacity(0.1)))
                        .foregroundColor(.blue)
                    
                    Spacer()
                    
                    Text(trend.category)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                // Thumbnail or placeholder
                if let thumbnailUrl = trend.thumbnailUrl {
                    AsyncImage(url: URL(string: thumbnailUrl)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(
                                LinearGradient(
                                    colors: [.blue.opacity(0.3), .purple.opacity(0.3)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .overlay(
                                Image(systemName: "photo")
                                    .font(.largeTitle)
                                    .foregroundColor(.white.opacity(0.5))
                            )
                    }
                    .frame(height: 200)
                    .clipped()
                    .cornerRadius(12)
                } else {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(
                            LinearGradient(
                                colors: [.blue.opacity(0.3), .purple.opacity(0.3)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(height: 200)
                        .overlay(
                            Image(systemName: "waveform")
                                .font(.system(size: 60))
                                .foregroundColor(.white.opacity(0.7))
                        )
                }
                
                // Title and Description
                VStack(alignment: .leading, spacing: 8) {
                    Text(trend.title)
                        .font(.title3)
                        .fontWeight(.bold)
                        .lineLimit(2)
                    
                    Text(trend.description)
                        .font(.body)
                        .foregroundColor(.secondary)
                        .lineLimit(3)
                }
                
                // Metadata
                HStack(spacing: 16) {
                    if let velocity = trend.velocity {
                        MetadataTag(
                            icon: "arrow.up.right",
                            text: velocity,
                            color: .orange
                        )
                    }
                    
                    if let size = trend.size {
                        MetadataTag(
                            icon: "chart.bar",
                            text: size,
                            color: .purple
                        )
                    }
                }
                
                Spacer()
                
                // Question
                VStack(spacing: 8) {
                    Text("Is this a real trend worth tracking?")
                        .font(.headline)
                        .multilineTextAlignment(.center)
                    
                    Text("Authentic • Emerging • Worth monitoring")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.blue.opacity(0.05))
                )
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color(.systemBackground))
                    .shadow(color: .black.opacity(0.1), radius: 20)
            )
            
            // Swipe Overlays
            if isTopCard {
                // Approve Overlay
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.green.opacity(overlayOpacity * 0.3))
                    .overlay(
                        VStack {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 80))
                                .foregroundColor(.green)
                            Text("APPROVE")
                                .font(.title)
                                .fontWeight(.bold)
                                .foregroundColor(.green)
                        }
                        .opacity(dragOffset.width > 50 ? overlayOpacity : 0)
                    )
                
                // Reject Overlay
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.red.opacity(overlayOpacity * 0.3))
                    .overlay(
                        VStack {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 80))
                                .foregroundColor(.red)
                            Text("REJECT")
                                .font(.title)
                                .fontWeight(.bold)
                                .foregroundColor(.red)
                        }
                        .opacity(dragOffset.width < -50 ? overlayOpacity : 0)
                    )
            }
        }
        .offset(dragOffset)
        .rotationEffect(.degrees(rotationAngle))
        .animation(.interactiveSpring(), value: dragOffset)
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
}

// MARK: - Helper Components
struct StatPill: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(color)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.headline)
                Text(label)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            Capsule()
                .fill(color.opacity(0.1))
        )
    }
}

struct MetadataTag: View {
    let icon: String
    let text: String
    let color: Color
    
    var body: some View {
        Label(text, systemImage: icon)
            .font(.caption)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                Capsule()
                    .fill(color.opacity(0.1))
            )
            .foregroundColor(color)
    }
}

#Preview {
    ValidateView()
        .environmentObject(AuthManager.shared)
}