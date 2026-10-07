// File: src/components/MosquitoAI.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Send,
  User,
  Loader2,
  Sparkles,
  Globe,
  History,
  Plus,
  Trash2,
  X,
  MessageSquare,
  Clock,
  Paperclip,
  Film,
  FileText,
  AlertCircle
} from 'lucide-react';
import { GoogleGenerativeAI, type Content, type Part } from '@google/generative-ai';
import {
  type ChatMessage,
  type ChatAttachment,
  type ChatSession,
  createNewSession,
  loadAllSessions,
  saveAllSessions,
  getStoredActiveSessionId,
  setStoredActiveSessionId,
  deriveSessionTitle,
  formatSessionTime
} from '../lib/chatStorage';
import { BatikKawungPattern, BatikCorner } from './BatikDecorations';

export type { ChatMessage };

const WELCOME_ID = 'welcome';
const CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];

function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-bold text-teal-200">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-slate-200">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-white/10 text-teal-300 font-mono text-[11px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function FormattedMessage({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${idx}`}
            className="p-3 my-2 rounded-xl bg-slate-950/80 border border-white/10 overflow-x-auto text-xs font-mono text-teal-300"
          >
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    if (!trimmed) {
      elements.push(<div key={`sp-${idx}`} className="h-1.5" />);
      return;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${idx}`} className="font-bold text-xs sm:text-sm text-teal-300 mt-2 mb-1">
          {formatInline(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3
          key={`h2-${idx}`}
          className="font-bold text-sm text-white mt-2.5 mb-1 border-b border-white/10 pb-0.5"
        >
          {formatInline(trimmed.slice(3))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${idx}`} className="font-bold text-base text-teal-300 mt-3 mb-1.5">
          {formatInline(trimmed.slice(2))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('> ')) {
      elements.push(
        <div
          key={`quote-${idx}`}
          className="border-l-2 border-teal-400 bg-teal-500/10 px-3 py-1.5 rounded-r-xl my-1.5 text-xs text-teal-200"
        >
          {formatInline(trimmed.slice(2))}
        </div>
      );
      return;
    }

    if (/^[*•-]\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[*•-]\s+/, '');
      elements.push(
        <div key={`li-${idx}`} className="flex items-start gap-2 my-1 text-slate-100 pl-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0 shadow-[0_0_6px_rgba(45,212,191,0.5)]" />
          <div className="flex-1 leading-relaxed text-xs sm:text-sm">{formatInline(content)}</div>
        </div>
      );
      return;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={`num-${idx}`} className="flex items-start gap-2 my-1 text-slate-100 pl-0.5">
          <span className="text-[10px] font-bold text-teal-300 bg-teal-500/15 border border-teal-500/30 rounded-md px-1.5 py-0.2 shrink-0 mt-0.5">
            {numMatch[1]}
          </span>
          <div className="flex-1 leading-relaxed text-xs sm:text-sm">{formatInline(numMatch[2])}</div>
        </div>
      );
      return;
    }

    elements.push(
      <p key={`p-${idx}`} className="leading-relaxed text-xs sm:text-sm my-0.5">
        {formatInline(line)}
      </p>
    );
  });

  return <div className="space-y-0.5">{elements}</div>;
}

function getSystemInstruction(): string {
  const now = new Date();
  const currentDateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const currentYear = now.getFullYear();

  return `Kamu adalah "Zero-G AI Assistant", asisten kecerdasan buatan serbabisa, penjelajah informasi digital lintas waktu, dan analis prediktif canggih di aplikasi Zero-G Mosquito.

TEMPORAL CONTEXT & WAKTU SISTEM SAAT INI:
- Tanggal & Waktu Sistem: ${currentDateStr}, Jam: ${now.toLocaleTimeString('id-ID')}.
- Tahun Sistem Saat Ini: ${currentYear}.

KUALITAS TATA BAHASA & ADAPTABILITAS KEBUTUHAN PENGGUNA (CRITICAL MANDATE):
1. TATA KATA & STRUKTUR BAHASA UNGGUL:
   - Gunakan Bahasa Indonesia yang sangat luwes, mengalir alami, kaya kosakata yang tepat, komunikatif, dan terstruktur rapi.
   - Hindari kalimat kaku, repetitif, atau berbelit-belit. Sajikan informasi secara jernih, tajam, dan elegan.
2. ADAPTIF TERHADAP KEBUTUHAN PENGGUNA (User-Centric Adaptive Delivery):
   - JIKA PENGGUNA MEMINTA DISINGKAT / RINGKAS (misal: "singkatkan", "ringkas", "padat", "buat pendek", "poin inti", "to the point"):
     • Sajikan ringkasan eksekutif super padat (concise executive summary).
     • Gunakan poin-poin tebal (**bold bullet points**), langsung ke inti tanpa kalimat pembuka atau penutup yang bertele-tele.
   - JIKA PENGGUNA MEMINTA DETAIL / MENDALAM:
     • Sajikan uraian komprehensif, mencakup latar belakang, data perbandingan, analisis sebab-akibat, dan mekanisme solutif.
   - JIKA PENGGUNA MEMINTA FORMAT TERTENTU (Langkah bernomor, checklist, tabel, dsb.):
     • Patuhi format yang diminta 100%.
3. PENEKANAN VISUAL TIPOGRAFI (BOLDING & LISTS):
   - Secara aktif TEBALKAN (**bold**) kata kunci utama, subjek penting, data numerik, dan istilah ilmiah agar pesan enak dibaca cepat (skimmable) dan nyaman di mata pengguna.
   - Gunakan daftar berpoin (•) atau penomoran (1, 2, 3) untuk menyusun poin-poin penting.
4. EKSPLORASI SEMUA TAHUN & PEMODELAN PREDIKTIF:
   - Jelajahi semua tahun tanpa batasan (Masa Lalu, Masa Kini ${currentYear}, dan Masa Depan 2026, 2027, 2030+).
   - Buat peramalan dan analisis prediktif berbasis pemodelan tren (Skenario Optimis, Moderat, dan Pesimis) jika ditanyakan data/tren masa depan.
5. SPESIALISASI KESEHATAN MASYARAKAT & UMUM:
   - Layani topik kesehatan (nyamuk, DBD, sanitasi) maupun topik umum (sains, teknologi, kehidupan) dengan ramah, cerdas, dan solutif.
6. KONTINUITAS & FOKUS PERCAKAPAN:
   - Jaga fokus pada subjek aktif terakhir tanpa mencampurkan topik lama yang tidak relevan.`;
}

const QUICK_PROMPTS = [
  'Prediksi tren kasus DBD tahun 2026 & masa depan',
  'Cara basmi jentik di bak mandi',
  'Jelajahi sejarah penemuan nyamuk Wolbachia',
  'Tips hidup sehat & sanitasi lingkungan'
];

// Detect if query is a conversational follow-up where blind web search could pollute context
function isConversationalFollowUp(query: string): boolean {
  const q = query.toLowerCase().trim();
  if (q.length < 3) return true;

  const acknowledgments = ['ok', 'oke', 'baik', 'baiklah', 'siap', 'terima kasih', 'makasih', 'thanks', 'halo', 'hai', 'p'];
  if (acknowledgments.includes(q)) return true;

  // Never treat year-based or predictive queries as generic follow-ups
  if (/\b(19\d\d|20\d\d)\b/.test(q)) return false;
  if (
    q.includes('prediksi') ||
    q.includes('proyeksi') ||
    q.includes('ramalan') ||
    q.includes('tren') ||
    q.includes('perkiraan') ||
    q.includes('masa depan') ||
    q.includes('tahun')
  ) {
    return false;
  }

  const followUpTriggers = [
    'ringkas', 'rangkum', 'simpulkan', 'kesimpulan', 'jelaskan lagi', 'jelaskan lebih lanjut',
    'lanjut', 'lanjutkan', 'terus', 'lalu', 'tugasnya apa', 'fungsinya apa', 'maksudnya',
    'kenapa begitu', 'mengapa begitu', 'siapa dia', 'apa itu tadi', 'seperti apa',
    'apa bedanya', 'kenapa', 'mengapa', 'buatkan poin', 'coba jelaskan'
  ];

  return followUpTriggers.some((kw) => q === kw || q.startsWith(kw + ' ') || q.endsWith(' ' + kw));
}

// Helper to query live encyclopedic web data
async function searchInternet(query: string): Promise<string | null> {
  try {
    const cleanQuery = query.replace(/[^\w\s]/gi, ' ').trim();
    if (!cleanQuery) return null;

    // Search Indonesian Wikipedia first
    let endpoint = `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      cleanQuery
    )}&utf8=&format=json&origin=*`;

    let res = await fetch(endpoint, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) return null;

    let data = await res.json();
    let results = data.query?.search;

    // Fallback to English Wikipedia if no results in Indonesian
    if (!results || results.length === 0) {
      endpoint = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        cleanQuery
      )}&utf8=&format=json&origin=*`;
      res = await fetch(endpoint, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        data = await res.json();
        results = data.query?.search;
      }
    }

    if (!results || results.length === 0) return null;

    const snippets = results.slice(0, 3).map((item: { title: string; snippet: string }) => {
      const cleanSnippet = item.snippet.replace(/<\/?[^>]+(>|$)/g, '');
      return `• [Sumber: ${item.title}]: ${cleanSnippet}...`;
    });

    return snippets.join('\n');
  } catch {
    return null;
  }
}

