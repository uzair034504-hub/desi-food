import { ChefHat, User } from "lucide-react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isUser ? "bg-tadka-chili" : "bg-tadka-turmeric"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-tadka-cream" />
        ) : (
          <ChefHat className="w-4 h-4 text-tadka-dark" />
        )}
      </div>

      <div
        className={`max-w-[78%] md:max-w-[65%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
          isUser
            ? "bg-tadka-turmericDim/40 text-tadka-cream border border-tadka-turmeric/30"
            : "bg-tadka-panel text-tadka-cream border border-tadka-border"
        }`}
      >
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Uploaded"
            className="mb-2 max-h-56 w-auto rounded-xl border border-tadka-border object-cover"
          />
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
