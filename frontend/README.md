🩺 Symptom Checker Web App
Hey! This is a simple full-stack app I built that lets users enter a symptom and get an AI-generated response with severity and confidence info. You can also give feedback, use voice input, and see your recent symptom search history — all wrapped up in a clean interface.

🔧 What It Does
Type or speak a symptom (speech-to-text using Web Speech API)

Sends the input to a FastAPI backend that talks to GPT-3.5

AI responds with likely conditions + treatment options

Severity and confidence are calculated based on matching condition keywords

You can give feedback, and it’s stored for testing

Search history is saved locally in your browser (localStorage)

💻 Tech Stack
Frontend:
React (Vite)

Tailwind CSS

Web Speech API (voice input)

Local Storage (for search history)

Backend:
Python + FastAPI

OpenAI API (GPT-3.5)

Pydantic (for data validation)

Steps to make it work:
Backend:

Step 1 Install Dependencies:
pip install fastapi uvicorn openai

Step 2 Set up your OpenAI key:
openai.api_key = "insert_OpenAPI_key"

Step 3 Run the server:
uvicorn main:app --reload

Frontend:

Step 1 Navigate to the frontend folder:
cd frontend

Step 2 Install frontend dependencies:
npm install

Step 3 Start Vite dev server:
npm run dev

App runs on:
Frontend → http://localhost:5173
Backend → http://localhost:8000

🧪 Features In Action
✅ Chat memory with context

✅ Voice input (🎤 button)

✅ Confidence score + severity label

✅ Feedback submission (yes/no)

✅ Local history (max 10 items)

✅ Tailwind styling (no external CSS)

📝 Notes
Speech input only works in Chrome (uses webkitSpeechRecognition)

Feedback is just stored in memory (feedback_storage[])