'use client';

import { useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { LECTURE_CHARACTERS, DEFAULT_LECTURE_CHARACTER, getCharacterEmoji } from '@/lib/lectureCharacters';

interface LectureListItem {
  id: string;
  fileName: string;
  title: string;
  characterKey: string;
  slideCount: number;
  createdAt: string;
}

export default function LecturesClient({ isAdmin }: { isAdmin: boolean }) {
  const [lectures, setLectures] = useState<LectureListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [characterKey, setCharacterKey] = useState(DEFAULT_LECTURE_CHARACTER);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadLectures = async () => {
    setLoading(true);
    setListError('');
    try {
      const res = await fetch('/api/lectures');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || '강의 목록을 불러오는 중 오류가 발생했습니다.');
      setLectures(data.lectures ?? []);
    } catch (err) {
      setListError(err instanceof Error ? err.message : '강의 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLectures();
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
      setUploadProgress(
        files.length > 1
          ? `업로드 및 강의 생성 중... (${i + 1}/${files.length}) ${file.name}`
          : '업로드 및 강의 생성 중... (자료 분석 후 슬라이드를 만드는 데 시간이 걸릴 수 있어요)'
      );
      try {
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/lectures/blob-upload',
        });
        const res = await fetch('/api/lectures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blobUrl: blob.url, fileName: file.name, characterKey }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.error) throw new Error(data.error || '강의 등록에 실패했습니다.');
      } catch (err) {
        failed.push(`${file.name}: ${err instanceof Error ? err.message : '업로드 실패'}`);
      }
    }

    if (failed.length > 0) setUploadError(failed.join('\n'));
    setUploadProgress('');
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await loadLectures();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 강의를 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/lectures/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || '강의 삭제에 실패했습니다.');
      await loadLectures();
    } catch (err) {
      setListError(err instanceof Error ? err.message : '강의 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-48px)] flex-col items-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">강의 게시판</p>
        <h1 className="mt-3 mb-6 text-2xl font-semibold text-slate-900">
          자료를 업로드하면 동물 캐릭터 1타 강사가 중학생 눈높이로 강의를 만들어줘요
        </h1>

        {isAdmin && (
          <div className="mb-6 rounded-2xl border border-dashed border-slate-300 p-5">
            <p className="mb-3 text-sm font-medium text-slate-700">강의 자료 업로드 (PDF)</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {LECTURE_CHARACTERS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  disabled={uploading}
                  onClick={() => setCharacterKey(c.key)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                    characterKey === c.key
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <span className="text-base">{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
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

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">등록된 강의</p>
          {loading && <p className="text-sm text-slate-500">불러오는 중...</p>}
          {!loading && listError && <p className="text-sm text-red-600">{listError}</p>}
          {!loading && !listError && lectures.length === 0 && (
            <p className="text-sm text-slate-500">등록된 강의가 없습니다.</p>
          )}
          {!loading && !listError && lectures.length > 0 && (
            <ul className="space-y-2">
              {lectures.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 px-4 py-3 hover:bg-slate-50"
                >
                  <a href={`/lectures/${l.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="text-2xl">{getCharacterEmoji(l.characterKey)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">{l.title}</span>
                      <span className="block text-xs text-slate-400">
                        슬라이드 {l.slideCount}장 · {new Date(l.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </span>
                  </a>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDelete(l.id)}
                      disabled={deletingId === l.id}
                      className="shrink-0 text-xs font-medium text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === l.id ? '삭제 중...' : '삭제'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
