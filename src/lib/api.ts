import type { Conversation, Message } from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Anonymous local user id — no login system needed for this MVP.
 * Stored in the browser so a visitor's chat history persists across reloads.
 */
export function getUserId(): string {
  const key = "dastarkhwan_user_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function createConversation(title = "New chat"): Promise<Conversation> {
  return request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ user_id: getUserId(), title }),
  });
}

export async function listConversations(): Promise<Conversation[]> {
  return request(`/api/conversations?user_id=${getUserId()}`);
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  return request(`/api/conversations/${conversationId}/messages`);
}

export async function askAssistant(
  message: string,
  conversationId: string,
  imageUrl?: string,
  imagePath?: string,
): Promise<{ answer: string; source: "db" | "llm" | "vision" }> {
  return request("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      user_id: getUserId(),
      conversation_id: conversationId,
      message,
      image_url: imageUrl ?? null,
      image_path: imagePath ?? null,
    }),
  });
}

export async function uploadIngredientPhoto(file: File): Promise<{ url: string; path: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");

  return res.json();
}

export async function findNearbyStores(
  lat: number,
  lng: number,
  ingredient: string,
): Promise<{ reply: string }> {
  return request("/api/stores", {
    method: "POST",
    body: JSON.stringify({ lat, lng, ingredient }),
  });
}

/** Wraps the browser's geolocation API in a promise. */
export function getBrowserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}
