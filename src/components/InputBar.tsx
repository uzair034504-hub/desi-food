import { useRef, useState } from "react";
import { ImagePlus, MapPin, Send, X } from "lucide-react";

interface Props {
  onSend: (text: string, imageFile?: File) => void;
  onFindStores?: (ingredient: string) => void;
  disabled?: boolean;
}

export function InputBar({ onSend, onFindStores, disabled }: Props) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSend() {
    if (!text.trim() && !imageFile) return;
    onSend(text.trim(), imageFile ?? undefined);
    setText("");
    clearImage();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="input-bar-wrap">
      {imagePreview && (
        <div className="image-preview-strip">
          <div className="image-preview">
            <img src={imagePreview} alt="Selected ingredients" />
            <button onClick={clearImage} aria-label="Remove image">
              <X size={10} />
            </button>
          </div>
        </div>
      )}

      <div className="input-bar">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <button
          className="icon-btn"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Ingredient ki photo lagayein"
          title="Ingredient ki photo lagayein"
        >
          <ImagePlus size={18} />
        </button>

        {onFindStores && (
          <button
            className="icon-btn"
            onClick={() => {
              const ingredient = window.prompt(
                "Kaunsa ingredient nahi mil raha? (e.g. qourma masala)",
              );
              if (ingredient) onFindStores(ingredient);
            }}
            aria-label="Nearby stores dhoondein"
            title="Nearby stores dhoondein"
          >
            <MapPin size={18} />
          </button>
        )}

        <textarea
          rows={1}
          placeholder="Koi recipe, masala, ya sauce puchein..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <button
          className="send-btn"
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !imageFile)}
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
