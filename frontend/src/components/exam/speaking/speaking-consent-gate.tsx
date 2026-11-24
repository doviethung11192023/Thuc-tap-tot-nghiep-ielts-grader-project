"use client";

import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { giveVoiceConsent } from '@/services/speaking-room';

interface SpeakingConsentGateProps {
  onAccepted: () => void;
  onDecline: () => void;
}

/** Đồng ý ghi âm trước lần ghi đầu tiên (FR-38, UC-35, NFR-07). */
export const SpeakingConsentGate: React.FC<SpeakingConsentGateProps> = ({ onAccepted, onDecline }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setSaving(true);
    setError(null);
    try {
      await giveVoiceConsent();
      onAccepted();
    } catch {
      setError('Không ghi nhận được đồng ý của bạn. Hãy thử lại.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-slate-700/80 p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#932120]/25 text-rose-300 border border-[#932120]/40 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">Đồng ý ghi âm giọng nói</h2>
        </div>

        <p className="text-sm text-slate-300">Bài Speaking cần ghi âm câu trả lời của bạn. Trước khi bắt đầu, bạn cần biết:</p>

        <ul className="space-y-2 text-sm text-slate-300 list-disc pl-5">
          <li><strong className="text-white">Mục đích:</strong> chỉ để chấm bài Speaking của bạn và hiển thị kết quả.</li>
          <li><strong className="text-white">Thời gian lưu:</strong> audio tự động bị xoá sau 180 ngày.</li>
          <li><strong className="text-white">Nơi lưu:</strong> audio được lưu trên dịch vụ đám mây ở nước ngoài. Bản ghi lời nói (transcript) được gửi tới dịch vụ AI ở nước ngoài để chấm, không kèm tên hay email.</li>
          <li><strong className="text-white">Quyền của bạn:</strong> có thể rút lại đồng ý ở trang hồ sơ.</li>
        </ul>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={onDecline}
            disabled={saving}
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl text-sm transition-colors cursor-pointer"
          >
            Không đồng ý và thoát
          </button>
          <button
            onClick={handleAccept}
            disabled={saving}
            className="flex-1 py-3 px-4 bg-[#932120] hover:bg-[#7a1a19] disabled:opacity-60 text-white font-semibold rounded-2xl text-sm transition-colors cursor-pointer"
          >
            {saving ? 'Đang lưu...' : 'Tôi đồng ý'}
          </button>
        </div>
      </div>
    </div>
  );
};
