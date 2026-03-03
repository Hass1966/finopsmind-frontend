import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, User, ChevronUp } from 'lucide-react';
import { getChatHistory, streamChat } from '../lib/api';
import type { ChatMessage } from '../types/api';

const WELCOME_MSG: ChatMessage = {
  role: 'assistant',
  content:
    "Hello! I'm your FinOps AI assistant. Ask me about your cloud costs, budgets, anomalies, or optimization opportunities.",
};

const PAGE_SIZE = 20;

export function ChatSidebar({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history on mount
  useEffect(() => {
    let cancelled = false;
    getChatHistory({ page: 1, page_size: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        const history = res.data;
        const items: ChatMessage[] = (history.data ?? [])
          .map((m) => ({ role: m.role, content: m.content }))
          .reverse();
        const total = history.pagination?.total ?? 0;
        setHasMore(total > PAGE_SIZE);
        setPage(1);
        setMessages(items.length > 0 ? items : [WELCOME_MSG]);
        setHistoryLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setHistoryLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  // Load older messages
  const loadMore = useCallback(async () => {
    const nextPage = page + 1;
    try {
      const res = await getChatHistory({ page: nextPage, page_size: PAGE_SIZE });
      const history = res.data;
      const older: ChatMessage[] = (history.data ?? [])
        .map((m) => ({ role: m.role, content: m.content }))
        .reverse();
      const total = history.pagination?.total ?? 0;
      setHasMore(nextPage * PAGE_SIZE < total);
      setPage(nextPage);
      setMessages((prev) => [...older, ...prev]);
    } catch {
      // silently ignore
    }
  }, [page]);

  const send = useCallback(() => {
    if (!input.trim() || loading || streaming) return;
    const msg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    setStreaming(true);

    abortRef.current = streamChat(
      msg,
      // onChunk — first chunk replaces the typing indicator
      (text) => {
        setLoading(false); // hide typing dots
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && last === streamingRef.current) {
            return [...prev.slice(0, -1), { role: 'assistant', content: last.content + text }];
          }
          const newMsg: ChatMessage = { role: 'assistant', content: text };
          streamingRef.current = newMsg;
          return [...prev, newMsg];
        });
      },
      // onDone
      (_response, _intent) => {
        setStreaming(false);
        setLoading(false);
        streamingRef.current = null;
      },
      // onError
      (err) => {
        setStreaming(false);
        setLoading(false);
        streamingRef.current = null;
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Sorry, something went wrong: ${err}` },
        ]);
      },
    );
  }, [input, loading, streaming]);

  const streamingRef = useRef<ChatMessage | null>(null);

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary-600" />
          <span className="font-semibold">AI Assistant</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Load more */}
        {hasMore && historyLoaded && (
          <button
            onClick={loadMore}
            className="flex items-center gap-1 mx-auto text-xs text-primary-600 hover:text-primary-800 transition-colors"
          >
            <ChevronUp className="w-3 h-3" />
            Load more
          </button>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-600" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator — shown until first token arrives */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary-600" />
            </div>
            <div className="bg-gray-100 rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask about your costs..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            onClick={send}
            disabled={loading || streaming || !input.trim()}
            className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
