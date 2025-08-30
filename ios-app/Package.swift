// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "WaveSight",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "WaveSight",
            targets: ["WaveSight"]),
    ],
    dependencies: [
        .package(url: "https://github.com/supabase-community/supabase-swift.git", from: "2.0.0"),
        .package(url: "https://github.com/kean/Nuke.git", from: "12.0.0"),
        .package(url: "https://github.com/SwiftUIX/SwiftUIX.git", from: "0.1.0")
    ],
    targets: [
        .target(
            name: "WaveSight",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
                .product(name: "Nuke", package: "Nuke"),
                .product(name: "NukeUI", package: "Nuke"),
                .product(name: "SwiftUIX", package: "SwiftUIX")
            ]),
    ]
)