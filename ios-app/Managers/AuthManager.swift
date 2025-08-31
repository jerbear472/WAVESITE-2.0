import SwiftUI

// Simplified AuthManager for demo purposes
class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private init() {
        // Check for demo mode
        checkDemoMode()
    }
    
    private func checkDemoMode() {
        // Auto-login for demo
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.isAuthenticated = true
            self.currentUser = User(
                id: UUID(),
                email: "demo@wavesight.com",
                username: "DemoUser",
                currentLevel: 5,
                totalXP: 2500,
                currentStreak: 7,
                trendsSpotted: 23,
                accuracyScore: 85
            )
        }
    }
    
    func signIn(email: String, password: String) async throws {
        isLoading = true
        defer { isLoading = false }
        
        // Simulate network delay
        try await Task.sleep(nanoseconds: 1_000_000_000)
        
        // Demo login
        await MainActor.run {
            self.isAuthenticated = true
            self.currentUser = User(
                id: UUID(),
                email: email,
                username: email.components(separatedBy: "@").first ?? "User",
                currentLevel: 1,
                totalXP: 0,
                currentStreak: 0,
                trendsSpotted: 0,
                accuracyScore: 0
            )
        }
    }
    
    func signUp(email: String, password: String, username: String) async throws {
        isLoading = true
        defer { isLoading = false }
        
        // Simulate network delay
        try await Task.sleep(nanoseconds: 1_000_000_000)
        
        // Demo signup
        await MainActor.run {
            self.isAuthenticated = true
            self.currentUser = User(
                id: UUID(),
                email: email,
                username: username,
                currentLevel: 1,
                totalXP: 0,
                currentStreak: 0,
                trendsSpotted: 0,
                accuracyScore: 0
            )
        }
    }
    
    func signOut() async {
        await MainActor.run {
            self.isAuthenticated = false
            self.currentUser = nil
        }
    }
}