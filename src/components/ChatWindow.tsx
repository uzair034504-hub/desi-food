import { useRef, useState } from "react";
import { Menu, ImagePlus, Send, X, ChefHat } from "lucide-react";
import Sidebar, { ChatSummary } from "./Sidebar";
import MessageBubble, { ChatMessage } from "./MessageBubble";

const SUGGESTIONS = ["Chicken Karahi", "Achar Gosht", "Chaat Masala", "Seekh Kebab"];

const INITIAL_CHATS: ChatSummary[] = [
  { id: "c1", title: "Chicken Karahi ki recipe", group: "Aaj" },
  { id: "c2", title: "Tamarind sauce substitute", group: "Kal" },
  { id: "c3", title: "Garam masala ratio", group: "Pichle 7 din" },
];

export default function ChatApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats] = useState<ChatSummary[]>(INITIAL_CHATS);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>({});
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeMessages = activeChatId ? messagesByChat[activeChatId] ?? [] : [];
  const isWelcome = !activeChatId;

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleSend = () => {
    if (!input.trim() && !imagePreview) return;

    const chatId = activeChatId ?? crypto.randomUUID();
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      imageUrl: imagePreview ?? undefined,
    };
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Ji zaroor! Ye recipe/masala ke baare mein poori detail jald dunga — quantities, tarika aur tips sab shamil honge.",
    };

    setMessagesByChat((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] ?? []), userMsg, assistantMsg],
    }));
    setActiveChatId(chatId);
    setInput("");
    setImagePreview(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-svh w-full bg-tadka-dark overflow-hidden">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => setActiveChatId(id)}
        onNewChat={() => setActiveChatId(null)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="relative flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-tadka-border/60 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Chats dekhein"
            className="md:hidden text-tadka-cream hover:opacity-70 transition-opacity"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display text-xl text-tadka-cream md:hidden select-none">
            tadka
          </span>
        </div>

        {isWelcome ? (
          <WelcomeState
            input={input}
            setInput={setInput}
            imagePreview={imagePreview}
            setImagePreview={setImagePreview}
            fileInputRef={fileInputRef}
            onImagePick={handleImagePick}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto tadka-scroll px-4 md:px-8 py-6">
              <div className="max-w-[760px] mx-auto flex flex-col gap-5">
                {activeMessages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
              </div>
            </div>
            <div className="px-4 md:px-8 pb-5 pt-2 flex-shrink-0">
              <div className="max-w-[760px] mx-auto">
                <Composer
                  input={input}
                  setInput={setInput}
                  imagePreview={imagePreview}
                  setImagePreview={setImagePreview}
                  fileInputRef={fileInputRef}
                  onImagePick={handleImagePick}
                  onSend={handleSend}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ComposerProps {
  input: string;
  setInput: (v: string) => void;
  imagePreview: string | null;
  setImagePreview: (v: string | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onImagePick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

function Composer({
  input,
  setInput,
  imagePreview,
  setImagePreview,
  fileInputRef,
  onImagePick,
  onSend,
  onKeyDown,
}: ComposerProps) {
  return (
    <div className="relative w-full bg-white/[0.05] border-[1.5px] border-tadka-turmeric/30 rounded-karahi shadow-[0_0_20px_rgba(0,0,0,0.25)] backdrop-blur-[18px] overflow-hidden">
      {imagePreview && (
        <div className="flex items-center gap-2 px-4 pt-4">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-14 w-14 rounded-lg object-cover border border-tadka-border"
            />
            <button
              onClick={() => setImagePreview(null)}
              aria-label="Image hatayein"
              className="absolute -top-2 -right-2 bg-tadka-chili rounded-full p-0.5"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onImagePick}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          aria-label="Tasveer upload karein"
          className="w-11 h-11 flex-shrink-0 rounded-full bg-transparent border border-white/20 flex items-center justify-center transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-tadka-turmeric"
        >
          <ImagePlus className="w-[18px] h-[18px] text-tadka-cream" />
        </button>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Kisi recipe, masala ya sauce ke baare mein poochain..."
          rows={1}
          className="flex-1 resize-none bg-transparent text-tadka-cream placeholder:text-tadka-muted text-[15px] py-2.5 focus:outline-none max-h-32"
        />

        <button
          onClick={onSend}
          aria-label="Bhejein"
          className="w-11 h-11 flex-shrink-0 rounded-full bg-tadka-turmeric flex items-center justify-center transition-all hover:bg-[#f0b854] active:scale-95"
        >
          <Send className="w-[18px] h-[18px] text-tadka-dark" />
        </button>
      </div>
    </div>
  );
}

function WelcomeState({
  input,
  setInput,
  imagePreview,
  setImagePreview,
  fileInputRef,
  onImagePick,
  onSend,
  onKeyDown,
}: ComposerProps) {
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center px-6 pb-16 overflow-hidden">
      {/* ambient steam */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-tadka-turmeric/10 blur-[100px]" />
        {[0, 1.5, 3, 4.5].map((delay, i) => (
          <div
            key={i}
            className="absolute bottom-1/3 rounded-full bg-tadka-cream/20 blur-2xl animate-steam"
            style={{
              left: `${44 + i * 4}%`,
              width: "60px",
              height: "60px",
              animationDelay: `${delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-[2] flex flex-col items-center text-center max-w-[560px]">
        <div className="w-14 h-14 rounded-2xl bg-tadka-turmeric/15 border border-tadka-turmeric/30 flex items-center justify-center mb-6">
          <ChefHat className="w-7 h-7 text-tadka-turmeric" />
        </div>
        <h1 className="font-display text-[clamp(32px,5.5vw,52px)] text-tadka-cream leading-[1.1] mb-3">
          Kya banayen aaj?
        </h1>
        <p className="font-sans text-base md:text-lg text-tadka-muted leading-relaxed mb-8">
          Kisi bhi recipe, masale ya sauce ke baare mein poochain — ya kisi dish ki tasveer bhejein, main pehchan ke bata dunga.
        </p>

        <div className="w-[min(620px,88vw)]">
          <Composer
            input={input}
            setInput={setInput}
            imagePreview={imagePreview}
            setImagePreview={setImagePreview}
            fileInputRef={fileInputRef}
            onImagePick={onImagePick}
            onSend={onSend}
            onKeyDown={onKeyDown}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs md:text-sm px-3.5 py-2 rounded-full border border-tadka-border text-tadka-muted hover:text-tadka-cream hover:border-tadka-turmeric/50 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
