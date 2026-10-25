"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  RotateCcw, 
  RotateCw, 
  Play, 
  Pause, 
  Volume2, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp, 
  FileText,
  VolumeX,
  FastForward,
  Rewind
} from 'lucide-react';
import { cleanListeningTest1Data, CleanListeningQuestion } from '@/mocks/clean-dataset/listening-test-1-clean';
import { CleanListeningTableRenderer } from './CleanListeningTableRenderer';
import { CleanGroupDropdownExplanation } from './CleanGroupDropdownExplanation';
import { CleanQuestionItemRenderer } from './CleanQuestionItemRenderer';

interface CleanListeningDetailViewProps {
  onRetake: () => void;
}

export function CleanListeningDetailView({ onRetake }: CleanListeningDetailViewProps) {
  const data = cleanListeningTest1Data;
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  
  // Quản lý câu hỏi đang được chọn để highlight trong bảng và dropdown
  const [activeQuestionNumber, setActiveQuestionNumber] = useState<number>(1);
  const [highlightedEvidenceText, setHighlightedEvidenceText] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  const currentSection = data.sections[activeSectionIndex];

  // Danh sách câu hỏi thuộc section hiện tại
  const currentSectionQuestions = data.questions.filter(
    q => q.section_number === activeSectionIndex + 1
  );

  // Danh sách exercise groups thuộc section hiện tại
  const currentExerciseGroups = data.exercise_groups.filter(
    eg => eg.section_number === activeSectionIndex + 1
  );

  // Tỷ lệ câu đúng theo section
  const getSectionScoreText = (sectionNum: number) => {
    const qList = data.questions.filter(q => q.section_number === sectionNum);
    const correctCount = qList.filter(q => q.is_correct).length;
    return `${correctCount}/${qList.length} Questions`;
  };

  // Đồng bộ Audio Player khi đổi section
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
      audioRef.current.load();
    }
    // Đặt câu hỏi đầu tiên của section làm active
    if (currentSectionQuestions.length > 0) {
      setActiveQuestionNumber(currentSectionQuestions[0].question_number);
    }
  }, [activeSectionIndex]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.error("Audio error:", e));
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || currentSection.duration_seconds);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // Tua lùi 10s
  const handleRewind10 = () => {
    if (audioRef.current) {
      const nextTime = Math.max(0, audioRef.current.currentTime - 10);
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  };

  // Tua tới 10s
  const handleForward10 = () => {
    if (audioRef.current) {
      const nextTime = Math.min(duration || currentSection.duration_seconds, audioRef.current.currentTime + 10);
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  };

  // Nhảy đến giây cụ thể và phát
  const handlePlayAtTime = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const changePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 0.8];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cuộn transcript đến câu thoại tương ứng
  const handleSelectEvidenceText = (text: string) => {
    setHighlightedEvidenceText(text);
    if (!transcriptScrollRef.current) return;

    const elements = transcriptScrollRef.current.querySelectorAll('[data-utterance-text]');
    for (const el of Array.from(elements)) {
      if (el.textContent && el.textContent.toLowerCase().includes(text.toLowerCase())) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
    }
  };

  // Avatar màu cho các vai trò người nói
  const getSpeakerBadge = (role: string) => {
    const cleanRole = (role || '').toLowerCase();
    if (cleanRole.includes('speaker 1') || cleanRole.includes('kelly')) {
      return {
        bg: 'bg-amber-100 text-amber-900 border-amber-300',
        avatarBg: 'bg-amber-500 text-white',
        label: 'Speaker 1'
      };
    }
    if (cleanRole.includes('speaker 2') || cleanRole.includes('herbert')) {
      return {
        bg: 'bg-blue-100 text-blue-900 border-blue-300',
        avatarBg: 'bg-blue-600 text-white',
        label: 'Speaker 2'
      };
    }
    return {
      bg: 'bg-purple-100 text-purple-900 border-purple-300',
      avatarBg: 'bg-purple-600 text-white',
      label: 'Narrator'
    };
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full bg-zinc-100 overflow-hidden">
      {/* 1. TOP BAR: MoonLab Branding, Làm lại, Hoàn thành */}
      <header className="bg-white border-b border-zinc-200 px-5 py-2.5 h-14 flex items-center justify-between shadow-2xs shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link 
            href={`/test-practice/listening/${data.test_id}/summary`}
            className="w-9 h-9 flex items-center justify-center hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600 hover:text-zinc-900 border border-zinc-200"
            title="Quay lại màn hình tóm tắt"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {/* Logo MoonLab */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-xs">
              M
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-zinc-900 leading-none">
                MoonLab
              </span>
              <span className="text-[10px] text-zinc-400 font-medium tracking-wider">
                IELTS LISTENING
              </span>
            </div>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onRetake}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-blue-200 hover:border-blue-400 text-blue-700 bg-blue-50/50 hover:bg-blue-100/60 font-semibold text-xs md:text-sm transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Làm lại</span>
          </button>

          <Link
            href={`/test-practice/listening/${data.test_id}/summary`}
            className="px-5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs md:text-sm shadow-xs transition-colors"
          >
            Hoàn thành
          </Link>

          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition-colors"
            title="Tùy chọn khác"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. SLIM AUDIO BAR (42px) ĐẶT NGAY DƯỚI HEADER - ĐÚNG MẪU 100% */}
      <div className="bg-white border-b border-zinc-200 px-5 py-1.5 h-12 flex items-center justify-between gap-4 shrink-0 shadow-2xs z-10">
        {/* Nút điều khiển lùi 10s / Play / tới 10s */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRewind10}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 hover:text-blue-600 hover:bg-zinc-100 transition-colors"
            title="Lùi 10 giây"
          >
            <Rewind className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-colors"
            title={isPlaying ? "Tạm dừng" : "Phát âm thanh"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={handleForward10}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 hover:text-blue-600 hover:bg-zinc-100 transition-colors"
            title="Tới 10 giây"
          >
            <FastForward className="w-4 h-4" />
          </button>
        </div>

        {/* Audio Element ngầm */}
        <audio
          ref={audioRef}
          src={currentSection.audio_url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Thanh tua tiến độ (Slider) */}
        <div className="flex-1 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={duration || currentSection.duration_seconds}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:bg-zinc-300 transition-colors"
          />
        </div>

        {/* Thời gian + Tốc độ 1x + Âm lượng */}
        <div className="flex items-center gap-3 shrink-0 text-xs font-semibold text-zinc-600">
          <span className="font-mono text-zinc-800">
            {formatAudioTime(currentTime)} / {formatAudioTime(duration || currentSection.duration_seconds)}
          </span>

          <button
            type="button"
            onClick={changePlaybackRate}
            className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-md text-[11px] font-bold text-zinc-700 transition-colors"
            title="Đổi tốc độ phát"
          >
            {playbackRate}x
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors"
            title={isMuted ? "Bật âm" : "Tắt tiếng"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3. MAIN SPLIT VIEW (100% CHIỀU CAO KHÔNG GIAN) */}
      <div className="flex-1 flex overflow-hidden">
        {/* CỘT TRÁI: TRANSCRIPT BÀI NGHE (CHIẾM TRỌN 100% CHIỀU CAO) */}
        <div 
          ref={transcriptScrollRef}
          className="w-1/2 h-full overflow-y-auto bg-white p-5 md:p-7 border-r border-zinc-200 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wide">
                Bản ghi âm lời thoại ({currentSection.title})
              </h3>
            </div>
            <span className="text-xs text-zinc-500 font-medium">
              Click vào mốc thời gian để phát đoạn âm thanh
            </span>
          </div>

          {/* Danh sách lượt thoại từ evidence_extract.utterances */}
          <div className="space-y-4">
            {currentSection.transcript_utterances && currentSection.transcript_utterances.length > 0 ? (
              currentSection.transcript_utterances.map((u) => {
                const badge = getSpeakerBadge(u.role || u.speaker_name);
                
                // Kiểm tra xem lượt thoại này có chứa evidence của câu hỏi nào không
                const matchingQuestions = currentSectionQuestions.filter(q => 
                  q.evidence_text && u.text.toLowerCase().includes(q.evidence_text.slice(0, 25).toLowerCase())
                );
                const hasEvidence = matchingQuestions.length > 0;

                return (
                  <div 
                    key={u.id}
                    data-utterance-text={u.text}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      hasEvidence
                        ? 'border-blue-300 bg-blue-50/40 ring-1 ring-blue-100'
                        : 'border-zinc-200/80 bg-zinc-50/40 hover:bg-zinc-50'
                    }`}
                  >
                    {/* Header lượt thoại: Avatar + Tên người nói + Nút mốc thời gian ▶ mm:ss */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${badge.avatarBg}`}>
                          {badge.label[0]}
                        </div>
                        <span className="font-bold text-xs text-zinc-800">
                          {u.speaker_name || badge.label}
                        </span>
                      </div>

                      {/* Nút bấm mốc thời gian ▶ mm:ss */}
                      <button
                        type="button"
                        onClick={() => handlePlayAtTime(u.start_seconds)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-blue-600 hover:text-white text-zinc-700 text-xs font-bold transition-all border border-zinc-200"
                        title={`Phát từ giây ${u.time_formatted}`}
                      >
                        <Play className="w-3 h-3 ml-0.5" />
                        <span>{u.time_formatted}</span>
                      </button>
                    </div>

                    {/* Nội dung lời thoại */}
                    <div className="text-xs sm:text-sm text-zinc-800 leading-relaxed pl-8">
                      {hasEvidence && (
                        <div className="flex items-center gap-1.5 mb-1 text-blue-900 font-bold text-xs">
                          <span className="text-red-500">📍</span>
                          <span>Chứng cứ cho câu: </span>
                          {matchingQuestions.map(mq => (
                            <span 
                              key={mq.id}
                              onClick={() => setActiveQuestionNumber(mq.question_number)}
                              className="cursor-pointer underline hover:text-blue-700"
                            >
                              ({mq.question_number})
                            </span>
                          ))}
                        </div>
                      )}
                      <p>
                        {u.text}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Fallback nếu section không có utterances chia nhỏ */
              <div className="space-y-3.5">
                {currentSectionQuestions.map(q => {
                  if (!q.evidence_text) return null;
                  return (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-900">
                          📍 Vị trí câu {q.question_number}
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePlayAtTime(Math.max(0, (q.question_number - 1) * 35))}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold"
                        >
                          <Play className="w-3 h-3" />
                          <span>Phát</span>
                        </button>
                      </div>
                      <p className="text-sm italic text-zinc-800 border-l-2 border-blue-400 pl-3">
                        "{q.evidence_text}"
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: SCORE CARD + FORM ĐỀ BÀI LÚC THI + GROUP DROPDOWN */}
        <div className="w-1/2 h-full overflow-y-auto bg-zinc-50/60 p-5 md:p-6 space-y-6">
          {/* USER SCORE CARD */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 md:p-5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <span className="font-bold text-base">L</span>
              </div>
              <div>
                <h4 className="font-bold text-sm md:text-base text-zinc-900">long</h4>
                <p className="text-xs text-zinc-500">
                  Ngày làm bài {data.submitted_at}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Điểm
                </div>
                <div className="text-xl font-black text-blue-600">
                  {data.overall_band.toFixed(1)}
                </div>
              </div>

              <div className="text-right border-l border-zinc-200 pl-6">
                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Câu hỏi đúng
                </div>
                <div className="text-xl font-black text-emerald-600">
                  {data.correct_count}
                  <span className="text-xs font-semibold text-zinc-400 ml-0.5">
                    /{data.total_questions}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* HIỂN THỊ CÁC NHÓM ĐỀ BÀI */}
          {currentExerciseGroups.map((group, gIdx) => {
            const groupQuestions = currentSectionQuestions.filter(
              q => q.question_number >= group.question_start && q.question_number <= group.question_end
            );

            const hasTableData = !!group.table_data;

            return (
              <div key={group.id || gIdx} className="space-y-4">
                {/* Tiêu đề hướng dẫn nhóm câu hỏi */}
                <div className="bg-white rounded-xl border border-blue-100 p-4 shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs md:text-sm">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                      ?
                    </div>
                    <span>Questions {group.question_start} - {group.question_end}</span>
                  </div>

                  <p className="text-xs md:text-sm font-semibold text-zinc-800">
                    {group.title}
                  </p>
                </div>

                {/* NẾU LÀ BẢNG FORM (như Part 1: Product Incident Report hoặc Customer Details) */}
                {hasTableData ? (
                  <div className="space-y-4">
                    <CleanListeningTableRenderer
                      tableData={group.table_data}
                      title={group.content?.split('\n')?.[0] || `Form Questions ${group.question_start}-${group.question_end}`}
                      subtitle="Bảng mẫu phòng thi kèm đáp án học viên"
                      questions={groupQuestions}
                      activeQuestionNumber={activeQuestionNumber}
                      onSelectQuestion={(num) => setActiveQuestionNumber(num)}
                    />

                    {/* Dropdown Menu Giải thích đáp án theo nhóm câu hỏi (Image 1 & 2) */}
                    <CleanGroupDropdownExplanation
                      questions={groupQuestions}
                      activeQuestionNumber={activeQuestionNumber}
                      onSelectQuestion={(num) => setActiveQuestionNumber(num)}
                      onPlayAtTime={handlePlayAtTime}
                      onSelectEvidenceText={handleSelectEvidenceText}
                      defaultExpanded={gIdx === 0}
                    />
                  </div>
                ) : (
                  /* NẾU LÀ CÁC DẠNG CÂU HỎI TIÊU CHUẨN KHÁC (Section 2, 3) */
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {groupQuestions.map(q => (
                        <CleanQuestionItemRenderer
                          key={q.id}
                          question={q}
                          onSelectEvidence={handleSelectEvidenceText}
                          defaultExpanded={false}
                        />
                      ))}
                    </div>

                    <CleanGroupDropdownExplanation
                      questions={groupQuestions}
                      activeQuestionNumber={activeQuestionNumber}
                      onSelectQuestion={(num) => setActiveQuestionNumber(num)}
                      onPlayAtTime={handlePlayAtTime}
                      onSelectEvidenceText={handleSelectEvidenceText}
                      defaultExpanded={false}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. BOTTOM NAVIGATION BAR: Section Tabs */}
      <footer className="bg-white border-t border-zinc-200 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 transition-colors shadow-xs"
            title="Cuộn lên đầu trang"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={activeSectionIndex === 0}
            onClick={() => setActiveSectionIndex(prev => Math.max(0, prev - 1))}
            className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Phần trước"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto py-1">
          {data.sections.map((sec, idx) => {
            const isActive = activeSectionIndex === idx;
            return (
              <button
                key={sec.section_number || idx}
                type="button"
                onClick={() => setActiveSectionIndex(idx)}
                className={`px-5 py-2 rounded-xl text-left transition-all border ${
                  isActive
                    ? 'border-blue-600 bg-white shadow-xs text-blue-900'
                    : 'border-zinc-200 bg-zinc-50 hover:bg-white text-zinc-600'
                }`}
              >
                <div className={`font-bold text-xs uppercase tracking-wider ${isActive ? 'text-blue-600' : 'text-zinc-700'}`}>
                  LISTENING PART {idx + 1}
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">
                  {getSectionScoreText(idx + 1)}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={activeSectionIndex === data.sections.length - 1}
            onClick={() => setActiveSectionIndex(prev => Math.min(data.sections.length - 1, prev + 1))}
            className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Phần tiếp theo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
