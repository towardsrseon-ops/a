import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Search,
  BarChart3,
  X,
  Moon,
  Sun,
} from 'lucide-react';
import { QUESTIONS, OptionKey, Question } from './data/questions';

type FilterMode = 'all' | 'unanswered' | 'correct' | 'wrong';

const STORAGE_KEY_ANSWERS = 'madat_mad_alshabakat_answers_v1';
const STORAGE_KEY_CURRENT = 'madat_mad_alshabakat_current_v1';
const STORAGE_KEY_THEME = 'madat_mad_alshabakat_indigo_theme_v1';

const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

export default function App() {
  const [answers, setAnswers] = useState<Record<number, OptionKey>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ANSWERS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [currentQuestionId, setCurrentQuestionId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT);
      const parsed = saved ? Number(saved) : 1;
      return parsed >= 1 && parsed <= QUESTIONS.length ? parsed : 1;
    } catch {
      return 1;
    }
  });

  // Default to eye-friendly deep indigo ("نيلي") background
  const [isIndigoDark, setIsIndigoDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      return saved ? saved === 'dark' : true;
    } catch {
      return true;
    }
  });

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isIndigoDark) {
      root.classList.add('dark');
      root.classList.remove('light-theme');
    } else {
      root.classList.remove('dark');
      root.classList.add('light-theme');
    }
    try {
      localStorage.setItem(STORAGE_KEY_THEME, isIndigoDark ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [isIndigoDark]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify(answers));
    } catch {
      // Ignore storage quota errors
    }
  }, [answers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT, String(currentQuestionId));
    } catch {
      // Ignore storage quota errors
    }
  }, [currentQuestionId]);

  const stats = useMemo(() => {
    let correctCount = 0;
    let wrongCount = 0;
    for (const q of QUESTIONS) {
      const chosen = answers[q.id];
      if (chosen) {
        if (chosen === q.correct) correctCount++;
        else wrongCount++;
      }
    }
    const answeredCount = correctCount + wrongCount;
    const unansweredCount = QUESTIONS.length - answeredCount;
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    return {
      total: QUESTIONS.length,
      answeredCount,
      unansweredCount,
      correctCount,
      wrongCount,
      accuracy,
    };
  }, [answers]);

  const filteredQuestions = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return QUESTIONS.filter((q) => {
      const chosen = answers[q.id];
      if (filterMode === 'unanswered' && chosen !== undefined) return false;
      if (filterMode === 'correct' && chosen !== q.correct) return false;
      if (filterMode === 'wrong' && (!chosen || chosen === q.correct)) return false;

      if (qLower) {
        const matchesNumber = String(q.id) === qLower || `q${q.id}` === qLower;
        const matchesText =
          q.text.toLowerCase().includes(qLower) ||
          OPTION_KEYS.some((k) => q.options[k].toLowerCase().includes(qLower));
        return matchesNumber || matchesText;
      }
      return true;
    });
  }, [answers, filterMode, searchQuery]);

  const activeQuestion: Question = useMemo(() => {
    const foundInFilter = filteredQuestions.find((q) => q.id === currentQuestionId);
    if (foundInFilter) return foundInFilter;
    if (filteredQuestions.length > 0) return filteredQuestions[0];
    return QUESTIONS.find((q) => q.id === currentQuestionId) ?? QUESTIONS[0];
  }, [filteredQuestions, currentQuestionId]);

  const activeFilterIndex = useMemo(() => {
    return filteredQuestions.findIndex((q) => q.id === activeQuestion.id);
  }, [filteredQuestions, activeQuestion.id]);

  const hasPrev = activeFilterIndex > 0;
  const hasNext = activeFilterIndex !== -1 && activeFilterIndex < filteredQuestions.length - 1;

  const handleGoPrev = useCallback(() => {
    if (hasPrev) {
      setCurrentQuestionId(filteredQuestions[activeFilterIndex - 1].id);
    }
  }, [hasPrev, filteredQuestions, activeFilterIndex]);

  const handleGoNext = useCallback(() => {
    if (hasNext) {
      setCurrentQuestionId(filteredQuestions[activeFilterIndex + 1].id);
    }
  }, [hasNext, filteredQuestions, activeFilterIndex]);

  const handleSelectOption = useCallback(
    (option: OptionKey) => {
      setAnswers((prev) => {
        if (prev[activeQuestion.id] !== undefined) return prev;
        return { ...prev, [activeQuestion.id]: option };
      });
    },
    [activeQuestion.id]
  );

  const handleRetrySingleQuestion = useCallback(() => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[activeQuestion.id];
      return next;
    });
  }, [activeQuestion.id]);

  const handleResetAll = useCallback(() => {
    setAnswers({});
    setCurrentQuestionId(1);
    setFilterMode('all');
    setSearchQuery('');
    setConfirmResetAll(false);
    setShowSummary(false);
  }, []);

  const handleJumpToNumber = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(searchQuery.replace(/[^0-9]/g, ''));
    if (num >= 1 && num <= QUESTIONS.length) {
      setFilterMode('all');
      setSearchQuery('');
      setCurrentQuestionId(num);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || showSummary) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoNext();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleGoPrev();
      } else {
        const keyMap: Record<string, OptionKey> = {
          a: 'A',
          A: 'A',
          '1': 'A',
          b: 'B',
          B: 'B',
          '2': 'B',
          c: 'C',
          C: 'C',
          '3': 'C',
          d: 'D',
          D: 'D',
          '4': 'D',
        };
        const mapped = keyMap[e.key];
        if (mapped) {
          handleSelectOption(mapped);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleGoNext, handleGoPrev, handleSelectOption, showSummary]);

  const chosenOption = answers[activeQuestion.id];
  const isAnswered = chosenOption !== undefined;
  const isCorrectChoice = isAnswered && chosenOption === activeQuestion.correct;
  const progressPercent = Math.round((stats.answeredCount / stats.total) * 100);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eef2fb] dark:bg-[#111936] text-[#161e38] dark:text-[#eef2ff] flex flex-col transition-colors duration-200">
      {/* Top Bar Contract: 3 zones (Wordmark — Nav Links — 1 Primary Action) */}
      <header className="sticky top-0 z-30 bg-[#f6f8fe]/95 dark:bg-[#151f40]/95 backdrop-blur-sm border-b border-[#d5ddf2] dark:border-[#27345c]">
        <div className="max-w-[1200px] mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-8">
          <button
            type="button"
            onClick={() => {
              setFilterMode('all');
              setSearchQuery('');
              setCurrentQuestionId(1);
            }}
            className="text-base sm:text-xl font-bold tracking-tight text-[#161e38] dark:text-[#f5f7ff] whitespace-nowrap shrink-0 hover:text-[#4338ca] dark:hover:text-[#a5b4fc] transition-colors cursor-pointer touch-manipulation"
          >
            مادة مد الشبكات
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {(
              [
                { id: 'all', label: `الكل (${stats.total})` },
                { id: 'unanswered', label: `غير مجابة (${stats.unansweredCount})` },
                { id: 'correct', label: `الصحيحة (${stats.correctCount})` },
                { id: 'wrong', label: `الخاطئة (${stats.wrongCount})` },
              ] as const
            ).map((item) => {
              const active = filterMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilterMode(item.id)}
                  className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                    active
                      ? 'border-[#4338ca] dark:border-[#818cf8] text-[#4338ca] dark:text-[#a5b4fc] font-semibold'
                      : 'border-transparent text-[#505b7d] dark:text-[#a3b0d4] hover:text-[#161e38] dark:hover:text-[#eef2ff]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setShowSummary(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[40px] text-xs sm:text-sm font-semibold text-white bg-[#4338ca] hover:bg-[#3730a3] dark:bg-[#4f46e5] dark:hover:bg-[#4338ca] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>ملخص النتائج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-8">
        {/* Workspace Toolbar: Attribution + Theme Switch */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-[#d5ddf2] dark:border-[#263259]">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-[#4a5578] dark:text-[#a8b5d8]">
            <span className="font-semibold text-[#161e38] dark:text-[#eef2ff]">
              إعداد أحمد مثنى
            </span>
            <span aria-hidden="true">·</span>
            <span>بنك أسئلة أمن الشبكات (250 سؤالاً)</span>
          </div>

          <button
            type="button"
            onClick={() => setIsIndigoDark((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#cfd8f0] dark:border-[#2d3b66] bg-[#f8faff] dark:bg-[#192345] text-xs font-medium text-[#2c3759] dark:text-[#cfd9f5] hover:border-[#4338ca] dark:hover:border-[#818cf8] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {isIndigoDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>الوضع النهاري الهادئ</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#4338ca] shrink-0" />
                <span>الوضع النيلي المريح</span>
              </>
            )}
          </button>
        </div>

        {/* Mobile Filter Tabs */}
        <div className="grid grid-cols-4 md:hidden gap-1 p-1 bg-[#dfe6f7] dark:bg-[#182244] rounded-lg mb-4">
          {(
            [
              { id: 'all', label: `الكل (${stats.total})` },
              { id: 'unanswered', label: `متبقي (${stats.unansweredCount})` },
              { id: 'correct', label: `صح (${stats.correctCount})` },
              { id: 'wrong', label: `خطأ (${stats.wrongCount})` },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilterMode(item.id)}
              className={`min-h-[40px] px-1.5 py-2 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap tabular-nums touch-manipulation ${
                filterMode === item.id
                  ? 'bg-[#f8faff] dark:bg-[#24315e] text-[#161e38] dark:text-[#f5f7ff] shadow-xs'
                  : 'text-[#4a5578] dark:text-[#9eacd2] hover:text-[#161e38] dark:hover:text-[#eef2ff]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Two-Zone Layout: Question Stage + Question Map Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Primary Question Stage */}
          <section className="lg:col-span-8 flex flex-col gap-5">
            {/* Unboxed Metadata Bar + Progress Line */}
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-[#4a5578] dark:text-[#a8b5d8] tabular-nums">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#161e38] dark:text-[#f5f7ff]">
                    السؤال {activeQuestion.id} من {stats.total}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>التقدم {progressPercent}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#15803d] dark:text-[#6ee7b7] font-medium">
                    صحيح: {stats.correctCount}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#b91c1c] dark:text-[#fca5a5] font-medium">
                    خطأ: {stats.wrongCount}
                  </span>
                </div>
              </div>
              <div
                className="w-full h-1.5 bg-[#d5ddf2] dark:bg-[#243056] rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-[#4338ca] dark:bg-[#818cf8] transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {filteredQuestions.length === 0 ? (
              <div className="bg-[#f9faff] dark:bg-[#192345] border border-[#d5ddf2] dark:border-[#2a3761] rounded-xl p-10 text-center flex flex-col items-center gap-4">
                <p className="text-base font-medium text-[#2c3759] dark:text-[#cfd9f5]">
                  لا توجد أسئلة مطابقة للتصفية الحالية.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#4338ca] hover:bg-[#3730a3] dark:bg-[#4f46e5] dark:hover:bg-[#4338ca] rounded-lg transition-colors cursor-pointer"
                >
                  عرض جميع الأسئلة
                </button>
              </div>
            ) : (
              <article className="bg-[#f9faff] dark:bg-[#192345] border border-[#d5ddf2] dark:border-[#2a3761] rounded-xl p-5 sm:p-8 flex flex-col gap-6">
                {/* Question Header */}
                <div className="flex items-center justify-between gap-4 border-b border-[#e4e9f7] dark:border-[#263259] pb-4">
                  <span
                    dir="ltr"
                    className="font-mono text-sm font-semibold text-[#4338ca] dark:text-[#a5b4fc] tabular-nums"
                  >
                    Question {activeQuestion.id}
                  </span>

                  {isAnswered && (
                    <button
                      type="button"
                      onClick={handleRetrySingleQuestion}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4a5578] dark:text-[#a8b5d8] hover:text-[#161e38] dark:hover:text-[#f5f7ff] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>إعادة محاولة السؤال</span>
                    </button>
                  )}
                </div>

                {/* Question Text (English LTR) */}
                <h1
                  dir="ltr"
                  className="font-sans text-lg sm:text-xl font-semibold text-[#161e38] dark:text-[#f5f7ff] leading-relaxed tracking-[0.005em] text-left"
                >
                  {activeQuestion.text}
                </h1>

                {/* Options List */}
                <div className="flex flex-col gap-3" dir="ltr">
                  {OPTION_KEYS.map((key) => {
                    const optionText = activeQuestion.options[key];
                    const isChosen = chosenOption === key;
                    const isRightAnswer = activeQuestion.correct === key;

                    let containerStyle =
                      'bg-[#ffffff] dark:bg-[#1e2a52] border-[#d5ddf2] dark:border-[#2f3d6b] hover:border-[#4338ca] dark:hover:border-[#818cf8] hover:bg-[#eef2ff] dark:hover:bg-[#243261] text-[#161e38] dark:text-[#eef2ff]';
                    let badgeStyle =
                      'bg-[#edf1fc] dark:bg-[#263566] text-[#2c3759] dark:text-[#d5def7] border-[#cfd8f0] dark:border-[#394980]';
                    let statusNode: React.ReactNode = null;

                    if (isAnswered) {
                      if (isRightAnswer) {
                        containerStyle =
                          'bg-[#e9f7ef] dark:bg-[#11362a] border-[#2e9e5b] dark:border-[#34d399] text-[#113d24] dark:text-[#ecfdf5] ring-1 ring-[#34d399]/30';
                        badgeStyle =
                          'bg-[#1e8449] dark:bg-[#10b981] text-white dark:text-[#042f20] border-[#1e8449] dark:border-[#10b981]';
                        statusNode = (
                          <span
                            dir="rtl"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] dark:text-[#6ee7b7] shrink-0 whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-4 h-4 text-[#1e8449] dark:text-[#34d399] shrink-0" />
                            <span>{isChosen ? 'إجابتك صحيحة' : 'الإجابة الصحيحة'}</span>
                          </span>
                        );
                      } else if (isChosen && !isRightAnswer) {
                        containerStyle =
                          'bg-[#fbeceb] dark:bg-[#3f1822] border-[#d64545] dark:border-[#f87171] text-[#5c1919] dark:text-[#fef2f2] ring-1 ring-[#f87171]/30';
                        badgeStyle =
                          'bg-[#c0392b] dark:bg-[#ef4444] text-white border-[#c0392b] dark:border-[#ef4444]';
                        statusNode = (
                          <span
                            dir="rtl"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#991b1b] dark:text-[#fca5a5] shrink-0 whitespace-nowrap"
                          >
                            <XCircle className="w-4 h-4 text-[#c0392b] dark:text-[#f87171] shrink-0" />
                            <span>إجابة خاطئة</span>
                          </span>
                        );
                      } else {
                        containerStyle =
                          'bg-[#f2f5fc] dark:bg-[#162040] border-[#e0e6f5] dark:border-[#243056] text-[#6d7899] dark:text-[#8694ba] opacity-75';
                        badgeStyle =
                          'bg-[#e9eef9] dark:bg-[#1d2950] text-[#7b86a8] dark:text-[#707ea6] border-[#d5ddf2] dark:border-[#2b3863]';
                      }
                    }

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={isAnswered}
                        onClick={() => handleSelectOption(key)}
                        className={`w-full min-h-[56px] px-3.5 sm:px-4 py-3.5 rounded-lg border text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4 transition-all duration-150 touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1] ${
                          isAnswered ? 'cursor-default' : 'cursor-pointer active:scale-[0.995]'
                        } ${containerStyle}`}
                      >
                        <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0">
                          <span
                            className={`w-8 h-8 rounded-md border font-mono text-sm font-semibold flex items-center justify-center shrink-0 transition-colors ${badgeStyle}`}
                          >
                            {key}
                          </span>
                          <span className="font-sans text-[15px] sm:text-base font-medium leading-snug pt-0.5 sm:pt-0 break-words">
                            {optionText}
                          </span>
                        </div>
                        {statusNode && <div className="self-end sm:self-center">{statusNode}</div>}
                      </button>
                    );
                  })}
                </div>

                {/* Immediate Result Feedback Line */}
                {isAnswered && (
                  <div
                    className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-3 text-sm ${
                      isCorrectChoice
                        ? 'bg-[#e9f7ef]/90 dark:bg-[#11362a]/90 border-[#b7e4c7] dark:border-[#256d54] text-[#14532d] dark:text-[#d1fae5]'
                        : 'bg-[#fbeceb]/90 dark:bg-[#3f1822]/90 border-[#f2c6c3] dark:border-[#7a2e3e] text-[#7f1d1d] dark:text-[#fee2e2]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      {isCorrectChoice ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-[#1e8449] dark:text-[#34d399] shrink-0" />
                          <span>أحسنت! الإجابة صحيحة.</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-[#c0392b] dark:text-[#f87171] shrink-0" />
                          <span>
                            إجابة خاطئة — الإجابة الصحيحة هي الخيار{' '}
                            <span className="font-mono font-bold">{activeQuestion.correct}</span>.
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Previous / Next Navigation Controls */}
                <div className="pt-3 border-t border-[#e4e9f7] dark:border-[#263259] grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={handleGoPrev}
                    disabled={!hasPrev}
                    className={`inline-flex items-center justify-center gap-2 min-h-[48px] sm:min-h-[44px] px-4 sm:px-5 py-2.5 rounded-lg border text-sm font-semibold transition-colors whitespace-nowrap shrink-0 touch-manipulation ${
                      hasPrev
                        ? 'bg-[#ffffff] dark:bg-[#1e2a52] border-[#c8d2ed] dark:border-[#344475] text-[#161e38] dark:text-[#eef2ff] hover:bg-[#eef2fb] dark:hover:bg-[#263566] cursor-pointer'
                        : 'bg-[#eff3fc] dark:bg-[#162040] border-[#dfe6f7] dark:border-[#243056] text-[#98a3c4] dark:text-[#55638c] cursor-not-allowed'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4 shrink-0" />
                    <span>السؤال السابق</span>
                  </button>

                  <span className="hidden sm:inline text-xs text-[#6b7699] dark:text-[#8694ba] tabular-nums">
                    يمكنك استخدام الأسهم ← → أو المفاتيح A B C D
                  </span>

                  <button
                    type="button"
                    onClick={handleGoNext}
                    disabled={!hasNext}
                    className={`inline-flex items-center justify-center gap-2 min-h-[48px] sm:min-h-[44px] px-4 sm:px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 touch-manipulation ${
                      hasNext
                        ? 'bg-[#4338ca] hover:bg-[#3730a3] dark:bg-[#4f46e5] dark:hover:bg-[#4338ca] text-white cursor-pointer'
                        : 'bg-[#d5ddf2] dark:bg-[#222d54] text-[#8994b8] dark:text-[#55638c] cursor-not-allowed'
                    }`}
                  >
                    <span>السؤال التالي</span>
                    <ChevronLeft className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </article>
            )}
          </section>

          {/* Compact Question Navigator Panel */}
          <aside className="lg:col-span-4 bg-[#f9faff] dark:bg-[#192345] border border-[#d5ddf2] dark:border-[#2a3761] rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#161e38] dark:text-[#f5f7ff]">خريطة الأسئلة</h2>
              <span className="text-xs text-[#4a5578] dark:text-[#a8b5d8] tabular-nums">
                {filteredQuestions.length} سؤال
              </span>
            </div>

            {/* Search or Jump to Number */}
            <form onSubmit={handleJumpToNumber} className="relative">
              <Search className="w-4 h-4 text-[#6b7699] dark:text-[#8694ba] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بكلمة أو رقم السؤال (مثلاً 45)..."
                className="w-full h-11 sm:h-10 pr-9 pl-3 text-base sm:text-sm bg-[#eef2fb] dark:bg-[#111936] border border-[#d5ddf2] dark:border-[#2a3761] rounded-lg text-[#161e38] dark:text-[#eef2ff] placeholder:text-[#6b7699] dark:placeholder:text-[#7482a8] focus:outline-none focus:border-[#4338ca] dark:focus:border-[#818cf8] focus:bg-[#ffffff] dark:focus:bg-[#151f40] transition-colors"
              />
            </form>

            {/* 250-Question Interactive Grid */}
            <div className="max-h-[280px] sm:max-h-[340px] lg:max-h-[380px] overflow-y-auto pr-0.5">
              <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2 sm:gap-1.5">
                {filteredQuestions.map((q) => {
                  const chosen = answers[q.id];
                  const isCurrent = q.id === activeQuestion.id;
                  const isRight = chosen !== undefined && chosen === q.correct;
                  const isWrong = chosen !== undefined && chosen !== q.correct;

                  let cellClass =
                    'bg-[#eff3fc] dark:bg-[#1e2a52] border-[#d5ddf2] dark:border-[#2f3d6b] text-[#2c3759] dark:text-[#cfd9f5] hover:border-[#4338ca] dark:hover:border-[#818cf8] hover:text-[#4338ca] dark:hover:text-[#a5b4fc]';
                  if (isRight) {
                    cellClass =
                      'bg-[#e9f7ef] dark:bg-[#11362a] border-[#4eb378] dark:border-[#34d399]/70 text-[#166534] dark:text-[#6ee7b7] font-semibold';
                  } else if (isWrong) {
                    cellClass =
                      'bg-[#fbeceb] dark:bg-[#3f1822] border-[#e06c6c] dark:border-[#f87171]/70 text-[#991b1b] dark:text-[#fca5a5] font-semibold';
                  }

                  if (isCurrent) {
                    cellClass +=
                      ' ring-2 ring-[#4338ca] dark:ring-[#818cf8] ring-offset-1 ring-offset-[#f9faff] dark:ring-offset-[#192345] border-[#4338ca] dark:border-[#818cf8]';
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setCurrentQuestionId(q.id);
                        if (window.innerWidth < 1024) {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className={`h-11 sm:h-9 rounded-md border text-xs font-mono tabular-nums transition-all cursor-pointer flex items-center justify-center touch-manipulation ${cellClass}`}
                      title={`السؤال ${q.id}`}
                    >
                      {q.id}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clean Color + Text Legend */}
            <div className="pt-3 border-t border-[#e4e9f7] dark:border-[#263259] flex flex-wrap items-center justify-between gap-3 text-xs text-[#4a5578] dark:text-[#a8b5d8]">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#2e9e5b] dark:bg-[#34d399] inline-block" />
                  <span>صحيح</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#d64545] dark:bg-[#f87171] inline-block" />
                  <span>خطأ</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#cfd8f0] dark:bg-[#344475] inline-block" />
                  <span>لم يُجب</span>
                </span>
              </div>

              {!confirmResetAll ? (
                <button
                  type="button"
                  onClick={() => setConfirmResetAll(true)}
                  disabled={stats.answeredCount === 0}
                  className="text-xs font-medium text-[#4a5578] dark:text-[#a8b5d8] hover:text-[#b91c1c] dark:hover:text-[#fca5a5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  تصفير الكل
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="text-xs font-semibold text-[#b91c1c] dark:text-[#fca5a5] hover:underline cursor-pointer"
                  >
                    تأكيد التصفير
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetAll(false)}
                    className="text-xs font-medium text-[#4a5578] dark:text-[#a8b5d8] hover:text-[#161e38] dark:hover:text-[#eef2ff] cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-[#d5ddf2] dark:border-[#27345c] bg-[#f6f8fe] dark:bg-[#151f40] py-4 px-4 sm:px-6 mt-auto">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-[#4a5578] dark:text-[#a8b5d8]">
          <span>مادة مد الشبكات — الاختبار التفاعلي</span>
          <span className="font-semibold text-[#161e38] dark:text-[#eef2ff]">
            إعداد أحمد مثنى
          </span>
        </div>
      </footer>

      {/* Summary Results Modal (Triggered on Demand Only) */}
      {showSummary && (
        <div
          className="fixed inset-0 z-50 bg-[#090d1f]/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowSummary(false)}
        >
          <div
            className="bg-[#f9faff] dark:bg-[#192345] border border-[#d5ddf2] dark:border-[#2a3761] rounded-xl max-w-md w-full p-6 flex flex-col gap-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#e4e9f7] dark:border-[#263259] pb-3">
              <h2 className="text-lg font-bold text-[#161e38] dark:text-[#f5f7ff]">
                ملخص نتائج الاختبار
              </h2>
              <button
                type="button"
                onClick={() => setShowSummary(false)}
                className="p-1.5 rounded-md text-[#6b7699] hover:text-[#161e38] dark:text-[#a8b5d8] dark:hover:text-[#f5f7ff] hover:bg-[#e4e9f7] dark:hover:bg-[#263259] transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 tabular-nums">
              <div className="p-4 rounded-lg bg-[#eef2fb] dark:bg-[#111936] border border-[#d5ddf2] dark:border-[#2a3761] flex flex-col gap-1">
                <span className="text-xs text-[#4a5578] dark:text-[#a8b5d8]">نسبة الدقة</span>
                <span className="text-2xl font-bold text-[#4338ca] dark:text-[#a5b4fc] font-mono">
                  {stats.accuracy}%
                </span>
              </div>
              <div className="p-4 rounded-lg bg-[#eef2fb] dark:bg-[#111936] border border-[#d5ddf2] dark:border-[#2a3761] flex flex-col gap-1">
                <span className="text-xs text-[#4a5578] dark:text-[#a8b5d8]">الأسئلة المجابة</span>
                <span className="text-2xl font-bold text-[#161e38] dark:text-[#f5f7ff] font-mono">
                  {stats.answeredCount} / {stats.total}
                </span>
              </div>
              <div className="p-4 rounded-lg bg-[#e9f7ef] dark:bg-[#11362a] border border-[#b7e4c7] dark:border-[#256d54] flex flex-col gap-1">
                <span className="text-xs text-[#166534] dark:text-[#6ee7b7]">إجابات صحيحة</span>
                <span className="text-2xl font-bold text-[#166534] dark:text-[#6ee7b7] font-mono">
                  {stats.correctCount}
                </span>
              </div>
              <div className="p-4 rounded-lg bg-[#fbeceb] dark:bg-[#3f1822] border border-[#f2c6c3] dark:border-[#7a2e3e] flex flex-col gap-1">
                <span className="text-xs text-[#991b1b] dark:text-[#fca5a5]">إجابات خاطئة</span>
                <span className="text-2xl font-bold text-[#991b1b] dark:text-[#fca5a5] font-mono">
                  {stats.wrongCount}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
              {stats.wrongCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('wrong');
                    setShowSummary(false);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#4338ca] hover:bg-[#3730a3] dark:bg-[#4f46e5] dark:hover:bg-[#4338ca] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  مراجعة الأخطاء ({stats.wrongCount})
                </button>
              )}
              <button
                type="button"
                onClick={handleResetAll}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#c8d2ed] dark:border-[#344475] bg-[#ffffff] dark:bg-[#1e2a52] hover:bg-[#eef2fb] dark:hover:bg-[#263566] text-[#2c3759] dark:text-[#cfd9f5] text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                إعادة الاختبار من البداية
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
