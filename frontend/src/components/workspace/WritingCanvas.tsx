import React, { useState, useEffect } from 'react';
import { Timer, Play, Pause, Send, Type } from 'lucide-react';

interface WritingCanvasProps {
  onSubmit: (essayText: string) => void;
}

export function WritingCanvas({ onSubmit }: WritingCanvasProps) {
  const [activeTab, setActiveTab] = useState<'timed' | 'paste'>('timed');
  const [text, setText] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(40 * 60); // 40 minutes in seconds

  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      // Auto submit when time is up
      if (text.trim().length > 0) {
        onSubmit(text);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onSubmit, text]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setIsRunning(!isRunning);

  return (
    <div className="flex-1 bg-white flex flex-col h-full">
      {/* Canvas Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-zinc-100">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('timed')}
            className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
              activeTab === 'timed'
                ? 'text-zinc-900 border-[#932120]'
                : 'text-zinc-400 border-transparent hover:text-zinc-600'
            }`}
          >
            Timed Session
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
              activeTab === 'paste'
                ? 'text-zinc-900 border-[#932120]'
                : 'text-zinc-400 border-transparent hover:text-zinc-600'
            }`}
          >
            Paste to Check
          </button>
        </div>

        <div className="flex items-center gap-6">
          {/* Word Count */}
          <div className="flex items-center gap-2 text-zinc-500 text-sm font-medium">
            <Type className="w-4 h-4" />
            <span className={wordCount < 250 ? 'text-amber-500' : 'text-green-600'}>
              {wordCount}
            </span>
            <span>/ 250 WORDS</span>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-3 bg-zinc-50 px-4 py-1.5 rounded-full border border-zinc-200">
            <Timer className="w-4 h-4 text-zinc-500" />
            <span className="font-mono font-semibold text-zinc-700">
              {formatTime(timeLeft)}
            </span>
            <button
              onClick={toggleTimer}
              className="text-[#932120] hover:text-[#7a1a19] transition-colors ml-2"
            >
              {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
          </div>

          {/* Submit Button */}
          <button
            onClick={() => onSubmit(text)}
            disabled={wordCount === 0}
            className="flex items-center gap-2 bg-[#932120] text-white px-5 py-2 rounded-full text-sm font-bold shadow-sm hover:bg-[#7a1a19] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Text Area */}
      <div className="flex-1 p-8 relative group">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start writing your essay here..."
          className="w-full h-full resize-none outline-none text-zinc-800 text-lg leading-relaxed placeholder:text-zinc-300 font-sans bg-transparent"
          spellCheck={false}
          disabled={activeTab === 'timed' && !isRunning && text.length === 0}
        />
        {activeTab === 'timed' && !isRunning && text.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
            <button
              onClick={toggleTimer}
              className="flex items-center gap-3 bg-[#932120] text-white px-8 py-4 rounded-full text-lg font-bold shadow-lg hover:bg-[#7a1a19] hover:scale-105 transition-all"
            >
              <Play className="w-6 h-6 fill-current" />
              Start Writing Timer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
