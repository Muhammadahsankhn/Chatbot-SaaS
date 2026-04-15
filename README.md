# DigiChat — AI Chatbot SaaS

A full-stack AI-powered chatbot SaaS platform with RAG pipeline, embeddable widget, and a management dashboard.

---

## 📁 Project Structure

```
digichat/
├── chatbot/          # React + Vite frontend (dashboard)
├── ai-service/       # Python FastAPI backend + AI/RAG engine
├── demo.html         # Standalone widget demo page
└── README.md
```

---

## ⚙️ Requirements

### Frontend (chatbot/)
- Node.js >= 18
- npm >= 9

### Backend (ai-service/)
- Python >= 3.10
- pip

---

## 🚀 Setup Instructions

### 1. Backend (AI Service)

```bash
cd ai-service

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Copy .env.example to .env and fill in your keys:
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET
# - GEMINI_API_KEY
# - JINA_API_KEY
# - DATABASE_URL (PostgreSQL)
# - JWT_SECRET

# Start server
python main.py
```

Backend runs on: `http://localhost:8000`

---

### 2. Frontend (Dashboard)

```bash
cd chatbot

# Install dependencies
npm install

# Development mode
npm run dev

# OR Production build (already built in dist/)
npm run build
```

Frontend runs on: `http://localhost:5173`

---

### 3. Widget Embedding

Copy the embed snippet from the **Widget Setup** page in the dashboard, or use `demo.html` as a reference.

---

## 🌐 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + CSS |
| Backend | FastAPI (Python) |
| AI | Google Gemini + RAG Pipeline |
| Web Fetching | Jina AI Reader API |
| Auth | Google OAuth 2.0 + JWT |
| Database | PostgreSQL + SQLAlchemy |
| Embeddings | Sentence Transformers |

---

## 📦 Production Notes

- The `chatbot/dist/` folder contains the pre-built production frontend.
- Never commit `.env` files — keep your API keys secure.
- The `widget.js` file in `ai-service/` is the embeddable chat widget script.

---

© 2026 DigiChat. All rights reserved.
