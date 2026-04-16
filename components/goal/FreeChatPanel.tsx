'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, Send, MessageCircle, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useChatStore } from '@/lib/store/chatStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

interface FreeChatPanelProps {
  goalText: string;
  aiUnderstanding: string | null;
  isVisible: boolean;
}

export function FreeChatPanel({ goalText, aiUnderstanding, isVisible }: FreeChatPanelProps) {
  const { messages, addMessage, addStreamingMessage, appendToStreamingMessage } = useChatStore();
  const [input, setInput] = useState('');
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const config = useSettingsStore((s) => s.config);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streamingId !== null) return;

    addMessage({ role: 'user', content: text });
    setInput('');

    const id = `stream-${Date.now()}`;
    setStreamingId(id);
    addStreamingMessage(id);

    try {
      const allMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: text },
      ];

      const res = await fetch('/api/ai/free-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalText,
          aiUnderstanding,
          messages: allMessages,
          compatType: config.compatType,
          baseURL: config.baseURL,
          apiKey: config.apiKey,
          model: config.model,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          appendToStreamingMessage(id, chunk);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`提问失败: ${message}`);
    } finally {
      setStreamingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isLoading = streamingId !== null;

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full">
      <Card className="flex flex-col h-full border-0 rounded-none shadow-none">
        <CardContent className="flex flex-col flex-1 p-0 min-h-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8 text-muted-foreground">
                <MessageCircle className="h-8 w-8 mb-3 opacity-30" />
                <p className="text-sm font-medium">向 AI 自由提问</p>
                <p className="text-xs mt-1 max-w-[200px]">
                  可以询问背景知识、方案对比、领域常识，帮助你更好地定义目标
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center mt-0.5 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {msg.role === 'user'
                    ? <User className="h-3.5 w-3.5" />
                    : <Bot className="h-3.5 w-3.5" />
                  }
                </div>
                {msg.role === 'user' ? (
                  <div className="rounded-lg px-3 py-2 text-sm max-w-[85%] bg-primary text-primary-foreground ml-auto whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                ) : (
                  <div className="rounded-lg px-3 py-2 text-sm max-w-[85%] bg-muted min-w-[40px]">
                    {msg.content === '' && msg.id === streamingId ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t shrink-0">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入问题（Enter 发送，Shift+Enter 换行）"
                className="min-h-[60px] max-h-[120px] text-sm resize-none"
                disabled={isLoading}
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="self-end h-9 w-9 p-0"
              >
                {isLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />
                }
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
