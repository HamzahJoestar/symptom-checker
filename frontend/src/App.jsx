import { useState } from "react";
import InputForm from "./components/InputForm";

function App() {
  // This keeps track of all user and assistant messages
  const [messages, setMessages] = useState([]);
  // Loading state for when we’re waiting on the server
  const [loading, setLoading] = useState(false);
  // Store any error messages
  const [error, setError] = useState("");
  // Tracks which messages the user already gave feedback on
  const [feedbackGiven, setFeedbackGiven] = useState({});

  // Load previous searches from localStorage, or start fresh
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem("symptomHistory");
    return saved ? JSON.parse(saved) : [];
  });

  // Setup for speech recognition
  let recognition = null;
  if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
    recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
  }
  

  // Handles submitting the symptom to the backend
  const handleSymptomSubmit = async (text) => {
    setLoading(true);
    setError("");

    // Add the new symptom to the top of the history (max 10 items)
    const updatedHistory = [text, ...searchHistory.slice(0, 9)];
    setSearchHistory(updatedHistory);
    localStorage.setItem("symptomHistory", JSON.stringify(updatedHistory));

    try {
      // Add user message to the conversation
      const updatedMessages = [...messages, { role: "user", content: text }];

      // Send all messages (context) to the server
      const response = await fetch("http://localhost:8000/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) throw new Error("Server error");

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Add assistant response to messages
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: data.reply,
          severity: data.severity,
          confidence: data.confidence,
        },
      ]);
    } catch (err) {
      console.error("Error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Sends feedback (yes/no) to the backend and hides the buttons
  const sendFeedback = async (messageId, messageContent, wasHelpful) => {
    try {
      const response = await fetch("http://localhost:8000/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageContent, wasHelpful }),
      });

      if (response.ok) {
        // Mark this message as having received feedback
        setFeedbackGiven((prev) => ({ ...prev, [messageId]: true }));
        alert("Thanks for your feedback!");
      } else {
        console.error("Failed to submit feedback");
      }
    } catch (err) {
      console.error("Error sending feedback:", err);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto font-sans">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">Symptom Checker</h1>
      <InputForm onSubmit={handleSymptomSubmit} />

      <div className="space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded ${
              msg.role === "user"
                ? "bg-blue-100 text-right"
                : "bg-green-100 text-left"
            }`}
          >
            <p>
              <strong>{msg.role === "user" ? "You" : "Assistant"}:</strong>{" "}
              {msg.content}
            </p>

            {/* Only show feedback buttons if this is an assistant message and hasn’t been rated yet */}
            {msg.role === "assistant" && !feedbackGiven[i] && (
              <div className="mt-1 text-sm">
                Was this helpful?
                <button
                  className="ml-2 px-2 py-1 bg-green-200 hover:bg-green-300 rounded"
                  onClick={() => sendFeedback(i, msg.content, true)}
                >
                  Yes
                </button>
                <button
                  className="ml-2 px-2 py-1 bg-red-200 hover:bg-red-300 rounded"
                  onClick={() => sendFeedback(i, msg.content, false)}
                >
                  No
                </button>
              </div>
            )}

            {/* Show extra info like severity and confidence */}
            {msg.role === "assistant" && (
              <p className="text-sm text-gray-500">
                [Severity: {msg.severity} | Confidence: {msg.confidence}]
              </p>
            )}
          </div>
        ))}

        {loading && <p className="text-gray-500">Thinking...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {/* Show search history if available */}
        {searchHistory.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Search History</h2>
            <ul className="list-disc ml-5 text-sm text-gray-700">
              {searchHistory.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <button
              className="mt-2 px-2 py-1 bg-red-100 hover:bg-red-200 text-sm rounded"
              onClick={() => {
                setSearchHistory([]);
                localStorage.removeItem("symptomHistory");
              }}
            >
              Clear History
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
