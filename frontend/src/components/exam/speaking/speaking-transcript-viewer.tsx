"use client";

import React, { useState } from 'react';
import { Play, Pause, BarChart2 } from 'lucide-react';

interface SpeakingTranscriptViewerProps {
  questionTitle: string;
  questionPrompt: string;
  ratingBadge?: string;
  audioDuration?: string;
  activeFilter?: string; // 'collocations' | 'grammar' | 'pronunciation_good' | 'pronunciation_improve' | 'complex' | etc.
  highlightedKeyword?: string | null;
  onSelectKeyword?: (keyword: string) => void;
}

export const SpeakingTranscriptViewer: React.FC<SpeakingTranscriptViewerProps> = ({
  questionTitle,
  questionPrompt,
  ratingBadge = 'Excellent',
  audioDuration = '00:00/00:28',
  activeFilter = 'collocations',
  highlightedKeyword = null,
  onSelectKeyword,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
      {/* Question Header */}
      <div className="space-y-1.5 pb-2 border-b border-slate-100">
        <h2 className="text-base sm:text-lg font-bold text-slate-900">
          {questionTitle}
        </h2>
        <p className="text-sm font-semibold text-slate-800 leading-snug">
          {questionPrompt}
        </p>
      </div>

      {/* Student Answer Title & Badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-600">
          Câu trả lời của bạn
        </span>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-bold shadow-2xs">
          <BarChart2 className="w-3.5 h-3.5" />
          <span>{ratingBadge}</span>
        </div>
      </div>

      {/* Audio Player Bar */}
      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-sm shrink-0"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="28"
            value={audioProgress}
            onChange={(e) => setAudioProgress(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <span className="text-xs font-mono text-slate-500 whitespace-nowrap">
            {audioDuration}
          </span>
        </div>
      </div>

      {/* Transcript Header & Content */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Transcript
        </h3>

        {/* Annotated Text */}
        <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans select-text">
          {/* Complex Structure Mode (12.png) */}
          {activeFilter === 'complex' ? (
            <p>
              Expressing gratitude is considered a basic piece of everyday etiquette in Vietnam.{' '}
              <span className="text-emerald-700 font-medium underline decoration-emerald-500 decoration-2 underline-offset-4 bg-emerald-50/70 px-1 py-0.5 rounded cursor-pointer">
                People regularly say thank you when receiving customer service at a store, getting help from a colleague, or accepting a favor.<sup>1</sup>
              </span>{' '}
              However, among very close family members or intimate friends, people sometimes show appreciation through actions or small gestures rather than saying the actual words. As formal facts, can occasionally feel a bit distant.
            </p>
          ) : activeFilter === 'grammar' ? (
            /* Grammar Error Mode (20.png) */
            <p>
              Expressing gratitude is considered a basic piece of everyday etiquette in Vietnam. People regularly say thank you when receiving customer service at a store, getting help from a colleague, or accepting a favor. However, among very close family members or intimate friends, people sometimes show appreciation through actions or small gestures rather than saying{' '}
              <span className="text-red-600 font-bold underline decoration-red-500 decoration-2 underline-offset-4 bg-red-50 px-1 py-0.5 rounded cursor-pointer">
                the<sup>1</sup>
              </span>{' '}
              actual words. As formal facts, can occasionally feel a bit distant.
            </p>
          ) : activeFilter === 'pronunciation_improve' ? (
            /* Pronunciation Improvement Mode (21.png) */
            <p>
              Expressing{' '}
              <span className="text-amber-700 font-semibold underline decoration-amber-500 decoration-2 underline-offset-4 bg-amber-50/60 px-0.5 rounded cursor-pointer">
                gratitude
              </span>{' '}
              is{' '}
              <span className="text-amber-700 font-semibold underline decoration-amber-500 decoration-2 underline-offset-4 bg-amber-50/60 px-0.5 rounded cursor-pointer">
                considered
              </span>{' '}
              a basic{' '}
              <span className="text-amber-700 font-semibold underline decoration-amber-500 decoration-2 underline-offset-4 bg-amber-50/60 px-0.5 rounded cursor-pointer">
                piece of
              </span>{' '}
              everyday{' '}
              <span className="text-amber-700 font-semibold underline decoration-amber-500 decoration-2 underline-offset-4 bg-amber-50/60 px-0.5 rounded cursor-pointer">
                etiquette in Vietnam
              </span>
              . People regularly say thank you when receiving customer service at a store, getting help{' '}
              <span className="text-amber-700 font-semibold underline decoration-amber-500 decoration-2 underline-offset-4 bg-amber-50/60 px-0.5 rounded cursor-pointer">
                from
              </span>{' '}
              a colleague, or accepting a favor. However, among very close family members{' '}
              <span className="text-amber-700 font-semibold underline decoration-amber-500 decoration-2 underline-offset-4 bg-amber-50/60 px-0.5 rounded cursor-pointer">
                or intimate friends
              </span>
              , people sometimes show appreciation through actions{' '}
              <span className="text-amber-700 font-semibold underline decoration-amber-500 decoration-2 underline-offset-4 bg-amber-50/60 px-0.5 rounded cursor-pointer">
                or small
              </span>{' '}
              gestures{' '}
              <span className="text-amber-700 font-semibold underline decoration-amber-500 decoration-2 underline-offset-4 bg-amber-50/60 px-0.5 rounded cursor-pointer">
                rather
              </span>{' '}
              than{' '}
              <span className="text-amber-700 font-semibold underline decoration-amber-500 decoration-2 underline-offset-4 bg-amber-50/60 px-0.5 rounded cursor-pointer">
                saying the actual words
              </span>
              . As formal facts,{' '}
              <span className="text-amber-700 font-semibold underline decoration-amber-500 decoration-2 underline-offset-4 bg-amber-50/60 px-0.5 rounded cursor-pointer">
                can
              </span>{' '}
              occasionally feel a bit distant.
            </p>
          ) : activeFilter === 'pronunciation_good' ? (
            /* Good Pronunciation Mode (13.png, 14.png) */
            <p>
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">Expressing</span>{' '}
              gratitude{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">is</span>{' '}
              considered{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">a</span>{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">basic</span>{' '}
              piece of{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">everyday</span>{' '}
              etiquette in Vietnam.{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">People</span>{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">regularly</span>{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">say</span>{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">thank</span>{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">you</span>{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">when</span>{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">receiving</span>{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">customer</span>{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">service</span>{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">at</span>{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">a</span>{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">store</span>,{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">getting</span>{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">help</span>{' '}
              from a colleague, or{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">accepting</span>{' '}
              a{' '}
              <span className="text-emerald-700 underline decoration-emerald-500 decoration-1 underline-offset-4 cursor-pointer">favor</span>...
            </p>
          ) : (
            /* Default Collocations / Linking Mode (11.png) */
            <p>
              <span
                onClick={() => onSelectKeyword && onSelectKeyword('Expressing - gratitude')}
                className="text-emerald-700 font-semibold underline decoration-emerald-500 decoration-2 underline-offset-4 bg-emerald-50/60 px-0.5 rounded cursor-pointer hover:bg-emerald-100"
              >
                Expressing<sup>1</sup> gratitude<sup>1</sup>
              </span>{' '}
              is considered a basic{' '}
              <span
                onClick={() => onSelectKeyword && onSelectKeyword('piece - of')}
                className="text-emerald-700 font-semibold underline decoration-emerald-500 decoration-2 underline-offset-4 bg-emerald-50/60 px-0.5 rounded cursor-pointer hover:bg-emerald-100"
              >
                piece<sup>2</sup> of<sup>2</sup>
              </span>{' '}
              everyday etiquette in Vietnam. People regularly say thank you when{' '}
              <span
                onClick={() => onSelectKeyword && onSelectKeyword('receiving - service')}
                className="text-emerald-700 font-semibold underline decoration-emerald-500 decoration-2 underline-offset-4 bg-emerald-50/60 px-0.5 rounded cursor-pointer hover:bg-emerald-100"
              >
                receiving<sup>3</sup>{' '}
                <span className="underline decoration-emerald-500">customer<sup>4</sup></span> service<sup>3·4</sup>
              </span>{' '}
              <span
                onClick={() => onSelectKeyword && onSelectKeyword('at - a - store')}
                className="text-emerald-700 font-semibold underline decoration-emerald-500 decoration-2 underline-offset-4 bg-emerald-50/60 px-0.5 rounded cursor-pointer hover:bg-emerald-100"
              >
                at<sup>5</sup> a<sup>5</sup> store<sup>5</sup>
              </span>,{' '}
              <span
                onClick={() => onSelectKeyword && onSelectKeyword('getting - help')}
                className="text-emerald-700 font-semibold underline decoration-emerald-500 decoration-2 underline-offset-4 bg-emerald-50/60 px-0.5 rounded cursor-pointer hover:bg-emerald-100"
              >
                getting<sup>6</sup> help<sup>6</sup>
              </span>{' '}
              from a colleague, or accepting a favor. However, among{' '}
              <span className="text-emerald-700 font-semibold underline decoration-emerald-500 decoration-2 underline-offset-4 bg-emerald-50/60 px-0.5 rounded cursor-pointer">
                very<sup>7</sup> close<sup>7·8</sup> family<sup>8·9</sup> members<sup>9</sup>
              </span>{' '}
              or{' '}
              <span className="text-emerald-700 font-semibold underline decoration-emerald-500 decoration-2 underline-offset-4 bg-emerald-50/60 px-0.5 rounded cursor-pointer">
                intimate<sup>10</sup> friends<sup>10</sup>
              </span>, people sometimes{' '}
              <span className="text-emerald-700 font-semibold underline decoration-emerald-500 decoration-2 underline-offset-4 bg-emerald-50/60 px-0.5 rounded cursor-pointer">
                show<sup>11</sup> appreciation<sup>11</sup>
              </span>{' '}
              through actions or{' '}
              <span className="text-emerald-700 font-semibold underline decoration-emerald-500 decoration-2 underline-offset-4 bg-emerald-50/60 px-0.5 rounded cursor-pointer">
                small<sup>12</sup> gestures<sup>12</sup>
              </span>{' '}
              rather than{' '}
              <span className="text-emerald-700 font-semibold underline decoration-emerald-500 decoration-2 underline-offset-4 bg-emerald-50/60 px-0.5 rounded cursor-pointer">
                saying<sup>13</sup> the actual words<sup>13</sup>
              </span>. As formal facts, can occasionally feel a bit distant.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
