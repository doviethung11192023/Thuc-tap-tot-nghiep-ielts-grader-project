import React, { useState } from 'react';
import { Lightbulb, Info, FileText, LayoutList } from 'lucide-react';

export function QuestionPanel() {
  const [activeTab, setActiveTab] = useState<'system' | 'custom'>('system');

  return (
    <div className="w-[340px] flex-shrink-0 bg-zinc-50 border-r border-zinc-200 flex flex-col h-full overflow-y-auto">
      {/* Top Tabs */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('system')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${
            activeTab === 'system'
              ? 'text-[#932120] border-b-2 border-[#932120] bg-white'
              : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
          }`}
        >
          <LayoutList className="w-4 h-4" />
          Random Question
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${
            activeTab === 'custom'
              ? 'text-[#932120] border-b-2 border-[#932120] bg-white'
              : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          Manual Question
        </button>
      </div>

      {/* Main Content */}
      <div className="p-6 flex flex-col gap-6">
        {/* Badges */}
        <div className="flex items-center gap-2">
          <span className="bg-[#932120]/10 text-[#932120] text-xs font-bold px-2 py-1 rounded-md">
            IELTS WRITING
          </span>
          <span className="bg-zinc-200 text-zinc-700 text-xs font-bold px-2 py-1 rounded-md">
            TASK 2
          </span>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium bg-white border border-zinc-200 text-zinc-600 px-3 py-1 rounded-full shadow-sm">
            EDUCATION
          </span>
          <span className="text-xs font-medium bg-white border border-zinc-200 text-zinc-600 px-3 py-1 rounded-full shadow-sm">
            TECHNOLOGY
          </span>
        </div>

        {/* Prompt */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Info className="w-4 h-4" />
            {activeTab === 'system' ? 'Prompt' : 'Enter Your Custom Prompt'}
          </h2>
          {activeTab === 'system' ? (
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm text-zinc-800 text-sm leading-relaxed">
              <p className="font-semibold mb-2">
                Some people believe that the widespread use of the internet has a mostly negative effect on social interaction.
              </p>
              <p>
                To what extent do you agree or disagree with this statement?
              </p>
            </div>
          ) : (
            <textarea
              className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm text-zinc-800 text-sm leading-relaxed w-full min-h-[160px] resize-none outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] transition-all"
              placeholder="Paste your IELTS Writing Task 2 prompt here..."
            />
          )}
        </div>

        {/* Action Button */}
        {activeTab === 'system' ? (
          <button className="w-full py-2.5 rounded-lg border-2 border-[#932120] text-[#932120] font-semibold text-sm hover:bg-[#932120] hover:text-white transition-colors duration-200 flex items-center justify-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Generate New Prompt
          </button>
        ) : (
          <button className="w-full py-2.5 rounded-lg border-2 border-[#932120] text-white bg-[#932120] font-semibold text-sm hover:bg-[#7a1a19] hover:border-[#7a1a19] transition-colors duration-200 flex items-center justify-center gap-2">
            Save Custom Prompt
          </button>
        )}

        {/* Guidelines */}
        <div className="mt-4 flex flex-col gap-3">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
            Guidelines
          </h2>
          <ul className="text-sm text-zinc-600 list-disc list-inside space-y-2">
            <li>Write at least 250 words.</li>
            <li>Spend about 40 minutes on this task.</li>
            <li>Give reasons for your answer and include any relevant examples.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
