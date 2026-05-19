import { useEffect, useState } from 'react';
import type { Character, Message } from './types';
import {
  fetchCharacters,
  upsertCharacter,
  deleteCharacter,
  fetchMessages,
  clearMessages,
} from './services/supabase';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import CharacterEditor from './components/CharacterEditor';
import EmptyState from './components/EmptyState';

export default function App() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messagesByChar, setMessagesByChar] = useState<Record<string, Message[]>>({});
  const [loadingChars, setLoadingChars] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load characters from Supabase on mount
  useEffect(() => {
    fetchCharacters()
      .then((chars) => {
        setCharacters(chars);
        const last = localStorage.getItem('companions_last_char');
        if (last && chars.find((c) => c.id === last)) {
          setActiveId(last);
        } else if (chars.length > 0) {
          setActiveId(chars[0].id);
        }
      })
      .catch((e) => console.error('캐릭터 로드 실패:', e))
      .finally(() => setLoadingChars(false));
  }, []);

  // Load messages when active character changes
  useEffect(() => {
    if (!activeId) return;
    if (messagesByChar[activeId]) return;

    fetchMessages(activeId)
      .then((msgs) => {
        setMessagesByChar((prev) => ({ ...prev, [activeId]: msgs }));
      })
      .catch((e) => console.error('메시지 로드 실패:', e));
  }, [activeId]);

  // Persist last active char
  useEffect(() => {
    if (activeId) localStorage.setItem('companions_last_char', activeId);
  }, [activeId]);

  const handleSelectChar = (id: string) => {
    setActiveId(id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleMessagesChange = (characterId: string, msgs: Message[]) => {
    setMessagesByChar((prev) => ({ ...prev, [characterId]: msgs }));
  };

  const handleOpenAdd = () => {
    setEditingChar(null);
    setEditorOpen(true);
  };

  const handleOpenEdit = (char: Character) => {
    setEditingChar(char);
    setEditorOpen(true);
  };

  const handleSaveCharacter = async (char: Character) => {
    const saved = await upsertCharacter(char);
    setCharacters((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setActiveId(saved.id);
    setEditorOpen(false);
  };

  const handleDeleteCharacter = async (id: string) => {
    await deleteCharacter(id);
    if (id !== 'seoa') {
      await clearMessages(id).catch(() => {});
    }
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    setMessagesByChar((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeId === id) {
      const remaining = characters.filter((c) => c.id !== id);
      setActiveId(remaining[0]?.id ?? null);
    }
    setEditorOpen(false);
  };

  const activeCharacter = characters.find((c) => c.id === activeId) ?? null;
  const activeMessages = activeId ? (messagesByChar[activeId] ?? []) : [];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen((o) => !o)}
        className="fixed top-3 left-3 z-30 p-2 rounded-xl bg-gray-900 text-white shadow-lg md:hidden"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed md:static z-20 h-full transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar
          characters={characters}
          activeId={activeId}
          onSelect={handleSelectChar}
          onAddCharacter={handleOpenAdd}
        />
      </div>

      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0">
        {loadingChars ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            로딩 중...
          </div>
        ) : activeCharacter ? (
          <ChatView
            character={activeCharacter}
            messages={activeMessages}
            onMessagesChange={(msgs) => handleMessagesChange(activeCharacter.id, msgs)}
            onEditCharacter={handleOpenEdit}
          />
        ) : (
          <EmptyState onAdd={handleOpenAdd} />
        )}
      </main>

      {/* Character editor modal */}
      {editorOpen && (
        <CharacterEditor
          character={editingChar}
          onSave={handleSaveCharacter}
          onDelete={handleDeleteCharacter}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
}
