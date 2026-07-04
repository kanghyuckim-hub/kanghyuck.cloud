'use client';

import { useState } from 'react';

export default function MailPage() {
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
    <div className="flex min-h-[calc(100vh-48px)] flex-col items-center justify-center bg-slate-50 px-4 py-12">
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
    </div>
  );
}
