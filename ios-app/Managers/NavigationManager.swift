import SwiftUI

final class NavigationManager: ObservableObject {
    @Published var selectedTab: Int
    @Published var showingProfile: Bool
    @Published var navigationPath: NavigationPath
    
    init() {
        self.selectedTab = 0
        self.showingProfile = false
        self.navigationPath = NavigationPath()
    }
    
    func navigateToTab(_ tab: Int) {
        selectedTab = tab
    }
    
    func navigateToProfile() {
        showingProfile = true
    }
    
    func resetNavigation() {
        selectedTab = 0
        showingProfile = false
        navigationPath = NavigationPath()
    }
}