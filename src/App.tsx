import { useEffect, useState } from "react";
import "./App.css";
import { Sidebar } from "./components/Sidebar";
import { ChatWindow } from "./components/ChatWindow";
import { InputBar } from "./components/InputBar";
import type { Conversation, Message } from "./lib/types";
import {
  askAssistant,
  createConversation,
  findNearbyStores,
  getBrowserLocation,
  listConversations,
  listMessages,
  uploadIngredientPhoto,
} from "./lib/api";

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    listConversations()
      .then(setConversations)
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    listMessages(activeId).then(setMessages);
  }, [activeId]);

  async function handleNewChat() {
    const conv = await createConversation();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
  }

  async function handleSend(text: string, imageFile?: File) {
    if (!text && !imageFile) return;

    let conversationId = activeId;
    if (!conversationId) {
      const conv = await createConversation(text.slice(0, 40) || "Ingredient photo");
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      conversationId = conv.id;
    }

    let imageUrl: string | undefined;
    let imagePath: string | undefined;
    if (imageFile) {
      const uploaded = await uploadIngredientPhoto(imageFile);
      imageUrl = uploaded.url;
      imagePath = uploaded.path;
    }

    const userContent = text || "Ye ingredients available hain, ye batao inse kya ban sakta hai.";

    // Optimistically show the user's message right away
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        conversation_id: conversationId!,
        role: "user",
        content: userContent,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      },
    ]);
    setIsThinking(true);

    try {
      const { answer, source } = await askAssistant(userContent, conversationId, imageUrl, imagePath);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          conversation_id: conversationId!,
          role: "assistant",
          content: answer,
          source,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          conversation_id: conversationId!,
          role: "assistant",
          content: "Kuch masla ho gaya hai. Backend chal raha hai ya nahi check karein.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  async function handleFindStores(ingredient: string) {
    if (!ingredient.trim()) return;

    let conversationId = activeId;
    if (!conversationId) {
      const conv = await createConversation(`${ingredient} store search`);
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      conversationId = conv.id;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        conversation_id: conversationId!,
        role: "user",
        content: `Mujhe "${ingredient}" ke liye nearby stores dikhayein`,
        created_at: new Date().toISOString(),
      },
    ]);
    setIsThinking(true);

    try {
      const { lat, lng } = await getBrowserLocation();
      const { reply } = await findNearbyStores(lat, lng, ingredient);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          conversation_id: conversationId!,
          role: "assistant",
          content: reply,
          source: "db",
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          conversation_id: conversationId!,
          role: "assistant",
          content:
            "Location access nahi mil saka. Browser mein location permission allow karein aur dobara try karein.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="app-shell">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNewChat={handleNewChat}
      />
      <div className="chat-area">
        <div className="chat-topbar">
          <div>
            <p className="eyebrow">Desi kitchen concierge</p>
            <h2>Recipe, masala & photo assistant</h2>
          </div>
          <div className="status-pill">Live • AI powered</div>
        </div>
        <ChatWindow
          messages={messages}
          isThinking={isThinking}
          onSuggestionClick={(text) => handleSend(text)}
        />
        <InputBar onSend={handleSend} onFindStores={handleFindStores} disabled={isThinking} />
      </div>
    </div>
  );
}
