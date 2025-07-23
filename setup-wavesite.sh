#!/bin/bash

echo "🌊 WAVESITE 2.0 Setup Script"
echo "=========================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Check prerequisites
echo -e "\n${BLUE}Step 1: Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 20+${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed. Please install npm${NC}"
    exit 1
fi

if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.11+${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites installed${NC}"

# Step 2: Install dependencies
echo -e "\n${BLUE}Step 2: Installing dependencies...${NC}"

# Install web dependencies
echo "Installing web dependencies..."
cd web
npm install
cd ..

# Install mobile dependencies
echo "Installing mobile dependencies..."
cd mobile
npm install

# Install iOS dependencies if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Installing iOS dependencies..."
    cd ios
    pod install
    cd ..
fi
cd ..

# Install Python dependencies for backend
echo "Installing backend dependencies..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 3: Create environment files
echo -e "\n${BLUE}Step 3: Setting up environment files...${NC}"

# Create .env file for web
cat > web/.env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF

# Create .env file for mobile
cat > mobile/.env << 'EOF'
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# API Configuration
API_URL=http://localhost:8000
EOF

# Create .env file for backend
cat > backend/.env << 'EOF'
# Database
DATABASE_URL=postgresql://user:password@localhost/wavesite
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# Redis
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ML Models
OPENAI_API_KEY=your_openai_key_here
EOF

echo -e "${GREEN}✅ Environment files created${NC}"
echo -e "${RED}⚠️  Please update the .env files with your actual credentials${NC}"

# Step 4: Setup instructions
echo -e "\n${BLUE}=== Next Steps ===${NC}"
echo "1. Create a Supabase account at https://supabase.com"
echo "2. Create a new project and get your API keys"
echo "3. Run the schema.sql file in Supabase SQL editor"
echo "4. Update all .env files with your Supabase credentials"
echo "5. Install Redis locally or use a cloud service"
echo "6. For iOS development:"
echo "   - Open Xcode and create an Apple Developer account"
echo "   - Configure signing & capabilities in mobile/ios/mobile.xcodeproj"
echo ""
echo "To start the services:"
echo "  - Web: cd web && npm run dev"
echo "  - Backend: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "  - Mobile: cd mobile && npm run ios (or npm run android)"

# Make the script executable
chmod +x setup-wavesite.sh