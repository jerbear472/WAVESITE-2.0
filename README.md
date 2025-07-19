# WaveSight

A multi-platform application with React Native mobile app, FastAPI backend, machine learning capabilities, and Next.js web dashboard.

## Project Structure

```
wavesight/
├── mobile/                 # React Native mobile app
├── backend/               # Python FastAPI backend
├── ml/                    # Machine learning models
├── web/                   # Next.js client dashboard
├── infrastructure/        # Docker, K8s configs
└── shared/               # Shared types and utilities
```

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- React Native development environment

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Web Dashboard
```bash
cd web
npm install
npm run dev
```

### Mobile App
```bash
cd mobile
npm install
# iOS
cd ios && pod install && cd ..
npm run ios
# Android
npm run android
```

### Docker Compose
```bash
docker-compose -f infrastructure/docker-compose.yml up
```

## Tech Stack
- **Mobile**: React Native, TypeScript
- **Backend**: FastAPI, PostgreSQL, Redis
- **ML**: TensorFlow, PyTorch, scikit-learn
- **Web**: Next.js, Tailwind CSS
- **Infrastructure**: Docker, Kubernetes