import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showingSettings = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Profile Header
                    profileHeader
                    
                    // Stats Grid
                    statsGrid
                    
                    // Achievements
                    achievementsSection
                    
                    // Settings Button
                    settingsButton
                    
                    // Sign Out Button
                    signOutButton
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingSettings = true }) {
                        Image(systemName: "gearshape")
                    }
                }
            }
        }
    }
    
    private var profileHeader: some View {
        VStack(spacing: 16) {
            // Profile Image
            Circle()
                .fill(
                    LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 100, height: 100)
                .overlay(
                    Text((authManager.currentUser?.username.prefix(2) ?? "US").uppercased())
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                )
            
            // User Info
            VStack(spacing: 8) {
                Text(authManager.currentUser?.username ?? "User")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text(authManager.currentUser?.email ?? "")
                    .font(.callout)
                    .foregroundColor(.secondary)
                
                // Level Badge
                HStack {
                    Image(systemName: "star.fill")
                        .foregroundColor(.yellow)
                    Text("Level \(authManager.currentUser?.currentLevel ?? 1)")
                        .fontWeight(.semibold)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(Color.yellow.opacity(0.15))
                )
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.05), radius: 10)
        )
    }
    
    private var statsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
            ProfileStatCard(
                icon: "bolt.fill",
                title: "Total XP",
                value: "\(authManager.currentUser?.totalXP ?? 0)",
                color: .yellow
            )
            
            ProfileStatCard(
                icon: "eye.fill",
                title: "Trends Spotted",
                value: "\(authManager.currentUser?.trendsSpotted ?? 0)",
                color: .blue
            )
            
            ProfileStatCard(
                icon: "checkmark.shield.fill",
                title: "Accuracy",
                value: String(format: "%.0f%%", authManager.currentUser?.accuracyScore ?? 0),
                color: .green
            )
            
            ProfileStatCard(
                icon: "flame.fill",
                title: "Current Streak",
                value: "\(authManager.currentUser?.currentStreak ?? 0) days",
                color: .orange
            )
        }
    }
    
    private var achievementsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Achievements")
                .font(.headline)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    AchievementBadge(
                        icon: "star.fill",
                        title: "Early Bird",
                        subtitle: "First 100 users",
                        isUnlocked: true,
                        color: .yellow
                    )
                    
                    AchievementBadge(
                        icon: "eye.fill",
                        title: "Trend Spotter",
                        subtitle: "Spot 10 trends",
                        isUnlocked: (authManager.currentUser?.trendsSpotted ?? 0) >= 10,
                        color: .blue
                    )
                    
                    AchievementBadge(
                        icon: "checkmark.seal.fill",
                        title: "Validator",
                        subtitle: "Validate 50 trends",
                        isUnlocked: false,
                        color: .green
                    )
                    
                    AchievementBadge(
                        icon: "flame.fill",
                        title: "On Fire",
                        subtitle: "30 day streak",
                        isUnlocked: (authManager.currentUser?.currentStreak ?? 0) >= 30,
                        color: .orange
                    )
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.05), radius: 10)
        )
    }
    
    private var settingsButton: some View {
        NavigationLink(destination: Text("Settings")) {
            HStack {
                Image(systemName: "gearshape")
                Text("Settings")
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(.systemBackground))
                    .shadow(color: .black.opacity(0.05), radius: 5)
            )
        }
        .foregroundColor(.primary)
    }
    
    private var signOutButton: some View {
        Button(action: {
            Task {
                await authManager.signOut()
            }
        }) {
            HStack {
                Image(systemName: "arrow.right.square")
                    .foregroundColor(.red)
                Text("Sign Out")
                    .foregroundColor(.red)
                Spacer()
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(.systemBackground))
                    .shadow(color: .black.opacity(0.05), radius: 5)
            )
        }
    }
}

struct ProfileStatCard: View {
    let icon: String
    let title: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            
            VStack(spacing: 4) {
                Text(value)
                    .font(.title3)
                    .fontWeight(.bold)
                
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground))
                .shadow(color: .black.opacity(0.05), radius: 5)
        )
    }
}

struct AchievementBadge: View {
    let icon: String
    let title: String
    let subtitle: String
    let isUnlocked: Bool
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(isUnlocked ? color.opacity(0.15) : Color.gray.opacity(0.1))
                    .frame(width: 60, height: 60)
                
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(isUnlocked ? color : .gray)
            }
            
            VStack(spacing: 2) {
                Text(title)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(isUnlocked ? .primary : .secondary)
                
                Text(subtitle)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .frame(width: 100)
        .opacity(isUnlocked ? 1.0 : 0.6)
    }
}

#Preview {
    ProfileView()
        .environmentObject(AuthManager.shared)
}