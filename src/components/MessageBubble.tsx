import type { Message } from "../lib/types";

interface Props {
  message: Message;
}

/** Very small markdown-lite renderer: handles **bold** lines, nothing fancier needed here. */
function renderContent(content: string) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div className={`avatar ${isUser ? "user" : "assistant"}`}>{isUser ? "Aap" : "AI"}</div>
      <div className={`bubble ${isUser ? "user" : "assistant"}`}>
        {message.image_url && (
          <img src={message.image_url} alt="Uploaded ingredients" className="ingredient-photo" />
        )}
        {renderContent(message.content)}
        {!isUser && message.source && (
          <div className={`source-tag ${message.source}`}>
            {message.source === "db"
              ? "Verified recipe"
              : message.source === "vision"
                ? "Photo se pehchana gaya"
                : "AI generated · under review"}
          </div>
        )}
      </div>
    </div>
  );
}
