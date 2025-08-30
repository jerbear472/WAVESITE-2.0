import SwiftUI

struct AuthenticationView: View {
    @State private var isSignUp = false
    @State private var email = ""
    @State private var password = ""
    @State private var username = ""
    @State private var showPassword = false
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [
                        Color.purple.opacity(0.15),
                        Color.blue.opacity(0.15),
                        Color.green.opacity(0.15)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 30) {
                        // Logo and Title
                        VStack(spacing: 16) {
                            Image(systemName: "waveform.circle.fill")
                                .font(.system(size: 80))
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [.blue, .purple],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .shadow(color: .blue.opacity(0.3), radius: 10)
                            
                            Text("WaveSight")
                                .font(.system(size: 40, weight: .bold, design: .rounded))
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [.blue, .purple],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                            
                            Text("See the wave before it breaks")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.secondary)
                        }
                        .padding(.top, 60)
                        
                        // Auth Form
                        VStack(spacing: 20) {
                            // Email Field
                            VStack(alignment: .leading, spacing: 8) {
                                Label("Email", systemImage: "envelope")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                
                                TextField("Enter your email", text: $email)
                                    .textFieldStyle(CustomTextFieldStyle())
                                    .keyboardType(.emailAddress)
                                    .autocapitalization(.none)
                                    .textContentType(.emailAddress)
                            }
                            
                            // Username Field (Sign Up only)
                            if isSignUp {
                                VStack(alignment: .leading, spacing: 8) {
                                    Label("Username", systemImage: "person")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    
                                    TextField("Choose a username", text: $username)
                                        .textFieldStyle(CustomTextFieldStyle())
                                        .autocapitalization(.none)
                                        .textContentType(.username)
                                }
                                .transition(.asymmetric(
                                    insertion: .move(edge: .top).combined(with: .opacity),
                                    removal: .move(edge: .top).combined(with: .opacity)
                                ))
                            }
                            
                            // Password Field
                            VStack(alignment: .leading, spacing: 8) {
                                Label("Password", systemImage: "lock")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                
                                HStack {
                                    if showPassword {
                                        TextField("Enter your password", text: $password)
                                            .textContentType(.password)
                                    } else {
                                        SecureField("Enter your password", text: $password)
                                            .textContentType(.password)
                                    }
                                    
                                    Button(action: { showPassword.toggle() }) {
                                        Image(systemName: showPassword ? "eye.slash" : "eye")
                                            .foregroundColor(.secondary)
                                    }
                                }
                                .textFieldStyle(CustomTextFieldStyle())
                            }
                            
                            // Error Message
                            if let error = authManager.errorMessage {
                                HStack {
                                    Image(systemName: "exclamationmark.triangle")
                                    Text(error)
                                        .font(.caption)
                                }
                                .foregroundColor(.red)
                                .padding(.horizontal)
                                .transition(.asymmetric(
                                    insertion: .move(edge: .top).combined(with: .opacity),
                                    removal: .move(edge: .top).combined(with: .opacity)
                                ))
                            }
                            
                            // Submit Button
                            Button(action: authenticate) {
                                HStack {
                                    if authManager.isLoading {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                            .scaleEffect(0.8)
                                    } else {
                                        Text(isSignUp ? "Create Account" : "Sign In")
                                            .fontWeight(.semibold)
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
                            .disabled(authManager.isLoading || !isFormValid)
                            .opacity(isFormValid ? 1.0 : 0.6)
                            
                            // Toggle Auth Mode
                            HStack {
                                Text(isSignUp ? "Already have an account?" : "Don't have an account?")
                                    .foregroundColor(.secondary)
                                
                                Button(action: {
                                    withAnimation(.spring()) {
                                        isSignUp.toggle()
                                        authManager.errorMessage = nil
                                    }
                                }) {
                                    Text(isSignUp ? "Sign In" : "Sign Up")
                                        .fontWeight(.semibold)
                                        .foregroundColor(.blue)
                                }
                            }
                            .font(.callout)
                        }
                        .padding(.horizontal, 30)
                        .padding(.vertical, 40)
                        .background(
                            RoundedRectangle(cornerRadius: 20)
                                .fill(.ultraThinMaterial)
                                .shadow(color: .black.opacity(0.1), radius: 10)
                        )
                        .padding(.horizontal)
                        
                        // Features Preview
                        VStack(spacing: 16) {
                            Text("Join the community")
                                .font(.headline)
                                .foregroundColor(.primary)
                            
                            HStack(spacing: 30) {
                                FeatureIcon(icon: "sparkles", title: "Spot", color: .blue)
                                FeatureIcon(icon: "checkmark.shield", title: "Validate", color: .green)
                                FeatureIcon(icon: "chart.line.uptrend.xyaxis", title: "Predict", color: .purple)
                            }
                        }
                        .padding(.vertical, 30)
                    }
                    .padding(.bottom, 50)
                }
            }
            .navigationBarHidden(true)
        }
    }
    
    private var isFormValid: Bool {
        if isSignUp {
            return !email.isEmpty && !password.isEmpty && !username.isEmpty
        } else {
            return !email.isEmpty && !password.isEmpty
        }
    }
    
    private func authenticate() {
        Task {
            if isSignUp {
                await authManager.signUp(email: email, password: password, username: username)
            } else {
                await authManager.signIn(email: email, password: password)
            }
        }
    }
}

// MARK: - Custom Text Field Style
struct CustomTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(.systemBackground))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                    )
            )
    }
}

// MARK: - Feature Icon
struct FeatureIcon: View {
    let icon: String
    let title: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 30))
                .foregroundColor(color)
                .frame(width: 60, height: 60)
                .background(
                    Circle()
                        .fill(color.opacity(0.1))
                )
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

#Preview {
    AuthenticationView()
        .environmentObject(AuthManager.shared)
}