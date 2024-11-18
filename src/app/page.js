"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    const eventSource = new EventSource("/api/stream-messages");

    eventSource.onmessage = (event) => {
      const newMessage = JSON.parse(event.data);
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    };

    return () => eventSource.close();
  }, []);

  const sendMessage = async () => {
    if (!username || !content) return;

    await fetch("/api/send-messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, content }),
    });

    setContent("");
  };

  return (
    <div className="min-h-screen p-4 text-white">
      <h1 className="text-2xl font-bold mb-4">Chat Room</h1>
      <div className="border p-4 mb-4 max-h-96 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className="mb-2">
            <strong>{msg.username}</strong>: {msg.content}
          </div>
        ))}
      </div>

      <input
        type="text"
        placeholder="Your name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="border text-black p-2 mr-2"
      />
      <input
        type="text"
        placeholder="Type a message"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="border text-black p-2 mr-2"
      />
      <button onClick={sendMessage} className="bg-blue-500 text-white p-2">
        Send
      </button>
    </div>
  );
}
