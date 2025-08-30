import SwiftUI
import Charts

struct DashboardView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var recentTrends: [Trend] = []
    @State private var isLoading = false
    @State private var selectedTimeRange = "7d"
    @State private var xpProgress: Double = 0.0
    
    let timeRanges = ["24h", "7d", "30d", "All"]
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Welcome Header
                    welcomeHeader
                    
                    // XP and Stats Cards
                    statsGrid
                    
                    // Activity Chart
                    activityChart
                    
                    // Recent Trends
                    recentTrendsSection
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Dashboard")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { /* Show notifications */ }) {
                        Image(systemName: "bell")
                            .symbolRenderingMode(.hierarchical)
                    }
                }
            }
            .refreshable {
                await loadDashboardData()
            }
        }
        .task {
            await loadDashboardData()
        }
    }
    
    // MARK: - Components
    
    private var welcomeHeader: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Welcome back,")
                    .font(.title3)
                    .foregroundColor(.secondary)
                
                Text(authManager.currentUser?.username ?? "Spotter")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
            }
            
            Spacer()
            
            // Profile Image
            Circle()
                .fill(
                    LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 60, height: 60)
                .overlay(
                    Text((authManager.currentUser?.username.prefix(2) ?? "US").uppercased())
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                )
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.05), radius: 10)
        )
    }
    
    private var statsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
            StatCard(
                title: "Total XP",
                value: "\(authManager.currentUser?.totalXP ?? 0)",
                icon: "bolt.fill",
                color: .yellow,
                progress: xpProgress
            )
            
            StatCard(
                title: "Level",
                value: "\(authManager.currentUser?.currentLevel ?? 1)",
                icon: "star.fill",
                color: .purple,
                subtitle: "Next: \(100 - Int(xpProgress * 100)) XP"
            )
            
            StatCard(
                title: "Streak",
                value: "\(authManager.currentUser?.currentStreak ?? 0)",
                icon: "flame.fill",
                color: .orange,
                subtitle: "days"
            )
            
            StatCard(
                title: "Accuracy",
                value: String(format: "%.0f%%", authManager.currentUser?.accuracyScore ?? 0),
                icon: "target",
                color: .green
            )
        }
    }
    
    private var activityChart: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Activity")
                    .font(.headline)
                
                Spacer()
                
                Picker("Time Range", selection: $selectedTimeRange) {
                    ForEach(timeRanges, id: \.self) { range in
                        Text(range).tag(range)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
                .frame(width: 200)
            }
            
            // Activity Chart
            Chart {
                ForEach(mockActivityData) { dataPoint in
                    LineMark(
                        x: .value("Day", dataPoint.date),
                        y: .value("XP", dataPoint.xp)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .interpolationMethod(.catmullRom)
                    
                    AreaMark(
                        x: .value("Day", dataPoint.date),
                        y: .value("XP", dataPoint.xp)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.blue.opacity(0.3), .purple.opacity(0.1)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .interpolationMethod(.catmullRom)
                }
            }
            .frame(height: 200)
            .chartXAxis {
                AxisMarks(values: .automatic(desiredCount: 5)) { _ in
                    AxisGridLine()
                    AxisValueLabel()
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.05), radius: 10)
        )
    }
    
    private var recentTrendsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Trends")
                    .font(.headline)
                
                Spacer()
                
                NavigationLink(destination: TrendsListView()) {
                    Text("See All")
                        .font(.callout)
                        .foregroundColor(.blue)
                }
            }
            
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 100)
            } else if recentTrends.isEmpty {
                EmptyStateView(
                    icon: "chart.line.uptrend.xyaxis",
                    title: "No trends yet",
                    subtitle: "Start spotting trends to see them here"
                )
                .frame(maxWidth: .infinity, minHeight: 100)
            } else {
                ForEach(recentTrends.prefix(3)) { trend in
                    TrendRowView(trend: trend)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.05), radius: 10)
        )
    }
    
    // MARK: - Data Loading
    
    private func loadDashboardData() async {
        isLoading = true
        
        // Simulate loading
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        
        // Calculate XP progress
        if let user = authManager.currentUser {
            let xpInCurrentLevel = user.totalXP % (100 * user.currentLevel)
            xpProgress = Double(xpInCurrentLevel) / Double(100 * user.currentLevel)
        }
        
        // Load recent trends
        // TODO: Implement actual Supabase query
        recentTrends = Trend.mockTrends
        
        isLoading = false
    }
}

// MARK: - Stat Card Component
struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    var subtitle: String? = nil
    var progress: Double? = nil
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                
                Spacer()
                
                if let progress = progress {
                    CircularProgressView(progress: progress, color: color)
                        .frame(width: 40, height: 40)
                }
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                HStack(alignment: .lastTextBaseline, spacing: 4) {
                    Text(value)
                        .font(.title)
                        .fontWeight(.bold)
                    
                    if let subtitle = subtitle {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.05), radius: 5)
        )
    }
}

// MARK: - Circular Progress View
struct CircularProgressView: View {
    let progress: Double
    let color: Color
    
    var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.2), lineWidth: 4)
            
            Circle()
                .trim(from: 0, to: progress)
                .stroke(color, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut, value: progress)
        }
    }
}

// MARK: - Mock Data
struct ActivityDataPoint: Identifiable {
    let id = UUID()
    let date: Date
    let xp: Int
}

let mockActivityData: [ActivityDataPoint] = {
    var data: [ActivityDataPoint] = []
    let calendar = Calendar.current
    
    for i in 0..<7 {
        let date = calendar.date(byAdding: .day, value: -i, to: Date()) ?? Date()
        let xp = Int.random(in: 50...200)
        data.append(ActivityDataPoint(date: date, xp: xp))
    }
    
    return data.reversed()
}()

#Preview {
    DashboardView()
        .environmentObject(AuthManager.shared)
}