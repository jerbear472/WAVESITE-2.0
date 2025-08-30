import SwiftUI
import PhotosUI

struct SpotTrendsView: View {
    @State private var trendUrl = ""
    @State private var trendTitle = ""
    @State private var trendDescription = ""
    @State private var selectedPlatform = "TikTok"
    @State private var selectedCategory = "Lifestyle"
    @State private var selectedImage: PhotosPickerItem?
    @State private var selectedImageData: Data?
    @State private var currentStep = 0
    @State private var isSubmitting = false
    @EnvironmentObject var authManager: AuthManager
    
    let platforms = ["TikTok", "Instagram", "Twitter", "YouTube", "Reddit", "Other"]
    let categories = ["Lifestyle", "Fashion", "Tech", "Food", "Music", "Sports", "Meme", "Entertainment"]
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Progress Bar
                ProgressBar(currentStep: currentStep, totalSteps: 4)
                    .padding()
                
                // Step Content
                TabView(selection: $currentStep) {
                    // Step 1: URL
                    urlStep.tag(0)
                    
                    // Step 2: Details
                    detailsStep.tag(1)
                    
                    // Step 3: Category
                    categoryStep.tag(2)
                    
                    // Step 4: Review
                    reviewStep.tag(3)
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
                .animation(.easeInOut, value: currentStep)
                
                // Navigation Buttons
                navigationButtons
            }
            .navigationTitle("Spot a Trend")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    if currentStep > 0 {
                        Button("Back") {
                            withAnimation {
                                currentStep -= 1
                            }
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Step Views
    
    private var urlStep: some View {
        VStack(spacing: 20) {
            VStack(spacing: 8) {
                Text("Share the trend")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("Paste a link or describe what you found")
                    .font(.body)
                    .foregroundColor(.secondary)
            }
            .padding(.top, 40)
            
            VStack(alignment: .leading, spacing: 12) {
                Label("Trend URL (optional)", systemImage: "link")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                TextField("https://...", text: $trendUrl)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .keyboardType(.URL)
                    .autocapitalization(.none)
            }
            
            Text("OR")
                .font(.caption)
                .foregroundColor(.secondary)
            
            PhotosPicker(selection: $selectedImage, matching: .images) {
                HStack {
                    Image(systemName: "camera.fill")
                    Text("Upload Screenshot")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color.blue, style: StrokeStyle(lineWidth: 2, dash: [5]))
                )
                .foregroundColor(.blue)
            }
            .onChange(of: selectedImage) { newItem in
                Task {
                    if let data = try? await newItem?.loadTransferable(type: Data.self) {
                        selectedImageData = data
                    }
                }
            }
            
            if selectedImageData != nil {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("Screenshot uploaded")
                        .font(.caption)
                }
            }
            
            Spacer()
        }
        .padding()
    }
    
