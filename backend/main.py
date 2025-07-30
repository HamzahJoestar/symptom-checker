from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import re
import openai

# Set your OpenAI API key
openai.api_key = "insert_OpenAPI_key"

app = FastAPI()

# Allow frontend on localhost:5173 to make requests to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define structure of a single message (either user or assistant)
class Message(BaseModel):
    role: str
    content: str

# Define the format of the request the frontend sends
class SymptomRequest(BaseModel):
    messages: List[Message]

# Basic keyword matching to help identify likely conditions
condition_keywords = {
    "measles": ["measles", "rash", "koplik spots"],
    "covid": ["covid", "coronavirus", "loss of smell", "dry cough"],
    "heart attack": ["heart attack", "chest pain", "radiating pain", "tightness"],
    "angina": ["angina", "pressure", "tightness", "chest discomfort"],
    "arthritis": ["arthritis", "joint swelling", "joint pain", "stiff joints"],
    "gout": ["gout", "uric acid", "swollen toe", "joint inflammation"],
    "lupus": ["lupus", "autoimmune", "rash", "joint pain"],
    "flu": ["flu", "influenza", "body aches", "fever", "chills"],
    "food poisoning": ["food poisoning", "vomiting", "diarrhea", "nausea"],
    "hypoglycemia": ["hypoglycemia", "low blood sugar", "shaking", "dizzy"],
    "pulmonary embolism": ["pulmonary embolism", "shortness of breath", "chest pain", "clot"],
    "DVT": ["dvt", "deep vein thrombosis", "leg swelling", "calf pain"],
    "anemia": ["anemia", "low iron", "fatigue", "pale skin"],
    "depression": ["depression", "low mood", "lack of motivation", "hopelessness"],
    "oral herpes": ["oral herpes", "cold sores", "blisters", "tingling lips"],
    "dehydration": ["dehydration", "dry mouth", "thirst", "dark urine"],
    "diabetes": ["diabetes", "high blood sugar", "thirst", "frequent urination"],
    "Sjogren’s syndrome": ["sjogren", "dry eyes", "dry mouth", "autoimmune"],
    "hypothyroidism": ["hypothyroidism", "slow metabolism", "fatigue", "cold intolerance"]
}

# This looks at the user's symptom and checks if it contains known keywords for any conditions
def match_condition(symptom_text):
    text = symptom_text.lower()
    matched_conditions = []

    for condition, keywords in condition_keywords.items():
        if any(keyword in text for keyword in keywords):
            matched_conditions.append(condition)

    return matched_conditions if matched_conditions else ["No match in library"]

# This asks the LLM to rate the severity level: Mild, Moderate, or Emergency
def get_severity(symptom_text: str) -> str:
    severity_prompt = [
        {"role": "system", "content": "You are a medical assistant. Classify the severity of the user's symptom as one of the following: Mild, Moderate, or Emergency."},
        {"role": "user", "content": f"How severe is this symptom: '{symptom_text}'?"}
    ]

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=severity_prompt,
            temperature=0.2,
            max_tokens=10
        )
        severity = response.choices[0].message["content"].strip()
        # Normalize LLM response so we don't get weird casing or partial words
        if "emergency" in severity.lower():
            return "Emergency"
        elif "moderate" in severity.lower():
            return "Moderate"
        else:
            return "Mild"
    except Exception as e:
        return "Mild"  # fallback if LLM fails

# Checks how well the LLM response matches the keywords for each predicted condition
def get_confidence_score(llm_text: str, matched_conditions: List[str]):
    llm_text_lower = llm_text.lower()
    matched = 0

    for condition in matched_conditions:
        keywords = condition_keywords.get(condition.lower(), [])
        if any(kw in llm_text_lower for kw in keywords):
            matched += 1

    total = len(matched_conditions)
    if total == 0:
        return {"match": "0% match", "confidence": "0% confidence"}

    confidence = int((matched / total) * 100)
    return {
        "match": f"{matched} of {total} matched",
        "confidence": f"{confidence}% confidence"
    }

# This handles the full logic: calls the LLM, analyzes severity, match, confidence
def get_structured_output(messages: List[Message]):
    try:
        # Convert Pydantic model objects to regular Python dicts
        plain_messages = [m.model_dump() for m in messages]

        # Clean old [Severity | Confidence] tags from assistant messages
        for m in plain_messages:
            if m["role"] == "assistant":
                m["content"] = re.sub(r"\[Severity:.*?\| Confidence:.*?\]", "", m["content"]).strip()

        # Add system message to guide the LLM's behavior
        full_messages = [{"role": "system", "content": "You are a helpful medical assistant. Give the user options for what they most likely are dealing with and rank them based on likelihood and treatments for these as well"}] + plain_messages

        # Call OpenAI API
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=full_messages,
            temperature=0.5,
            max_tokens=300
        )
        reply = response.choices[0].message["content"].strip()

        # Get the user's latest symptom text
        last_user_input = [m.content for m in messages if m.role == "user"][-1]
        matched = match_condition(last_user_input)
        severity = get_severity(last_user_input)
        confidence = get_confidence_score(reply, matched)

        return {
            "reply": reply,
            "severity": severity,
            "confidence": confidence["confidence"],
            "matched_conditions": matched,
            "match_quality": confidence["match"]
        }

    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc()}

# Endpoint that handles symptom checking requests from frontend
@app.post("/check")
def check_symptom(req: SymptomRequest):
    return get_structured_output(req.messages)

# Store feedback submissions in memory for now
feedback_storage = []

# Endpoint to receive feedback from the frontend
@app.post("/feedback")
def submit_feedback(feedback: Dict = Body(...)):
    feedback_storage.append(feedback)
    return {"message": "Feedback received!"}

# Endpoint to view submitted feedback (just for demo/testing)
@app.get("/feedback")
def get_feedback():
    return {"feedback": feedback_storage}
