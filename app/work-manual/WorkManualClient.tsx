'use client';

import { useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';

interface WorkManualItem {
  id: string;
  fileName: string;
  blobUrl: string;
  createdAt: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  sourceFile?: string | null;
  sourceExcerpt?: string | null;
}

interface FaqItem {
  rank: number;
  question: string;
  answer: string;
  askCount: number;
}

export default function WorkManualClient({ isAdmin }: { isAdmin: boolean }) {
  const [manuals, setManuals] = useState<WorkManualItem[]>([]);
  const [manualsLoading, setManualsLoading] = useState(true);
  const [manualsError, setManualsError] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState('');
  const [openSourceIndex, setOpenSourceIndex] = useState<number | null>(null);

  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(true);
  const [faqError, setFaqError] = useState('');
  const [openFaqRank, setOpenFaqRank] = useState<number | null>(null);

  const loadManuals = async () => {
    setManualsLoading(true);
    setManualsError('');
    try {
      const res = await fetch('/api/work-manual');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || '매뉴얼 목록을 불러오는 중 오류가 발생했습니다.');
      setManuals(data.manuals ?? []);
    } catch (err) {
      setManualsError(err instanceof Error ? err.message : '매뉴얼 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setManualsLoading(false);
    }
  };

  useEffect(() => {
    loadManuals();

    (async () => {
      setFaqLoading(true);
      setFaqError('');
      try {
        const res = await fetch('/api/work-manual/faq');
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.error) throw new Error(data.error || '자주묻는질문을 불러오는 중 오류가 발생했습니다.');
        setFaq(data.faq ?? []);
      } catch (err) {
        setFaqError(err instanceof Error ? err.message : '자주묻는질문을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setFaqLoading(false);
      }
    })();
  }, []);

  const handleFilesSelected = async (files: File[]) => {
    const nonPdf = files.some((f) => f.type !== 'application/pdf');
    if (nonPdf) {
      setUploadError('PDF 파일만 업로드할 수 있습니다.');
      return;
    }

    setUploading(true);
    setUploadError('');
    const failed: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(files.length > 1 ? `업로드 및 분석 중... (${i + 1}/${files.length}) ${file.name}` : '업로드 및 분석 중...');
      try {
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/work-manual/blob-upload',
        });
        const res = await fetch('/api/work-manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blobUrl: blob.url, fileName: file.name }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.error) throw new Error(data.error || '매뉴얼 등록에 실패했습니다.');
      } catch (err) {
        failed.push(`${file.name}: ${err instanceof Error ? err.message : '업로드 실패'}`);
      }
    }

    if (failed.length > 0) setUploadError(failed.join('\n'));
    setUploadProgress('');
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await loadManuals();
  };

  const handleDeleteManual = async (id: string) => {
    if (!confirm('이 매뉴얼을 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/work-manual/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || '매뉴얼 삭제에 실패했습니다.');
      await loadManuals();
    } catch (err) {
      setManualsError(err instanceof Error ? err.message : '매뉴얼 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateManual = async (id: string) => {
    setUpdatingId(id);
    setUpdateError('');
    try {
      const res = await fetch(`/api/work-manual/${id}/update`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || '업데이트본 생성에 실패했습니다.');
      await loadManuals();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : '업데이트본 생성에 실패했습니다.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking) return;

    setAskError('');
    setQuestion('');
    const history: { question: string; answer: string }[] = [];
    for (let i = 0; i + 1 < messages.length; i += 2) {
      if (messages[i].role === 'user' && messages[i + 1].role === 'assistant') {
        history.push({ question: messages[i].text, answer: messages[i + 1].text });
      }
    }
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setAsking(true);

    try {
      const res = await fetch('/api/work-manual/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || '답변 생성에 실패했습니다.');

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.answer,
          sourceFile: data.sourceFile,
          sourceExcerpt: data.sourceExcerpt,
        },
      ]);
    } catch (err) {
      setAskError(err instanceof Error ? err.message : '답변 생성에 실패했습니다.');
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-48px)] flex-col items-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">업무매뉴얼</p>
        <h1 className="mt-3 mb-6 text-2xl font-semibold text-slate-900">매뉴얼 질의응답</h1>

        {isAdmin && (
          <div className="mb-6 rounded-2xl border border-dashed border-slate-300 p-5">
            <p className="mb-3 text-sm font-medium text-slate-700">매뉴얼 업로드 (PDF)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              disabled={uploading}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length > 0) handleFilesSelected(files);
              }}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
            />
            {uploading && <p className="mt-2 text-sm text-slate-500">{uploadProgress}</p>}
            {uploadError && <p className="mt-2 whitespace-pre-wrap text-sm text-red-600">{uploadError}</p>}
          </div>
        )}

        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-slate-700">등록된 매뉴얼</p>
          {manualsLoading && <p className="text-sm text-slate-500">불러오는 중...</p>}
          {!manualsLoading && manualsError && <p className="text-sm text-red-600">{manualsError}</p>}
          {!manualsLoading && !manualsError && manuals.length === 0 && (
            <p className="text-sm text-slate-500">등록된 매뉴얼이 없습니다.</p>
          )}
          {!manualsLoading && !manualsError && manuals.length > 0 && (
            <ul className="space-y-1">
              {manuals.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 text-sm text-slate-600">
                  <span className="truncate">{m.fileName}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {new Date(m.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                    <a
                      href={m.blobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={m.fileName}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700"
                    >
                      다운로드
                    </a>
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateManual(m.id)}
                          disabled={updatingId === m.id}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updatingId === m.id ? '생성 중...' : '업데이트본 생성'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteManual(m.id)}
                          disabled={deletingId === m.id}
                          className="text-xs font-medium text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === m.id ? '삭제 중...' : '삭제'}
                        </button>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {isAdmin && updateError && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-red-600">{updateError}</p>
          )}
        </div>

        <div className="border-t border-slate-100 pt-6">
          <p className="mb-3 text-sm font-medium text-slate-700">매뉴얼에게 질문하기</p>

          <div className="mb-4 max-h-96 space-y-3 overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-sm text-slate-400">업무매뉴얼 내용에 대해 궁금한 점을 물어보세요.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.role === 'assistant' && m.sourceExcerpt && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setOpenSourceIndex(openSourceIndex === i ? null : i)}
                        className="text-xs font-medium text-slate-500 underline hover:text-slate-700"
                      >
                        {openSourceIndex === i ? '관련 내용 닫기' : '관련 내용 미리보기'}
                      </button>
                      {openSourceIndex === i && (
                        <blockquote className="mt-2 whitespace-pre-wrap rounded-xl border-l-4 border-slate-300 bg-white p-3 text-xs text-slate-600">
                          {m.sourceFile && (
                            <p className="mb-1 font-semibold text-slate-500">출처: {m.sourceFile}</p>
                          )}
                          {m.sourceExcerpt}
                        </blockquote>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {asking && <p className="text-sm text-slate-400">답변 생성 중...</p>}
          </div>

          {askError && <p className="mb-2 text-sm text-red-600">{askError}</p>}

          <form onSubmit={handleAsk} className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="예: 휴가 신청은 어떻게 하나요?"
              disabled={asking}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              전송
            </button>
          </form>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <p className="mb-1 text-sm font-medium text-slate-700">자주 묻는 질문 TOP 15</p>
          <p className="mb-3 text-xs text-slate-400">실제 질문 기록을 바탕으로 매주 자동 업데이트됩니다.</p>

          {faqLoading && <p className="text-sm text-slate-500">불러오는 중...</p>}
          {!faqLoading && faqError && <p className="text-sm text-red-600">{faqError}</p>}
          {!faqLoading && !faqError && faq.length === 0 && (
            <p className="text-sm text-slate-500">아직 집계된 자주묻는질문이 없습니다.</p>
          )}
          {!faqLoading && !faqError && faq.length > 0 && (
            <ul className="space-y-1">
              {faq.map((item) => {
                const isOpen = openFaqRank === item.rank;
                return (
                  <li key={item.rank} className="rounded-xl border border-slate-100">
                    <button
                      type="button"
                      onClick={() => setOpenFaqRank(isOpen ? null : item.rank)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-slate-800 hover:bg-slate-50"
                    >
                      <span className="truncate">
                        <span className="mr-2 text-slate-400">{item.rank}.</span>
                        {item.question}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">{item.askCount}회</span>
                    </button>
                    {isOpen && (
                      <p className="whitespace-pre-wrap border-t border-slate-100 px-3 py-2.5 text-sm text-slate-600">
                        {item.answer}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