    private var detailsStep: some View {
        VStack(spacing: 20) {
            VStack(spacing: 8) {
                Text("Describe the trend")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("Help others understand what you spotted")
                    .font(.body)
                    .foregroundColor(.secondary)
            }
            .padding(.top, 40)
            
            VStack(alignment: .leading, spacing: 12) {
                Label("Trend Title", systemImage: "textformat")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                TextField("What's the trend called?", text: $trendTitle)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
            }
            
            VStack(alignment: .leading, spacing: 12) {
                Label("Description", systemImage: "text.alignleft")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                TextEditor(text: $trendDescription)
                    .frame(height: 120)
                    .padding(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
            }
            
            VStack(alignment: .leading, spacing: 12) {
                Label("Platform", systemImage: "apps.iphone")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Picker("Platform", selection: $selectedPlatform) {
                    ForEach(platforms, id: \.self) { platform in
                        Text(platform).tag(platform)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
            }
            
            Spacer()
        }
        .padding()
    }
    
    private var categoryStep: some View {
        VStack(spacing: 20) {
            VStack(spacing: 8) {
                Text("Categorize it")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("What type of trend is this?")
                    .font(.body)
                    .foregroundColor(.secondary)
            }
            .padding(.top, 40)
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                ForEach(categories, id: \.self) { category in
                    CategoryCard(
                        category: category,
                        isSelected: selectedCategory == category,
                        action: { selectedCategory = category }
                    )
                }
            }
            
            Spacer()
        }
        .padding()
    }
    
    private var reviewStep: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Text("Review & Submit")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Everything look good?")
                        .font(.body)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 40)
                
                // Summary Card
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text("Trend Summary")
                            .font(.headline)
                        Spacer()
                        Label(selectedPlatform, systemImage: "apps.iphone")
                            .font(.caption)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Capsule().fill(Color.blue.opacity(0.1)))
                            .foregroundColor(.blue)
                    }
                    
                    Divider()
                    
                    VStack(alignment: .leading, spacing: 12) {
                        Label(trendTitle.isEmpty ? "No title" : trendTitle, systemImage: "textformat")
                            .font(.body)
                        
                        if !trendDescription.isEmpty {
                            Text(trendDescription)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(3)
                        }
                        
                        HStack {
                            Label(selectedCategory, systemImage: "folder")
                                .font(.caption)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Capsule().fill(Color.purple.opacity(0.1)))
                                .foregroundColor(.purple)
                            
                            if !trendUrl.isEmpty {
                                Label("Link attached", systemImage: "link")
                                    .font(.caption)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(Capsule().fill(Color.green.opacity(0.1)))
                                    .foregroundColor(.green)
                            }
                            
                            if selectedImageData != nil {
                                Label("Image attached", systemImage: "photo")
                                    .font(.caption)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(Capsule().fill(Color.orange.opacity(0.1)))
                                    .foregroundColor(.orange)
                            }
                        }
                    }
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color(.systemBackground))
                        .shadow(color: .black.opacity(0.05), radius: 10)
                )
                
                // Submit Button
                Button(action: submitTrend) {
                    HStack {
                        if isSubmitting {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .scaleEffect(0.8)
                        } else {
                            Image(systemName: "arrow.up.circle.fill")
                            Text("Submit Trend")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .shadow(color: .blue.opacity(0.3), radius: 5)
                }
                .disabled(isSubmitting || trendTitle.isEmpty)
            }
            .padding()
        }
    }
    
    // MARK: - Navigation
    
    private var navigationButtons: some View {
        HStack {
            if currentStep > 0 {
                Button(action: { withAnimation { currentStep -= 1 } }) {
                    Label("Back", systemImage: "arrow.left")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(12)
                }
            }
            
            if currentStep < 3 {
                Button(action: { withAnimation { currentStep += 1 } }) {
                    Label("Next", systemImage: "arrow.right")
                        .labelStyle(.trailingIcon)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            LinearGradient(
                                colors: [.blue, .purple],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
                .disabled(!canProceed)
            }
        }
        .padding()
    }
    
    private var canProceed: Bool {
        switch currentStep {
        case 0: return !trendUrl.isEmpty || selectedImageData != nil
        case 1: return !trendTitle.isEmpty
        case 2: return true
        default: return false
        }
    }
    
    // MARK: - Actions
    
    private func submitTrend() {
        isSubmitting = true
        
        Task {
            // TODO: Implement Supabase submission
            await authManager.awardXP(amount: 25, type: "submission", description: "Submitted trend: \(trendTitle)")
            
            // Simulate submission
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            
            isSubmitting = false
            
            // Reset form
            trendUrl = ""
            trendTitle = ""
            trendDescription = ""
            selectedImage = nil
            selectedImageData = nil
            currentStep = 0
        }
    }
}

// MARK: - Helper Components

struct ProgressBar: View {
    let currentStep: Int
    let totalSteps: Int
    
    var progress: Double {
        Double(currentStep + 1) / Double(totalSteps)
    }
    
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(0.2))
                    .frame(height: 8)
                
                RoundedRectangle(cornerRadius: 4)
                    .fill(
                        LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: geometry.size.width * progress, height: 8)
                    .animation(.spring(), value: progress)
            }
        }
        .frame(height: 8)
    }
}

struct CategoryCard: View {
    let category: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: categoryIcon)
                    .font(.title)
                    .foregroundColor(isSelected ? .white : .blue)
                
                Text(category)
                    .font(.caption)
                    .fontWeight(isSelected ? .semibold : .regular)
                    .foregroundColor(isSelected ? .white : .primary)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? 
                          LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                          ) : 
                          LinearGradient(
                            colors: [Color(.systemBackground)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                          )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isSelected ? Color.clear : Color.gray.opacity(0.3), lineWidth: 1)
                    )
            )
        }
    }
    
    private var categoryIcon: String {
        switch category {
        case "Lifestyle": return "person.fill"
        case "Fashion": return "tshirt.fill"
        case "Tech": return "laptopcomputer"
        case "Food": return "fork.knife"
        case "Music": return "music.note"
        case "Sports": return "sportscourt.fill"
        case "Meme": return "face.smiling"
        case "Entertainment": return "tv.fill"
        default: return "folder.fill"
        }
    }
}

struct TrailingIconLabelStyle: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack {
            configuration.title
            configuration.icon
        }
    }
}

extension LabelStyle where Self == TrailingIconLabelStyle {
    static var trailingIcon: Self { Self() }
}

#Preview {
    SpotTrendsView()
        .environmentObject(AuthManager.shared)
}