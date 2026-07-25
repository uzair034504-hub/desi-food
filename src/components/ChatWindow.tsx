import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "../lib/types";

interface Props {
  messages: Message[];
  isThinking: boolean;
  onSuggestionClick: (text: string) => void;
}

const SUGGESTIONS = [
  "Chicken Qeema kaise banayein?",
  "Qourma masala ka recipe do",
  "Zinger burger ki fries sauce kaise banti hai?",
];

export function ChatWindow({ messages, isThinking, onSuggestionClick }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  if (messages.length === 0) {
    return (
      <div className="chat-scroll">
        <div className="empty-state">
          <h1>Aaj kya banana hai?</h1>
          <p>
            Koi bhi desi ya fast-food recipe puchein, masala ya sauce ka tareeqa jaanein, ya
            ingredients ki photo bhej ke poochein "isse kya ban sakta hai".
          </p>
          <div className="suggestion-chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" onClick={() => onSuggestionClick(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-scroll">
      <div className="chat-inner">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {isThinking && (
          <div className="message-row assistant">
            <div className="avatar assistant">AI</div>
            <div className="bubble assistant">
              <div className="typing-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
