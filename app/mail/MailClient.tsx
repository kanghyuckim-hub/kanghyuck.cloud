'use client';

import { useEffect, useState } from 'react';

interface MailMessageItem {
  id: string;
  fromAddress: string | null;
  fromName: string | null;
  toAddress: string | null;
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  receivedAt: string | null;
  createdAt: string;
}

export default function MailPage() {
  const [tab, setTab] = useState<'compose' | 'inbox'>('compose');

  return (
    <div className="flex min-h-[calc(100vh-48px)] flex-col items-center bg-slate-50 px-4 py-12">
      <div className="mb-6 flex w-full max-w-lg gap-2 rounded-full bg-slate-200/60 p-1">
        <button
          type="button"
          onClick={() => setTab('compose')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === 'compose' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          메일쓰기
        </button>
        <button
          type="button"
          onClick={() => setTab('inbox')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === 'inbox' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          메일함
        </button>
      </div>

      {tab === 'compose' ? <ComposeTab /> : <InboxTab />}
    </div>
  );
}

function ComposeTab() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setMessage('');

    try {
      const res = await fetch('/api/send-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || '전송 실패');

      setStatus('success');
      setMessage('메일이 성공적으로 전송되었습니다.');
      setTo('');
      setSubject('');
      setBody('');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : '메일 전송에 실패했습니다.');
    }
  };

  return (
    <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-10 shadow-xl">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
        메일 발송
      </p>
      <h1 className="mt-3 mb-8 text-2xl font-semibold text-slate-900">메일 보내기</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="to" className="mb-1.5 block text-sm font-medium text-slate-700">
              받는 사람
            </label>
            <input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              placeholder="example@email.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div>
            <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-slate-700">
              제목
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder="메일 제목을 입력하세요"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div>
            <label htmlFor="body" className="mb-1.5 block text-sm font-medium text-slate-700">
              내용
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={7}
              placeholder="메일 내용을 입력하세요..."
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          {message && (
            <p
              className={`rounded-xl px-4 py-3 text-sm font-medium ${
                status === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'sending' ? '전송 중...' : '메일 전송'}
          </button>
        </form>
    </div>
  );
}

function InboxTab() {
  const [messages, setMessages] = useState<MailMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/mail');
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || data.error) throw new Error(data.error || '메일함을 불러오는 중 오류가 발생했습니다.');
        setMessages(data.messages ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '메일함을 불러오는 중 오류가 발생했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-10 shadow-xl">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">받은 메일함</p>
      <h1 className="mt-3 mb-8 text-2xl font-semibold text-slate-900">메일함</h1>

      {loading && <p className="text-sm text-slate-500">불러오는 중...</p>}

      {!loading && error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>
      )}

      {!loading && !error && messages.length === 0 && (
        <p className="text-sm text-slate-500">받은 메일이 없습니다.</p>
      )}

      {!loading && !error && messages.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {messages.map((m) => {
            const isOpen = openId === m.id;
            return (
              <li key={m.id} className="py-3">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : m.id)}
                  className="flex w-full flex-col items-start text-left"
                >
                  <div className="flex w-full items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-slate-900">
                      {m.subject || '(제목 없음)'}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {m.receivedAt ? new Date(m.receivedAt).toLocaleString('ko-KR') : ''}
                    </span>
                  </div>
                  <span className="mt-0.5 truncate text-xs text-slate-500">
                    {m.fromName ? `${m.fromName} <${m.fromAddress}>` : m.fromAddress}
                  </span>
                  {!isOpen && <span className="mt-1 truncate text-sm text-slate-600">{m.snippet}</span>}
                </button>
                {isOpen && (
                  <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                    {m.bodyText || m.snippet || '내용을 표시할 수 없습니다.'}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
