"use client";

import React, { use } from 'react';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { EvaluationPanel } from '@/components/workspace/EvaluationPanel';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ResultsPage({ params }: { params: Promise<{ essayId: string }> }) {
  const { essayId } = use(params);
  const essayText = `The internet has undeniably revolutionized the way we communicate, bringing people closer together across vast distances. However, I agree that its widespread use has also had a detrimental impact on face-to-face social interaction.

On the one hand, the internet facilitates instant communication. Platforms like Facebook and WhatsApp allow us to stay in touch with family and friends regardless of geographical barriers. This is particularly beneficial for those living abroad or traveling.

On the other hand, much peoples spend excessive amounts of time online, which can lead to isolation. Instead of engaging in real-world conversations, individuals often prefer scrolling through social media feeds. This constant digital engagement can create a false sense of connection while eroding genuine relationships.

Furthermore, the quality of social interaction has suffered. Face-to-face communication involves non-verbal cues such as body language and tone of voice, which are often lost in text-based messages. This can lead to misunderstandings and a lack of empathy.

In conclusion, while the internet offers unprecedented connectivity, it also poses a significant threat to traditional social interaction. It is crucial to find a balance between our online and offline lives to maintain healthy relationships.`;

  return (
    <StudentPageLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="mb-4 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 bg-white border border-zinc-200 rounded-full hover:bg-zinc-50 text-zinc-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Chi tiết kết quả (Bài #{essayId || '123'})</h1>
            <p className="text-sm text-zinc-500">Đã nộp lúc 10:45 AM, 21/07/2026</p>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden bg-white border border-zinc-200 rounded-2xl shadow-sm relative">
          <div className="flex-1 p-8 overflow-y-auto">
            <h2 className="text-lg font-bold text-zinc-800 mb-6 border-b border-zinc-100 pb-4">Nội dung bài làm</h2>
            <div className="prose max-w-none text-zinc-700 leading-relaxed text-lg">
              {essayText.split('\n\n').map((paragraph, index) => {
                if (index === 2) {
                  return (
                    <p key={index} className="mb-4">
                      On the other hand, <span className="bg-red-100 text-red-800 px-1 rounded line-through decoration-red-500">much peoples</span>{' '}
                      <span className="text-green-600 font-medium">many people</span> spend excessive amounts of time online, which can lead to isolation. Instead of engaging in real-world conversations, individuals often prefer scrolling through social media feeds. This constant digital engagement can create a false sense of connection while eroding genuine relationships.
                    </p>
                  );
                }
                return <p key={index} className="mb-4">{paragraph}</p>;
              })}
            </div>
          </div>
          
          {/* Reuse the EvaluationPanel but make it static (isOpen=true) */}
          <div className="border-l border-zinc-200">
            <EvaluationPanel isOpen={true} onClose={() => {}} />
          </div>
        </div>
      </div>
    </StudentPageLayout>
  );
}
