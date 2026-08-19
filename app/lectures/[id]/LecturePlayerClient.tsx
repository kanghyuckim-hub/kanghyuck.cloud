'use client';

import { useEffect, useRef, useState } from 'react';
import { getCharacterEmoji } from '@/lib/lectureCharacters';

interface LectureSlide {
  heading: string;
  bullets: string[];
  narration: string;
}

interface Lecture {
  id: string;
  fileName: string;
  title: string;
  characterKey: string;
  slides: LectureSlide[];
  createdAt: string;
}

export default function LecturePlayerClient({ lectureId }: { lectureId: string }) {
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [slideIndex, setSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(true);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const slideIndexRef = useRef(slideIndex);
  slideIndexRef.current = slideIndex;

  useEffect(() => {
    setTtsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await fetch(`/api/lectures/${lectureId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.error) throw new Error(data.error || '강의를 불러오는 중 오류가 발생했습니다.');
        setLecture(data.lecture);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : '강의를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [lectureId]);

  const speakSlide = (index: number) => {
    if (!lecture || !ttsSupported) return;
    const slide = lecture.slides[index];
    if (!slide) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(slide.narration || slide.heading);
    utterance.lang = 'ko-KR';
    utterance.rate = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (isPlayingRef.current) {
        const next = slideIndexRef.current + 1;
        if (next < lecture.slides.length) {
          setSlideIndex(next);
        } else {
          setIsPlaying(false);
        }
      }
    };
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (isPlaying && lecture) {
      speakSlide(slideIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIndex, isPlaying, lecture]);

  const handlePlayPause = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
  };

  const goToSlide = (index: number) => {
    if (!lecture) return;
    const clamped = Math.max(0, Math.min(lecture.slides.length - 1, index));
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSlideIndex(clamped);
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-48px)] items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">강의를 불러오는 중...</p>
      </div>
    );
  }

  if (loadError || !lecture) {
    return (
      <div className="flex min-h-[calc(100vh-48px)] items-center justify-center bg-slate-50 px-4">
        <p className="text-sm text-red-600">{loadError || '강의를 찾을 수 없습니다.'}</p>
      </div>
    );
  }

  const slide = lecture.slides[slideIndex];
  const emoji = getCharacterEmoji(lecture.characterKey);

  return (
    <div className="flex min-h-[calc(100vh-48px)] flex-col items-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-10 shadow-xl">
        <a href="/lectures" className="text-xs font-medium text-slate-400 hover:text-slate-600">
          ← 강의 목록으로
        </a>
        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">강의 재생</p>
        <h1 className="mt-2 mb-6 text-2xl font-semibold text-slate-900">{lecture.title}</h1>

        {!ttsSupported && (
          <p className="mb-4 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-700">
            이 브라우저는 음성 재생(TTS)을 지원하지 않아 자막만 표시됩니다.
          </p>
        )}

        <div className="mb-6 flex items-center gap-6 rounded-2xl bg-slate-900 p-8">
          <span
            className={`shrink-0 text-7xl transition-transform duration-200 ${
              isSpeaking ? 'animate-bounce' : ''
            }`}
          >
            {emoji}
          </span>
          <div className="min-w-0 flex-1 text-white">
            <p className="text-xs uppercase tracking-widest text-slate-400">
              슬라이드 {slideIndex + 1} / {lecture.slides.length}
            </p>
            <h2 className="mt-1 text-xl font-semibold">{slide.heading}</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-200">
              {slide.bullets.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-slate-500">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mb-6 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          {slide.narration}
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => goToSlide(slideIndex - 1)}
            disabled={slideIndex === 0}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            이전
          </button>
          <button
            type="button"
            onClick={handlePlayPause}
            className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            {isPlaying ? '일시정지' : '재생'}
          </button>
          <button
            type="button"
            onClick={() => goToSlide(slideIndex + 1)}
            disabled={slideIndex === lecture.slides.length - 1}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
