import { Plus, X, MessageCircle, ChefHat } from "lucide-react";

export interface ChatSummary {
  id: string;
  title: string;
  group: "Aaj" | "Kal" | "Pichle 7 din";
}

interface SidebarProps {
  chats: ChatSummary[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const GROUP_ORDER: ChatSummary["group"][] = ["Aaj", "Kal", "Pichle 7 din"];

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  isOpen,
  onClose,
}: SidebarProps) {
  const content = (
    <div className="flex h-full w-72 flex-col bg-tadka-panel border-r border-tadka-border">
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <span className="font-display text-[26px] text-tadka-cream leading-none select-none">
          tadka
        </span>
        <button
          onClick={onClose}
          aria-label="Sidebar band karein"
          className="md:hidden text-tadka-muted hover:text-tadka-cream transition-opacity"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 pb-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 rounded-2xl bg-tadka-turmeric text-tadka-dark font-semibold text-sm px-4 py-3 transition-all hover:bg-[#f0b854] active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Naya Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto tadka-scroll px-3 py-3">
        {GROUP_ORDER.map((group) => {
          const groupChats = chats.filter((c) => c.group === group);
          if (groupChats.length === 0) return null;
          return (
            <div key={group} className="mb-4">
              <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-tadka-muted">
                {group}
              </p>
              <div className="flex flex-col gap-0.5">
                {groupChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => onSelectChat(chat.id)}
                    className={`flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-sm transition-colors truncate ${
                      chat.id === activeChatId
                        ? "bg-tadka-panelLight text-tadka-cream"
                        : "text-tadka-muted hover:bg-tadka-panelLight hover:text-tadka-cream"
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 flex-shrink-0 opacity-70" />
                    <span className="truncate">{chat.title}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2.5 border-t border-tadka-border px-5 py-4">
        <div className="w-8 h-8 rounded-full bg-tadka-chili flex items-center justify-center flex-shrink-0">
          <ChefHat className="w-4 h-4 text-tadka-cream" />
        </div>
        <div className="text-xs text-tadka-muted leading-tight">
          <p className="text-tadka-cream font-medium">Aap ka rasoi assistant</p>
          <p>Recipes • Masalas • Sauces</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: static column */}
      <div className="hidden md:block h-full">{content}</div>

      {/* Mobile: overlay drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="absolute inset-y-0 left-0 animate-[slideIn_0.2s_ease-out]">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
