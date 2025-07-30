// Import the useState hook to manage local state
import { useState } from "react";

// This component handles user input, either by typing or using voice
function InputForm({ onSubmit }) {
  // State to hold the text from the input field
  const [text, setText] = useState("");
  // State to track if the mic is currently listening
  const [listening, setListening] = useState(false);

  // When the form is submitted (typed input), prevent page reload and send the text
  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim()); // send cleaned-up text to parent
      setText(""); // clear input after submit
    }
  };

  // This function handles voice input using the Web Speech API
  const startVoiceInput = () => {
    // Check if the browser supports speech recognition
    if (!("webkitSpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    // Create a new speech recognition instance
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US"; // set language
    recognition.interimResults = false; // we only want final results
    recognition.continuous = false; // stop automatically after one sentence

    // Update state when voice input starts
    recognition.onstart = () => setListening(true);
    // Reset state when it ends
    recognition.onend = () => setListening(false);

    // When we get the result, update the text input with the spoken words
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript); // fill input with speech result
    };

    // If there's an error, log it and stop listening
    recognition.onerror = (err) => {
      console.error("Speech recognition error:", err);
      setListening(false);
    };

    recognition.start(); // start listening
  };

  return (
    // Form with input box, submit button, and mic button
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        className="flex-grow p-2 border border-gray-300 rounded"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)} // update text on typing
        placeholder="Enter your symptom"
      />
      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Send
      </button>
      <button
        type="button"
        onClick={startVoiceInput}
        // change mic button color based on listening state
        className={`px-3 py-2 rounded ${
          listening ? "bg-yellow-400" : "bg-gray-200"
        }`}
        title="Speak your symptom"
      >
        🎤
      </button>
    </form>
  );
}

export default InputForm;
