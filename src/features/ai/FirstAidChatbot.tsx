import { useState } from 'react';
import { Bot, Send, ShieldAlert, UserRound } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string };

const starter: Message = { role: 'assistant', content: 'Xin chào. Tôi có thể giúp bạn ôn tập sơ cứu và xử lý tình huống ban đầu. Nếu có nguy hiểm, hãy gọi 115 trước.' };

export function FirstAidChatbot() {
  const [messages, setMessages] = useState<Message[]>([starter]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || loading) return;
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next); setInput(''); setError(''); setLoading(true);
    try {
      const response = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Không thể kết nối trợ lý.');
      setMessages([...next, { role: 'assistant', content: payload.message }]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Trợ lý đang tạm bận.'); }
    finally { setLoading(false); }
  };

  return <section className="editorial-surface flex flex-col gap-4 rounded-3xl p-4 sm:p-6" aria-labelledby="first-aid-chat-title">
    <div className="flex items-start gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><Bot aria-hidden="true" /></div><div><h2 id="first-aid-chat-title" className="text-lg font-bold text-foreground">Trợ lý sơ cứu</h2><p className="text-sm text-muted">Hỏi về kỹ năng, tình huống luyện tập hoặc bước xử trí ban đầu.</p></div></div>
    <div className="flex max-h-80 flex-col gap-3 overflow-y-auto rounded-2xl bg-background p-3" aria-live="polite">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface text-foreground'}`}>{message.role === 'assistant' && <Bot className="mb-1 inline size-3" aria-hidden="true" />} {message.role === 'user' && <UserRound className="mb-1 mr-1 inline size-3" aria-hidden="true" />}{message.content}</div></div>)}{loading && <p className="text-sm text-muted">Đang suy nghĩ...</p>}</div>
    <div className="flex gap-2"><label htmlFor="first-aid-chat-input" className="sr-only">Tin nhắn</label><input id="first-aid-chat-input" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) void sendMessage(); }} placeholder="Bạn muốn hỏi điều gì?" className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /><button type="button" onClick={() => void sendMessage()} disabled={loading || !input.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Send className="size-4" aria-hidden="true" />Gửi</button></div>
    <p className="flex items-start gap-1 text-xs text-muted"><ShieldAlert className="mt-0.5 size-3 shrink-0" aria-hidden="true" />Không thay thế nhân viên y tế. Tình huống khẩn cấp: gọi 115.</p>{error && <p role="alert" className="text-sm text-primary">{error}</p>}
  </section>;
}
