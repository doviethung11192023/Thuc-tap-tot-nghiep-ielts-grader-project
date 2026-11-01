"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CleanListeningDetailHeader } from './CleanListeningDetailHeader';
import { CleanListeningAudioBar } from './CleanListeningAudioBar';
import { CleanListeningTranscriptPane } from './CleanListeningTranscriptPane';
import { CleanListeningExerciseGroupsPane } from './CleanListeningExerciseGroupsPane';
import { CleanListeningDetailBottomBar } from './CleanListeningDetailBottomBar';
import { CleanListeningDetailSkeleton } from './CleanListeningDetailSkeleton';
import { useAttemptListeningDetail } from '@/hooks/useAttemptListeningDetail';

interface CleanListeningDetailViewProps {
  onBack?: () => void;
  onRetake: () => void;
  attemptId?: string;
  selectedParts?: string[];
}

export function CleanListeningDetailView({
  onBack,
  onRetake,
  attemptId,
  selectedParts
}: CleanListeningDetailViewProps) {
  const { data, loading } = useAttemptListeningDetail(attemptId);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [activeQuestionNumber, setActiveQuestionNumber] = useState<number>(1);
  const [highlightedEvidenceText, setHighlightedEvidenceText] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const rawSections = data.sections || [];
  const rawQuestions = data.questions || [];
  const rawGroups = data.exercise_groups || [];

  const { filteredSections, filteredQuestions, filteredExerciseGroups } = useMemo(() => {
    if (!selectedParts?.length) return { filteredSections: rawSections, filteredQuestions: rawQuestions, filteredExerciseGroups: rawGroups };
    const partNums = selectedParts.map(Number);
    const s = rawSections.filter((sec) => partNums.includes(sec.section_number));
    const q = rawQuestions.filter((que) => partNums.includes(que.section_number));
    const g = rawGroups.filter((grp) => partNums.includes(grp.section_number));
    return {
      filteredSections: s.length > 0 ? s : rawSections,
      filteredQuestions: q.length > 0 ? q : rawQuestions,
      filteredExerciseGroups: g.length > 0 ? g : rawGroups,
    };
  }, [rawSections, rawQuestions, rawGroups, selectedParts]);

  const currentSection = filteredSections[activeSectionIndex] || filteredSections[0] || {
    section_number: 1, title: 'Part 1', audio_url: '', duration_seconds: 450, transcript_utterances: []
  };

  const currentSectionQuestions = filteredQuestions.filter(q => q.section_number === currentSection.section_number);
  const currentExerciseGroups = filteredExerciseGroups.filter(eg => eg.section_number === currentSection.section_number);

  const getSectionScoreText = (sectionNum: number) => {
    const qList = filteredQuestions.filter(q => q.section_number === sectionNum);
    return `${qList.filter(q => q.is_correct).length}/${qList.length} Questions`;
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
      audioRef.current.load();
    }
    if (currentSectionQuestions.length > 0) {
      setActiveQuestionNumber(currentSectionQuestions[0].question_number);
      setHighlightedEvidenceText(null);
    }
  }, [activeSectionIndex, currentSection.section_number]);

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      if (newVol > 0 && isMuted) {
        audioRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  const handlePlayAtTime = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
    audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
  };

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return <CleanListeningDetailSkeleton />;

  const calculatedCorrectCount = filteredQuestions.filter(q => q.is_correct).length;

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full bg-zinc-100 overflow-hidden">
      <CleanListeningDetailHeader testId={data.test_id} onRetake={onRetake} onBack={onBack} />

      <CleanListeningAudioBar
        audioRef={audioRef}
        audioUrl={currentSection.audio_url}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        fallbackDuration={currentSection.duration_seconds}
        playbackRate={playbackRate}
        isMuted={isMuted}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        onTogglePlay={togglePlay}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration || currentSection.duration_seconds)}
        onEnded={() => setIsPlaying(false)}
        onSeek={handleSeek}
        onRewind10={() => audioRef.current && (audioRef.current.currentTime = Math.max(0, currentTime - 10))}
        onForward10={() => audioRef.current && (audioRef.current.currentTime = Math.min(duration || currentSection.duration_seconds, currentTime + 10))}
        onChangePlaybackRate={() => {
          const rates = [1, 1.25, 1.5, 0.8];
          const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
          setPlaybackRate(nextRate);
          if (audioRef.current) audioRef.current.playbackRate = nextRate;
        }}
        onToggleMute={() => {
          if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
          }
        }}
        formatAudioTime={formatAudioTime}
      />

      <div className="flex-1 flex overflow-hidden">
        <CleanListeningTranscriptPane
          currentSection={currentSection}
          currentSectionQuestions={currentSectionQuestions}
          activeQuestionNumber={activeQuestionNumber}
          highlightedEvidenceText={highlightedEvidenceText}
          onSelectQuestion={(num) => setActiveQuestionNumber(num)}
          onPlayAtTime={handlePlayAtTime}
        />

        <CleanListeningExerciseGroupsPane
          userName="long"
          submittedAt={data.submitted_at}
          overallBand={data.overall_band}
          correctCount={calculatedCorrectCount}
          totalQuestions={filteredQuestions.length || 40}
          currentExerciseGroups={currentExerciseGroups}
          currentSectionQuestions={currentSectionQuestions}
          activeQuestionNumber={activeQuestionNumber}
          onSelectQuestion={(num) => setActiveQuestionNumber(num)}
          onPlayAtTime={handlePlayAtTime}
          onSelectEvidenceText={(text) => setHighlightedEvidenceText(text)}
        />
      </div>

      <CleanListeningDetailBottomBar
        sections={filteredSections}
        activeSectionIndex={activeSectionIndex}
        onSelectSection={(idx) => setActiveSectionIndex(idx)}
        getSectionScoreText={getSectionScoreText}
      />
    </div>
  );
}
