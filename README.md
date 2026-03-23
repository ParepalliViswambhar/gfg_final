# 🔍 Veritas AI - Fact & Claim Verification System

<div align="center">

![Veritas AI Banner](https://img.shields.io/badge/Veritas-AI%20Fact%20Checker-blue?style=for-the-badge)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=for-the-badge)](https://nodejs.org)
[![React](https://img.shields.io/badge/react-19.2.4-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org)

**An AI-powered fact-checking engine that validates text integrity against real-time data using multi-agent architecture and advanced prompt engineering.**

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Architecture](#-architecture) • [API](#-api-documentation) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Configuration](#-configuration)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

Veritas AI addresses the critical challenge of misinformation and AI-generated content by providing an automated, multi-agent fact-checking pipeline that:

1. **Extracts** atomic, verifiable claims from complex text
2. **Retrieves** evidence from authoritative web sources
3. **Verifies** claims using evidence-based reasoning (not LLM training data)
4. **Detects** AI-generated text and images
5. **Reports** detailed accuracy scores with citations

### Problem Statement

The rapid proliferation of AI-generated content and digital news has led to a surge in misinformation and LLM "hallucinations." Manual fact-checking is labor-intensive and unscalable. Veritas AI provides an automated solution for content reliability, trust, and compliance in enterprise environments.

---

## ✨ Features

### Core Functionality

- ✅ **Multi-Modal Input Support**
  - Plain text analysis
  - URL/article scraping
  - Image AI detection
  - Document processing (PDF, DOCX, TXT, CSV)
  - Video upload (deepfake detection coming soon)

- ✅ **Advanced Claim Extraction**
  - Atomic fact decomposition
  - Context preservation
  - Temporal claim detection
  - Duplicate removal

- ✅ **Evidence-Based Verification**
  - Multi-query search strategies
  - Source authority ranking (.gov > .edu > news > blogs)
  - Temporal filtering for time-sensitive claims
  - Conflict resolution when sources disagree

- ✅ **AI Content Detection** (Bonus Feature)
  - Text analysis using burstiness, lexical diversity, and pattern detection
  - Image authenticity verification
  - Confidence scoring with detailed indicators

### User Experience

- 🎨 **Modern UI/UX**
  - Real-time streaming progress updates
  - Glassmorphism design with Framer Motion animations
  - Responsive layout for all devices
  - Dark theme optimized for readability

- 📊 **Detailed Reporting**
  - Overall accuracy score
  - Claim-by-claim breakdown
  - Evidence citations with source links
  - Confidence scores and reasoning
  - Analysis history with search

### Technical Excellence

- 🤖 **Multi-Agent Architecture**
  - ClaimExtractorAgent: Specialized in atomic fact extraction
  - EvidenceRetrieverAgent: Multi-source search with ranking
  - VerificationAgent: Chain-of-thought reasoning with conflict resolution
  - OrchestratorAgent: Coordinates the entire pipeline

- 🔄 **Robust Error Handling**
  - Automatic retry with exponential backoff
  - Rate limit detection and handling
  - Graceful degradation
  - Timeout management

- 🔐 **Security & Authentication**
  - JWT-based authentication
  - Input validation and sanitization
  - Rate limiting per user
  - Secure API key management

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 19.2.4 with Vite
- **Styling**: Tailwind CSS 3.4 with custom glassmorphism
- **Animations**: Framer Motion 12.38
- **Icons**: Lucide React
- **Routing**: React Router DOM 7.13

### Backend
- **Runtime**: Node.js with Express 5.2
- **Database**: MongoDB with Mongoose 8.23
- **Authentication**: JWT (jsonwebtoken 9.0.3) + bcryptjs
- **AI/LLM**: Google Gemini API 2.0 Flash Exp
- **Search**: Tavily API for web search
- **Document Processing**: pdf-parse, mammoth (DOCX)

### DevOps & Tools
- **Version Control**: Git
- **Package Manager**: npm
- **Environment**: dotenv for configuration
- **API Client**: Axios with retry logic

---

## 🏗 Architecture

### Multi-Agent System

```
┌─────────────────────────────────────────────────────────────┐
│                    OrchestratorAgent                        │
│  (Coordinates the entire verification pipeline)            │
└────────────┬────────────────────────────────────────────────┘
             │
             ├──► ClaimExtractorAgent
             │    • Decomposes text into atomic claims
             │    • Detects temporal claims
             │    • Removes duplicates
             │
             ├──► EvidenceRetrieverAgent
             │    • Generates multiple search queries
             │    • Searches with Tavily API
             │    • Ranks sources by authority
             │    • Filters by recency for temporal claims
             │
             └──► VerificationAgent
                  • Chain-of-thought reasoning
                  • Evidence-only verification (no training data)
                  • Conflict detection and resolution
                  • Confidence scoring
```

### Data Flow

```
User Input (Text/URL/Image/File)
    │
    ├──► URL Scraping (if URL)
    ├──► Document Parsing (if PDF/DOCX)
    └──► AI Text Detection
         │
         ▼
    Claim Extraction
         │
         ▼
    Evidence Retrieval (Tavily Search)
         │
         ▼
    Verification (Chain-of-Thought)
         │
         ▼
    Report Generation
         │
         ▼
    Save to History + Stream to Frontend
```

### Real-Time Streaming

The system uses **Server-Sent Events (SSE)** for real-time progress updates:

1. Frontend initiates analysis request
2. Backend streams progress updates:
   - `extracting`: Parsing claims
   - `searching`: Fetching evidence
   - `verifying`: Analyzing claims
   - `complete`: Final results
3. Frontend updates UI in real-time

---

## 📦 Installation

### Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 5.0
- npm or yarn
- Google Gemini API key
- Tavily API key

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/veritas-ai.git
cd veritas-ai
```

### Step 2: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 3: Configure Environment Variables

Create `.env` files in both backend and frontend directories:

**Backend `.env`:**
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/veritas_ai
JWT_SECRET=your_super_secret_jwt_key_change_this
GEMINI_API_KEY=your_gemini_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:5000
```

### Step 4: Start MongoDB

```bash
# Using MongoDB service
sudo systemctl start mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Step 5: Run the Application

```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

---

## 🚀 Usage

### 1. Create an Account

Navigate to http://localhost:5173 and sign up with your email and password.

### 2. Analyze Content

Choose your input method:

#### Text Analysis
```
Paste any article or statement into the text box and click "Analyze"
```

#### URL Analysis
```
Enter a news article URL (e.g., https://www.bbc.com/news/article)
The system will scrape and analyze the content
```

#### Image Analysis
```
Upload an image to detect if it's AI-generated
Supports JPG, PNG, WEBP, GIF
```

#### Document Analysis
```
Upload PDF, DOCX, TXT, or CSV files
The system will extract and verify claims
```

### 3. Review Results

The system provides:
- **Overall Accuracy Score**: 0-100% based on claim verification
- **Claim Breakdown**: Each claim with verdict (TRUE/FALSE/PARTIAL/UNVERIFIABLE)
- **Evidence Citations**: Links to authoritative sources
- **AI Detection**: Whether content is AI-generated
- **Confidence Scores**: How certain the system is about each verdict

### 4. View History

Access your past analyses from the History page, with full reports available on click.

---

## 📚 API Documentation

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}

Response:
{
  "token": "jwt_token_here",
  "user": { "id": "...", "name": "John Doe", "email": "..." }
}
```

### Analysis

#### Submit Analysis (Streaming)
```http
POST /api/analyze/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "text|url|image|file|video",
  "content": "text content or base64 data",
  "filename": "optional_filename.pdf"
}

Response: Server-Sent Events stream
data: {"stage":"extracting","progress":0,"message":"Extracting claims..."}
data: {"stage":"searching","progress":50,"currentClaim":"..."}
data: {"stage":"verifying","progress":75,"currentClaim":"..."}
data: {"stage":"complete","result":{...}}
```

#### Get Analysis History
```http
GET /api/analyze/history
Authorization: Bearer <token>

Response:
[
  {
    "_id": "...",
    "type": "text",
    "preview": "Article preview...",
    "score": 85,
    "totalClaims": 5,
    "stats": { "true": 4, "false": 0, "partial": 1 },
    "createdAt": "2026-03-21T..."
  }
]
```

---

## 📁 Project Structure

```
veritas-ai/
├── backend/
│   ├── agents/
│   │   ├── OrchestratorAgent.js      # Main coordinator
│   │   ├── ClaimExtractorAgent.js    # Claim extraction
│   │   ├── EvidenceRetrieverAgent.js # Evidence search
│   │   └── VerificationAgent.js      # Claim verification
│   ├── middleware/
│   │   └── auth.js                   # JWT authentication
│   ├── models/
│   │   ├── User.js                   # User schema
│   │   └── History.js                # Analysis history schema
│   ├── routes/
│   │   ├── auth.js                   # Auth endpoints
│   │   └── analyze.js                # Analysis endpoints
│   ├── utils/
│   │   ├── ResilientAPIClient.js     # Retry logic
│   │   └── AITextDetector.js         # AI text detection
│   ├── .env                          # Environment variables
│   ├── server.js                     # Express server
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx            # Dashboard layout
│   │   ├── pages/
│   │   │   ├── Auth.jsx              # Login/Register
│   │   │   ├── Workspace.jsx         # Main analysis page
│   │   │   ├── History.jsx           # Analysis history
│   │   │   └── Settings.jsx          # User settings
│   │   ├── lib/
│   │   │   └── utils.js              # Utility functions
│   │   ├── App.jsx                   # Main app component
│   │   ├── main.jsx                  # Entry point
│   │   └── index.css                 # Global styles
│   ├── public/
│   ├── .env                          # Environment variables
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── ANALYSIS_AND_RECOMMENDATIONS.md   # Detailed analysis
├── README.md                         # This file
└── .gitignore
```

---

## ⚙️ Configuration

### Backend Configuration

Edit `backend/.env`:

```env
# Server
PORT=5000

# Database
MONGO_URI=mongodb://localhost:27017/veritas_ai

# Authentication
JWT_SECRET=your_secret_key_min_32_characters

# AI APIs
GEMINI_API_KEY=your_gemini_api_key
TAVILY_API_KEY=your_tavily_api_key

# Optional: Redis for caching
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Frontend Configuration

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

For production:
```env
VITE_API_URL=https://api.yourapp.com
```

### API Keys

#### Get Google Gemini API Key
1. Visit https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy and paste into `.env`

#### Get Tavily API Key
1. Visit https://tavily.com
2. Sign up for an account
3. Generate an API key
4. Copy and paste into `.env`

---

## 🧪 Testing

### Manual Testing

Test the system with these scenarios:

#### High Accuracy Article
```
Input: Recent news article from BBC or Reuters
Expected: 80-100% accuracy score, all claims verified
```

#### Mixed Accuracy Content
```
Input: Article with mix of true and false claims
Expected: System correctly identifies false claims
```

#### Conflicting Sources
```
Input: Controversial topic with disagreeing sources
Expected: System resolves conflicts using source authority
```

#### AI-Generated Text
```
Input: ChatGPT-generated article
Expected: AI detection score > 70%
```

### Automated Testing (Coming Soon)

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test
```

---

## 🚢 Deployment

### Docker Deployment

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - MONGO_URI=mongodb://mongodb:27017/veritas_ai
      - JWT_SECRET=${JWT_SECRET}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - TAVILY_API_KEY=${TAVILY_API_KEY}
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://backend:5000

volumes:
  mongo-data:
```

Run:
```bash
docker-compose up -d
```

### Cloud Deployment

#### Backend (Heroku/Railway/Render)
1. Push code to GitHub
2. Connect repository to hosting platform
3. Set environment variables
4. Deploy

#### Frontend (Vercel/Netlify)
1. Push code to GitHub
2. Connect repository to Vercel/Netlify
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Deploy

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Contribution Guidelines

- Follow existing code style
- Write clear commit messages
- Add tests for new features
- Update documentation
- Ensure all tests pass

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini** for advanced LLM capabilities
- **Tavily** for web search API
- **React** and **Tailwind CSS** communities
- **Framer Motion** for beautiful animations

---

## 📞 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/veritas-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/veritas-ai/discussions)
- **Email**: support@veritasai.com

---

## 🗺 Roadmap

### Version 1.1 (Q2 2026)
- [ ] Video deepfake detection
- [ ] Audio analysis
- [ ] Multi-language support
- [ ] Browser extension

### Version 1.2 (Q3 2026)
- [ ] Real-time fact-checking API
- [ ] Slack/Discord integration
- [ ] Advanced analytics dashboard
- [ ] Custom model fine-tuning

### Version 2.0 (Q4 2026)
- [ ] Enterprise features
- [ ] White-label solution
- [ ] On-premise deployment
- [ ] Advanced reporting

---

<div align="center">

**Built with ❤️ by the Veritas AI Team**

[⬆ Back to Top](#-veritas-ai---fact--claim-verification-system)

</div>
