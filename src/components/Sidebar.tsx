import { Plus } from "lucide-react";
import { BrandMark } from "./BrandMark";
import type { Conversation } from "../lib/types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export function Sidebar({ conversations, activeId, onSelect, onNewChat }: Props) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <BrandMark />
        <span className="brand-name">Dastarkhwan AI</span>
      </div>

      <button className="new-chat-btn" onClick={onNewChat}>
        <Plus size={16} />
        Nayi Recipe Puchein
      </button>

      <div className="conversation-list">
        {conversations.map((c) => (
          <button
            key={c.id}
            className={`conversation-item ${c.id === activeId ? "active" : ""}`}
            onClick={() => onSelect(c.id)}
          >
            {c.title}
          </button>
        ))}
      </div>
    </aside>
  );
}
