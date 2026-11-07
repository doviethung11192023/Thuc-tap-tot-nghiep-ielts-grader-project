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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800">Đồng ý ghi âm giọng nói</h2>
        </div>

        <p className="text-sm text-slate-600">Bài Speaking cần ghi âm câu trả lời của bạn. Trước khi bắt đầu, bạn cần biết:</p>

        <ul className="space-y-2 text-sm text-slate-700 list-disc pl-5">
          <li><strong>Mục đích:</strong> chỉ để chấm bài Speaking của bạn và hiển thị kết quả.</li>
          <li><strong>Thời gian lưu:</strong> audio tự động bị xoá sau 180 ngày.</li>
          <li><strong>Nơi lưu:</strong> audio được lưu trên dịch vụ đám mây ở nước ngoài. Bản ghi lời nói (transcript) được gửi tới dịch vụ AI ở nước ngoài để chấm, không kèm tên hay email.</li>
          <li><strong>Quyền của bạn:</strong> có thể rút lại đồng ý ở trang hồ sơ.</li>
        </ul>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={onDecline}
            disabled={saving}
            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl text-sm transition-colors"
          >
            Không đồng ý và thoát
          </button>
          <button
            onClick={handleAccept}
            disabled={saving}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-2xl text-sm transition-colors"
          >
            {saving ? 'Đang lưu...' : 'Tôi đồng ý'}
          </button>
        </div>
      </div>
    </div>
  );
};