export default function MosquitoAI() {
  // Persistent multi-session management
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const loaded = loadAllSessions();
    if (loaded.length > 0) return loaded;
    const initial = createNewSession();
    saveAllSessions([initial]);
    setStoredActiveSessionId(initial.id);
    return [initial];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const storedId = getStoredActiveSessionId();
    const loaded = loadAllSessions();
    if (storedId && loaded.some((s) => s.id === storedId)) {
      return storedId;
    }
    if (loaded.length > 0) return loaded[0].id;
    return '';
  });

  const [selectedAttachment, setSelectedAttachment] = useState<ChatAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatusText, setLoadingStatusText] = useState('Sedang menganalisis jawaban...');
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Active session and messages derivation (guaranteed at least 1 session in state)
  const currentSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = useMemo(() => currentSession?.messages || [], [currentSession]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleCreateNewSession = () => {
    const newSess = createNewSession();
    const updated = [newSess, ...sessions];
    setSessions(updated);
    setActiveSessionId(newSess.id);
    setStoredActiveSessionId(newSess.id);
    saveAllSessions(updated);
    setIsHistoryOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setStoredActiveSessionId(id);
    setIsHistoryOpen(false);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = sessions.filter((s) => s.id !== id);
    if (remaining.length === 0) {
      const fresh = createNewSession();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      setStoredActiveSessionId(fresh.id);
      saveAllSessions([fresh]);
    } else {
      setSessions(remaining);
      saveAllSessions(remaining);
      if (activeSessionId === id) {
        setActiveSessionId(remaining[0].id);
        setStoredActiveSessionId(remaining[0].id);
      }
    }
  };

  const handleClearAllSessions = () => {
    if (window.confirm('Hapus semua riwayat percakapan? Tindakan ini akan mengosongkan seluruh riwayat.')) {
      const fresh = createNewSession();
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      setStoredActiveSessionId(fresh.id);
      saveAllSessions([fresh]);
      setIsHistoryOpen(false);
    }
  };

  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const processFile = useCallback((file: File) => {
    setAttachmentError(null);

    // Limit check: 20MB for video, 15MB for images/docs
    const isVideo = file.type.startsWith('video/');
    const maxSizeBytes = isVideo ? 20 * 1024 * 1024 : 15 * 1024 * 1024;
    const maxLabel = isVideo ? '20MB' : '15MB';

    if (file.size > maxSizeBytes) {
      setAttachmentError(
        `Ukuran file "${file.name}" melebihi batas aman ${maxLabel} agar tidak terjadi kegagalan transmisi.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(',')[1];
      if (base64Data) {
        setSelectedAttachment({
          name: file.name || (file.type.startsWith('image/') ? 'Pasted_Image.png' : 'Attachment'),
          type: file.type || 'application/octet-stream',
          size: file.size,
          data: base64Data,
          previewUrl: dataUrl
        });
      }
    };
    reader.onerror = () => {
      setAttachmentError('Gagal membaca file atau gambar yang ditempel. Silakan coba kembali.');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    processFile(file);
  };

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      // 1. Check if there are binary files in clipboard (e.g. copied image/screenshot/video from web or Snipping Tool)
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (
            file &&
            (file.type.startsWith('image/') ||
              file.type.startsWith('video/') ||
              file.type === 'application/pdf')
          ) {
            e.preventDefault();
            processFile(file);
            return;
          }
        }
      }

      // 2. Check if the pasted text is a direct image URL (e.g. https://.../sample.jpg, png, webp)
      const pastedText = e.clipboardData?.getData('text')?.trim();
      if (
        pastedText &&
        /^https?:\/\/.*\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(pastedText)
      ) {
        try {
          const res = await fetch(pastedText, { mode: 'cors' });
          if (res.ok) {
            const blob = await res.blob();
            if (blob.type.startsWith('image/')) {
              e.preventDefault();
              const urlParts = pastedText.split('/');
              const rawFileName =
                urlParts[urlParts.length - 1].split('?')[0] || 'web_image.jpg';
              const file = new File([blob], rawFileName, { type: blob.type });
              processFile(file);
              return;
            }
          }
        } catch {
          // If CORS prevents direct blob fetch, allow normal URL text pasting into input
        }
      }
    },
    [processFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemoveAttachment = () => {
    setSelectedAttachment(null);
    setAttachmentError(null);
  };

  const sendQuery = useCallback(
    async (questionText: string, attachedFile?: ChatAttachment | null) => {
      const attachmentToSend = attachedFile !== undefined ? attachedFile : selectedAttachment;
      const cleanQuestion = questionText.trim();

      // If user provided no text but attached a file, provide a smart default prompt
      let question = cleanQuestion;
      if (!question && attachmentToSend) {
        question = 'Tolong analisis media/file yang saya lampirkan ini secara mendalam, jelaskan objek atau kondisi yang terdeteksi, dan berikan evaluasi lengkapnya.';
      }

      if (!question || isLoading) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text: question,
        timestamp: Date.now(),
        attachment: attachmentToSend
          ? {
              name: attachmentToSend.name,
              type: attachmentToSend.type,
              size: attachmentToSend.size,
              previewUrl: attachmentToSend.previewUrl
            }
          : undefined
      };

      // Reset attachment staging immediately
      setSelectedAttachment(null);
      setAttachmentError(null);

      // Calculate updated title if this is the first user query
      const hasPriorUserMsg = currentSession.messages.some((m) => m.role === 'user');
      const updatedTitle = !hasPriorUserMsg
        ? deriveSessionTitle(attachmentToSend ? `[Media] ${question}` : question)
        : currentSession.title;

      // Update session state with user message
      const updatedMessages = [...currentSession.messages, userMsg];
      const sessionWithUser = {
        ...currentSession,
        title: updatedTitle,
        messages: updatedMessages,
        updatedAt: Date.now()
      };
      const intermediateSessions = sessions.map((s) =>
        s.id === currentSession.id ? sessionWithUser : s
      );
      setSessions(intermediateSessions);
      saveAllSessions(intermediateSessions);

      // Maintain sliding window of last 12 messages from THIS SESSION ONLY (isolated context)
      const validHistory: Content[] = updatedMessages
        .filter((m) => m.id !== WELCOME_ID && !m.isError)
        .slice(-12)
        .map((m) => {
          const textPart = m.attachment
            ? `[Lampiran File/Media Pengguna: ${m.attachment.name} (${m.attachment.type})]\n${m.text}`
            : m.text;
          return { role: m.role, parts: [{ text: textPart }] };
        });

      setInput('');
      setIsLoading(true);
      setLoadingStatusText(
        attachmentToSend
          ? 'Memproses & menganalisis media yang dilampirkan...'
          : 'Memproses pertanyaan...'
      );

      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) throw new Error('API Key belum diatur di .env.local');

        let webContext = '';
        let usedWeb = false;

        // Only perform live web search if enabled and NOT a pure conversational follow-up/summary
        const isFollowUp = isConversationalFollowUp(question);
        if (isWebSearchEnabled && !isFollowUp && !attachmentToSend) {
          setLoadingStatusText('Menjelajah web untuk informasi terkini...');
          const webData = await searchInternet(question);
          if (webData) {
            usedWeb = true;
            webContext = webData;
          }
        }

        setLoadingStatusText(
          attachmentToSend
            ? 'AI sedang menganalisis visual media...'
            : 'AI sedang menyusun jawaban...'
        );

        const genAI = new GoogleGenerativeAI(apiKey);
        let replyText = '';
        let lastError: unknown = null;

        // Query with candidate models fallback
        for (const modelName of CANDIDATE_MODELS) {
          try {
            const model = genAI.getGenerativeModel({
              model: modelName,
              systemInstruction: getSystemInstruction()
            });
            const chat = model.startChat({ history: validHistory });

            // Formulate prompt with safe web context isolation
            const promptWithContext = webContext
              ? `${question}\n\n[Informasi Tambahan Web Terkini]:\n${webContext}\n\n(Catatan: Gunakan data web di atas HANYA jika relevan dengan pertanyaan spesifik pengguna di atas. Utamakan kesinambungan percakapan yang sedang berjalan.)`
              : question;

            let messagePayload: string | Array<string | Part> = promptWithContext;
            if (attachmentToSend && attachmentToSend.data) {
              messagePayload = [
                {
                  inlineData: {
                    data: attachmentToSend.data,
                    mimeType: attachmentToSend.type
                  }
                },
                { text: promptWithContext }
              ];
            }

            const result = await chat.sendMessage(messagePayload);
            replyText = result.response.text();
            if (replyText) break;
          } catch (err) {
            lastError = err;
          }
        }

        if (!replyText) {
          throw lastError || new Error('Semua model AI sedang sibuk');
        }

        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'model',
          text: replyText,
          searchedWeb: usedWeb,
          timestamp: Date.now()
        };

        const finalMessages = [...updatedMessages, aiMsg];
        const finalSession = {
          ...sessionWithUser,
          messages: finalMessages,
          updatedAt: Date.now()
        };
        const finalSessions = sessions.map((s) =>
          s.id === currentSession.id ? finalSession : s
        );
        setSessions(finalSessions);
        saveAllSessions(finalSessions);
      } catch {
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'model',
          text: 'Maaf, koneksi ke server AI sedang padat atau format media tidak didukung. Silakan coba kirim ulang dalam beberapa detik.',
          isError: true,
          timestamp: Date.now()
        };
        const errorMessages = [...updatedMessages, errorMsg];
        const errorSession = {
          ...sessionWithUser,
          messages: errorMessages,
          updatedAt: Date.now()
        };
        const errorSessions = sessions.map((s) =>
          s.id === currentSession.id ? errorSession : s
        );
        setSessions(errorSessions);
        saveAllSessions(errorSessions);
      } finally {
        setIsLoading(false);
        setLoadingStatusText('Sedang menganalisis jawaban...');
      }
    },
    [sessions, currentSession, isWebSearchEnabled, isLoading, selectedAttachment]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(input);
  };

  return (
    <div
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col h-[520px] rounded-3xl overflow-hidden shadow-2xl transition-all bg-gradient-to-br from-[#0c2016] via-[#07150f] to-[#040a07] border ${
        isDraggingOver ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-amber-500/25'
      }`}
    >
      <BatikKawungPattern opacity={0.06} className="text-emerald-400" />
      <BatikCorner className="absolute top-2.5 right-2.5 text-amber-400/40 rotate-90" />
      <BatikCorner className="absolute bottom-2.5 left-2.5 text-amber-400/40 -rotate-90" />
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md border-2 border-dashed border-teal-400 rounded-3xl flex flex-col items-center justify-center p-6 text-center pointer-events-none animate-in fade-in duration-150">
          <Paperclip size={40} className="text-teal-400 mb-3 animate-bounce" />
          <span className="text-base font-bold text-white mb-1">Lepaskan File di Sini</span>
          <span className="text-xs text-teal-300 max-w-xs">
            Foto, video, atau dokumen PDF akan otomatis dilampirkan ke AI.
          </span>
          <span className="text-[11px] text-slate-400 mt-2">
            Tip: Kamu juga bisa tekan <strong className="text-teal-300">Ctrl + V</strong> untuk paste gambar langsung dari internet atau screenshot!
          </span>
        </div>
      )}

      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-slate-900/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-sm" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white tracking-tight truncate">
              Konsultasi AI Vektor Nyamuk
            </span>
            <span className="text-[10px] text-emerald-400 font-medium truncate max-w-[130px] sm:max-w-[200px]">
              {currentSession.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* History Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all cursor-pointer border ${
              isHistoryOpen
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Buka Riwayat Percakapan"
          >
            <History size={11} className="text-emerald-400" />
            <span>Riwayat ({sessions.length})</span>
          </button>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={handleCreateNewSession}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-300 transition-all cursor-pointer"
            title="Mulai Sesi Percakapan Baru"
          >
            <Plus size={11} />
            <span className="hidden sm:inline">Baru</span>
          </button>

          {/* Web Search Toggle Pill */}
          <button
            type="button"
            onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all cursor-pointer border ${
              isWebSearchEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
            title="Nyalakan/Matikan penjelajahan internet"
          >
            <Globe size={11} className={isWebSearchEnabled ? 'text-emerald-400 animate-spin-slow' : ''} />
            <span className="hidden xs:inline">{isWebSearchEnabled ? 'Web' : 'Off'}</span>
          </button>
        </div>
      </div>

      {/* Message Chat Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain touch-pan-y">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[88%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : msg.isError
                    ? 'bg-amber-600/80 text-white'
                    : 'bg-slate-800 text-emerald-400 border border-white/10'
                }`}
              >
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div
                className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-emerald-600/90 text-white rounded-tr-none shadow-md'
                    : msg.isError
                    ? 'bg-amber-950/40 border border-amber-500/30 text-amber-200 rounded-tl-none'
                    : 'bg-slate-900/90 text-slate-100 rounded-tl-none border border-white/10 shadow-md'
                }`}
              >
                {/* Render Attached Media in User Message */}
                {msg.attachment && (
                  <div className="mb-2.5 overflow-hidden rounded-xl bg-slate-950/40 border border-white/15">
                    {msg.attachment.type.startsWith('image/') && msg.attachment.previewUrl ? (
                      <img
                        src={msg.attachment.previewUrl}
                        alt={msg.attachment.name}
                        className="max-h-60 w-auto rounded-xl object-contain cursor-pointer hover:opacity-95 transition-opacity"
                        onClick={() => window.open(msg.attachment?.previewUrl, '_blank')}
                      />
                    ) : msg.attachment.type.startsWith('video/') && msg.attachment.previewUrl ? (
                      <video
                        src={msg.attachment.previewUrl}
                        controls
                        className="max-h-56 w-full rounded-xl"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 text-xs text-teal-200">
                        {msg.attachment.type.startsWith('video/') ? (
                          <Film size={16} className="text-teal-400 shrink-0" />
                        ) : (
                          <FileText size={16} className="text-teal-400 shrink-0" />
                        )}
                        <span className="truncate font-medium">{msg.attachment.name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({(msg.attachment.size / (1024 * 1024)).toFixed(1)} MB)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {msg.role === 'user' || msg.isError ? (
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                ) : (
                  <FormattedMessage text={msg.text} />
                )}

                {/* Grounding Source Indicator */}
                {msg.searchedWeb && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center gap-1.5 text-[10px] text-teal-300 font-medium">
                    <Globe size={10} className="text-teal-400" />
                    <span>Terhubung & Terverifikasi melalui Sumber Web</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start items-center gap-2.5 text-slate-400 text-xs">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center animate-pulse">
              <Loader2 size={16} className="animate-spin text-teal-400" />
            </div>
            <span className="text-teal-300 font-medium">{loadingStatusText}</span>
          </div>
        )}
      </div>

      {/* Adaptive Chips / Style Modifiers */}
      <div className="px-4 pb-2 flex gap-1.5 flex-wrap overflow-x-auto">
        {messages.length <= 2 ? (
          QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendQuery(prompt)}
              disabled={isLoading}
              className="text-[11px] bg-white/5 hover:bg-teal-500/10 hover:border-teal-500/40 border border-white/10 text-slate-300 hover:text-teal-300 rounded-full px-3 py-1 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Sparkles size={11} className="text-teal-400" />
              {prompt}
            </button>
          ))
        ) : (
          <>
            <button
              type="button"
              onClick={() =>
                sendQuery(
                  'Tolong singkatkan jawaban di atas menjadi ringkasan yang padat, to the point, dan gunakan kata kunci tebal (bold).'
                )
              }
              disabled={isLoading}
              className="text-[10px] font-medium bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 rounded-full px-2.5 py-0.5 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
              title="Minta AI meringkas jawaban sebelumnya"
            >
              <span>⚡ Singkatkan & Tebalkan</span>
            </button>
            <button
              type="button"
              onClick={() =>
                sendQuery(
                  'Tolong jelaskan secara lebih detail dan mendalam beserta latar belakang, faktor penyebab, dan mekanismenya.'
                )
              }
              disabled={isLoading}
              className="text-[10px] font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-full px-2.5 py-0.5 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
              title="Minta uraian yang lebih komprehensif"
            >
              <span>📖 Uraikan Lebih Detail</span>
            </button>
            <button
              type="button"
              onClick={() =>
                sendQuery(
                  'Tolong susun kembali penjelasan di atas dalam bentuk poin-poin (bullet points) yang terstruktur dan mudah dibaca cepat.'
                )
              }
              disabled={isLoading}
              className="text-[10px] font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-full px-2.5 py-0.5 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
              title="Minta format poin-poin"
            >
              <span>📋 Format Poin-Poin</span>
            </button>
            <button
              type="button"
              onClick={() =>
                sendQuery(
                  'Bagaimana prediksi dan tren proyeksi topik ini untuk tahun 2026 dan masa depan secara menyeluruh?'
                )
              }
              disabled={isLoading}
              className="text-[10px] font-medium bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-full px-2.5 py-0.5 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
              title="Analisis prediktif masa depan"
            >
              <span>🔮 Prediksi 2026+</span>
            </button>
          </>
        )}
      </div>

      {/* Attachment Staged Preview Pill */}
      {selectedAttachment && (
        <div className="px-4 py-2 bg-slate-900/95 border-t border-teal-500/30 flex items-center justify-between gap-2 z-10 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedAttachment.type.startsWith('image/') ? (
              <img
                src={selectedAttachment.previewUrl}
                alt="preview"
                className="w-10 h-10 object-cover rounded-lg border border-teal-500/40 shrink-0 shadow-sm"
              />
            ) : selectedAttachment.type.startsWith('video/') ? (
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0 text-teal-300">
                <Film size={20} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0 text-teal-300">
                <FileText size={20} />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-100 truncate">
                {selectedAttachment.name}
              </div>
              <div className="text-[10px] text-teal-300 flex items-center gap-1.5 mt-0.5">
                <span>{(selectedAttachment.size / (1024 * 1024)).toFixed(1)} MB</span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">Siap Dianalisis AI</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveAttachment}
            className="p-1.5 rounded-full bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
            title="Batal lampirkan"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Attachment Error Notice */}
      {attachmentError && (
        <div className="px-4 py-1.5 bg-rose-950/70 border-t border-rose-500/40 flex items-center gap-2 text-[11px] text-rose-300 z-10">
          <AlertCircle size={14} className="shrink-0 text-rose-400" />
          <span className="truncate flex-1">{attachmentError}</span>
          <button
            type="button"
            onClick={() => setAttachmentError(null)}
            className="text-slate-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 flex items-center gap-2 bg-slate-900/60 z-10">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Attach File Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className={`p-2.5 rounded-full border transition-all cursor-pointer shrink-0 ${
            selectedAttachment
              ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.3)]'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-teal-300'
          }`}
          title="Lampirkan foto, video, atau dokumen untuk dianalisis AI"
        >
          <Paperclip size={16} />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={handlePaste}
          placeholder={
            selectedAttachment
              ? `Beri instruksi analisis untuk ${selectedAttachment.name}... (Opsional)`
              : 'Tanya apa saja, minta analisis, atau paste (Ctrl+V) gambar dari internet...'
          }
          className="flex-1 bg-white/5 border border-white/10 text-white placeholder-slate-400 rounded-full px-4 py-2 text-xs sm:text-sm focus:outline-none focus:border-teal-500 transition-colors"
        />

        <button
          type="submit"
          disabled={isLoading || (!input.trim() && !selectedAttachment)}
          className="bg-emerald-500 text-slate-950 rounded-full p-2.5 hover:bg-emerald-400 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm shrink-0 active:scale-95"
          title="Kirim Pesan"
        >
          <Send size={16} />
        </button>
      </form>

      {/* History Drawer Overlay */}
      {isHistoryOpen && (
        <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-xl flex flex-col p-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Drawer Top Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <History size={16} className="text-emerald-400" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white">Riwayat Percakapan</h3>
                <p className="text-[10px] text-slate-400">
                  {sessions.length} sesi tersimpan di memori perangkat
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsHistoryOpen(false)}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Tutup Riwayat"
            >
              <X size={16} />
            </button>
          </div>

          {/* New Chat Primary Action */}
          <div className="py-3">
            <button
              type="button"
              onClick={handleCreateNewSession}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Plus size={14} />
              <span>+ Mulai Obrolan / Topik Baru</span>
            </button>
          </div>

          {/* Session Cards List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {sessions.map((sess) => {
              const isActive = sess.id === activeSessionId;
              const userMsgCount = sess.messages.filter((m) => m.role === 'user').length;
              return (
                <div
                  key={sess.id}
                  onClick={() => handleSelectSession(sess.id)}
                  className={`group relative p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 group-hover:text-emerald-400'
                      }`}
                    >
                      <MessageSquare size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-200 truncate">
                        {sess.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock size={9} />
                          {formatSessionTime(sess.updatedAt)}
                        </span>
                        <span>•</span>
                        <span>{userMsgCount} pesan</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isActive && (
                      <span className="text-[9px] bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-full font-medium">
                        Aktif
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(sess.id, e)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-80 group-hover:opacity-100"
                      title="Hapus sesi ini"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drawer Bottom Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 text-[10px]">
              Konteks setiap topik terisolasi & tersimpan otomatis.
            </span>
            {sessions.length > 1 && (
              <button
                type="button"
                onClick={handleClearAllSessions}
                className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer text-[10px]"
                title="Hapus semua riwayat"
              >
                <Trash2 size={11} />
                <span>Bersihkan Semua</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
