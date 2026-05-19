import React, { useEffect, useRef, useState } from 'react';
import type { Character, Message } from '../types';
import TypingIndicator from './TypingIndicator';
import { sendMessage } from '../services/api';
import { saveMessage, clearMessages } from '../services/supabase';

interface ChatViewProps {
  character: Character;
  messages: Message[];
  onMessagesChange: (msgs: Message[]) => void;
  onEditCharacter: (char: Character) => void;
}

function formatTime(ts: string | undefined): string {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatView({
  character,
  messages,
  onMessagesChange,
  onEditCharacter,
}: ChatViewProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    setError(null);

    const userMsg: Message = {
      character_id: character.id,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    onMessagesChange(updatedMessages);
    setIsLoading(true);

    // Save user message to DB (skip for seoa — worker handles it)
    if (character.id !== 'seoa') {
      await saveMessage({ character_id: character.id, role: 'user', content: text }).catch(
        () => {} // non-blocking
      );
    }

    try {
      const reply = await sendMessage(character, text, updatedMessages);
      const assistantMsg: Message = {
        character_id: character.id,
        role: 'assistant',
        content: reply,
        created_at: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      onMessagesChange(finalMessages);

      // Save assistant message to DB (skip for seoa — worker handles it)
      if (character.id !== 'seoa') {
        await saveMessage({
          character_id: character.id,
          role: 'assistant',
          content: reply,
        }).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했어요');
      // Rollback user message on error
      onMessagesChange(messages);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = async () => {
    if (!confirm(`${character.name}와의 대화를 모두 삭제할까요?`)) return;
    if (character.id !== 'seoa') {
      await clearMessages(character.id).catch(() => {});
    }
    onMessagesChange([]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Banner */}
      <header
        className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white shadow-sm"
        style={{ borderTopColor: character.color, borderTopWidth: 3 }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden flex-shrink-0"
            style={{ backgroundColor: character.color }}
          >
            {character.avatar_url ? (
              <img
                src={character.avatar_url}
                alt={character.name}
                className="w-full h-full object-cover"
              />
            ) : (
              character.name.slice(0, 2)
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-tight">{character.name}</h2>
            <p className="text-xs text-gray-500">
              {character.api_provider} · {character.model || '기본 모델'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            title="대화 초기화"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
          <button
            onClick={() => onEditCharacter(character)}
            title="캐릭터 설정"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
              style={{ backgroundColor: character.color }}
            >
              {character.name.slice(0, 1)}
            </div>
            <p className="text-sm">
              <span className="font-medium text-gray-600">{character.name}</span>와 대화를
              시작해보세요
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id ?? idx}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}
            >
              {/* Avatar (assistant only) */}
              {!isUser && (
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold overflow-hidden"
                  style={{ backgroundColor: character.color }}
                >
                  {character.avatar_url ? (
                    <img
                      src={character.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    character.name.slice(0, 1)
                  )}
                </div>
              )}

              {/* Bubble */}
              <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[72%]`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    isUser
                      ? 'text-white rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 shadow-sm'
                  }`}
                  style={isUser ? { backgroundColor: character.color } : {}}
                >
                  {msg.content}
                </div>
                {msg.created_at && (
                  <span className="text-[10px] text-gray-400 mt-1 px-1">
                    {formatTime(msg.created_at)}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-end gap-2">
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold overflow-hidden"
              style={{ backgroundColor: character.color }}
            >
              {character.avatar_url ? (
                <img src={character.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                character.name.slice(0, 1)
              )}
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-2 py-1">
              <TypingIndicator />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-xl">
              {error}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 bg-white border-t border-gray-200">
        <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 px-4 py-2 focus-within:border-gray-400 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${character.name}에게 메시지 보내기...`}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-800 placeholder-gray-400 max-h-32 py-1.5"
            style={{ lineHeight: '1.5' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = el.scrollHeight + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
            style={{ backgroundColor: character.color }}
            title="전송 (Enter)"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 19V5m-7 7l7-7 7 7"
              />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
          Enter로 전송 · Shift+Enter로 줄바꿈
        </p>
      </div>
    </div>
  );
}
