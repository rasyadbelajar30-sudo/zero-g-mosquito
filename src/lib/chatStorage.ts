// File: src/lib/chatStorage.ts

export interface ChatAttachment {
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
  data?: string; // Base64 data without prefix
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
  searchedWeb?: boolean;
  timestamp?: number;
  attachment?: ChatAttachment;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

const STORAGE_KEY_SESSIONS = 'zerog_mosquito_chat_sessions_v1';
const STORAGE_KEY_ACTIVE_ID = 'zerog_mosquito_active_session_id';

export const WELCOME_MESSAGE_TEXT =
  'Halo! Saya Zero-G AI Assistant. Saya siap menjawab pertanyaan apapun, menganalisis gambar/video yang Anda lampirkan, menjalankan perintah, dan menjelajahi informasi dari internet. Ada yang ingin Anda diskusikan atau analisis?';

export function createDefaultWelcomeMessage(): ChatMessage {
  return {
    id: 'welcome',
    role: 'model',
    text: WELCOME_MESSAGE_TEXT,
    timestamp: Date.now()
  };
}

export function createNewSession(initialTitle = 'Percakapan Baru'): ChatSession {
  const newSession: ChatSession = {
    id: crypto.randomUUID(),
    title: initialTitle,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [createDefaultWelcomeMessage()]
  };
  return newSession;
}

export function loadAllSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to load chat sessions from localStorage:', err);
    return [];
  }
}

export function saveAllSessions(sessions: ChatSession[]): void {
  try {
    // Sanitize heavy media before writing to localStorage to prevent QuotaExceededError
    const sanitized = sessions.map((sess) => ({
      ...sess,
      messages: sess.messages.map((m) => {
        if (!m.attachment) return m;
        return {
          ...m,
          attachment: {
            name: m.attachment.name,
            type: m.attachment.type,
            size: m.attachment.size,
            previewUrl:
              m.attachment.type.startsWith('image/') &&
              m.attachment.previewUrl &&
              m.attachment.previewUrl.length < 60000
                ? m.attachment.previewUrl
                : undefined
          }
        };
      })
    }));
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sanitized));
  } catch (err) {
    console.error('Failed to save chat sessions to localStorage:', err);
  }
}

export function getStoredActiveSessionId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
  } catch {
    return null;
  }
}

export function setStoredActiveSessionId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
  } catch (err) {
    console.error('Failed to save active session ID:', err);
  }
}

export function deriveSessionTitle(firstUserQuestion: string): string {
  const clean = firstUserQuestion.replace(/[^\w\s-]/gi, '').trim();
  if (!clean) return 'Percakapan Baru';
  if (clean.length <= 32) return clean;
  return clean.slice(0, 32).trim() + '...';
}

export function formatSessionTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });

  if (isToday) {
    return `Hari ini, ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Kemarin, ${timeStr}`;
  }

  return `${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, ${timeStr}`;
}
