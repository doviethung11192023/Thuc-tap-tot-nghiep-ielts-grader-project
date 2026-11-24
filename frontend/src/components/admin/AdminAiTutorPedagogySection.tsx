"use client";

import React from "react";
import type { AdminTutorConfig } from "@/services/admin-tutor";
import { RobotMascotLottie } from "@/components/exam/tutor/RobotMascotLottie";

interface Props {
  view: "ops" | "branding";
  config: AdminTutorConfig;
  onChange: (patch: Partial<AdminTutorConfig>) => void;
}

export function AdminAiTutorPedagogySection({ view, config, onChange }: Props) {
  const toggleSkill = (skill: "listening" | "reading") => {
    const has = config.enabled_skills.includes(skill);
    const next = has ? config.enabled_skills.filter((s) => s !== skill) : [...config.enabled_skills, skill];
    onChange({ enabled_skills: next });
  };

  const updateChip = (
    field: "quick_chips_listening_vi" | "quick_chips_listening_en" | "quick_chips_reading_vi" | "quick_chips_reading_en",
    idx: number,
    val: string
  ) => {
    const arr = [...config[field]];
    arr[idx] = val;
    onChange({ [field]: arr } as Partial<AdminTutorConfig>);
  };

  if (view === "ops") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-black text-zinc-900">Vận hành, Kỹ năng & Hạn mức (Quota)</h3>
          <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200 cursor-pointer">
            <div>
              <p className="text-xs font-extrabold text-zinc-900">Bật Trợ lý AI Luyện tập toàn hệ thống</p>
              <p className="text-[11px] text-zinc-500">Chỉ áp dụng chế độ Practice (Phòng thi Mock luôn bị khóa cứng)</p>
            </div>
            <input type="checkbox" checked={config.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} className="w-4 h-4 accent-[#932120]" />
          </label>
          <div className="flex items-center gap-4">
            {(["listening", "reading"] as const).map((sk) => (
              <label key={sk} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-800 cursor-pointer">
                <input type="checkbox" checked={config.enabled_skills.includes(sk)} onChange={() => toggleSkill(sk)} className="accent-[#932120]" />
                {sk === "listening" ? "Listening Practice" : "Reading Practice"}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-zinc-600">
              Quota lượt / giờ (5-200)
              <input type="number" min={5} max={200} value={config.hourly_quota} onChange={(e) => onChange({ hourly_quota: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-900" />
            </label>
            <label className="text-xs font-bold text-zinc-600">
              Số cặp lịch sử giữ lại
              <input type="number" min={2} max={20} value={config.max_history_turns} onChange={(e) => onChange({ max_history_turns: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-900" />
            </label>
            <label className="text-xs font-bold text-zinc-600">
              Ký tự tối đa / câu hỏi
              <input type="number" min={100} max={1000} value={config.max_input_chars} onChange={(e) => onChange({ max_input_chars: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-900" />
            </label>
            <label className="text-xs font-bold text-zinc-600">
              Cache Quick-Chip TTL (giây)
              <input type="number" min={0} max={86400} value={config.quick_chip_cache_ttl_sec} onChange={(e) => onChange({ quick_chip_cache_ttl_sec: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-900" />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-black text-zinc-900">Sư phạm Socratic & Chống lộ đáp án (Anti-Spoiler)</h3>
          <label className="block text-xs font-bold text-zinc-600">
            Chế độ Anti-Spoiler
            <select value={config.anti_spoiler_mode} onChange={(e) => onChange({ anti_spoiler_mode: e.target.value as AdminTutorConfig["anti_spoiler_mode"] })} className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-900">
              <option value="strict">Strict — Cấm tuyệt đối lộ đáp án + Lọc stream tự động</option>
              <option value="balanced">Balanced — Ưu tiên gợi ý, linh hoạt hơn</option>
              <option value="off">Off — Cho phép giải đáp trực tiếp</option>
            </select>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-bold text-zinc-600">
              Lần thử trước mở khóa
              <input type="number" min={0} max={3} value={config.min_attempts_before_unlock} onChange={(e) => onChange({ min_attempts_before_unlock: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs" />
            </label>
            <label className="text-xs font-bold text-zinc-600">
              Tầng gợi ý mặc định
              <input type="number" min={1} max={3} value={config.default_hint_tier} onChange={(e) => onChange({ default_hint_tier: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs" />
            </label>
            <label className="text-xs font-bold text-zinc-600">
              Số từ tối đa / trả lời
              <input type="number" min={60} max={300} value={config.max_response_words} onChange={(e) => onChange({ max_response_words: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs" />
            </label>
          </div>
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer">
              <input type="checkbox" checked={config.allow_answer_unlock} onChange={(e) => onChange({ allow_answer_unlock: e.target.checked })} className="accent-[#932120]" />
              Cho phép nút &ldquo;Mở khóa đáp án &amp; giải thích&rdquo; có xác nhận 1 bước
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer">
              <input type="checkbox" checked={config.enable_reading_highlight} onChange={(e) => onChange({ enable_reading_highlight: e.target.checked })} className="accent-[#932120]" />
              Gắn nút nhấn [Đoạn A/B/C] để cuộn &amp; tô sáng bài Reading
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer">
              <input type="checkbox" checked={config.enable_band_adaptive_tone} onChange={(e) => onChange({ enable_band_adaptive_tone: e.target.checked })} className="accent-[#932120]" />
              Tự động điều chỉnh văn phong theo Band hiện tại của học viên (BR-12)
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-black text-zinc-900">Thương hiệu & Lời chào Trợ lý AI</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-zinc-600">
              Tên hiển thị (Bot Name)
              <input value={config.bot_name} maxLength={40} onChange={(e) => onChange({ bot_name: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-900" />
            </label>
            <label className="text-xs font-bold text-zinc-600">
              Ngôn ngữ mặc định
              <select value={config.default_language} onChange={(e) => onChange({ default_language: e.target.value as "vi" | "en" })} className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold">
                <option value="vi">Tiếng Việt (VI)</option>
                <option value="en">English (EN)</option>
              </select>
            </label>
          </div>
          <label className="block text-xs font-bold text-zinc-600">
            Lời chào Tiếng Việt
            <textarea rows={2} value={config.welcome_message_vi} onChange={(e) => onChange({ welcome_message_vi: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-900" />
          </label>
          <label className="block text-xs font-bold text-zinc-600">
            Welcome Message (EN)
            <textarea rows={2} value={config.welcome_message_en} onChange={(e) => onChange({ welcome_message_en: e.target.value })} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-900" />
          </label>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col items-center justify-between gap-3">
          <h3 className="text-sm font-black text-zinc-900 self-start">Mascot Animation Preview</h3>
          <RobotMascotLottie size={96} speed={config.mascot_speed} enabled={config.mascot_animation_enabled} />
          <div className="w-full space-y-2">
            <label className="flex items-center justify-between text-xs font-bold text-zinc-700 cursor-pointer">
              <span>Bật chuyển động Lottie</span>
              <input type="checkbox" checked={config.mascot_animation_enabled} onChange={(e) => onChange({ mascot_animation_enabled: e.target.checked })} className="accent-[#932120]" />
            </label>
            <label className="block text-xs font-bold text-zinc-600">
              Tốc độ ({config.mascot_speed}x)
              <input type="range" min={0.5} max={2} step={0.05} value={config.mascot_speed} onChange={(e) => onChange({ mascot_speed: Number(e.target.value) })} className="w-full accent-[#932120]" />
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
        <h3 className="text-sm font-black text-zinc-900">Nút gợi ý nhanh (Quick Chips) & Chỉ thị hệ thống bổ sung</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            ["quick_chips_reading_vi", "Reading · Tiếng Việt"],
            ["quick_chips_reading_en", "Reading · English"],
            ["quick_chips_listening_vi", "Listening · Tiếng Việt"],
            ["quick_chips_listening_en", "Listening · English"],
          ] as const).map(([field, label]) => (
            <div key={field} className="space-y-1.5">
              <p className="text-xs font-extrabold text-zinc-700">{label}</p>
              {config[field].map((chip, idx) => (
                <input key={idx} value={chip} onChange={(e) => updateChip(field, idx, e.target.value)} className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900" />
              ))}
            </div>
          ))}
        </div>
        <label className="block text-xs font-bold text-zinc-600">
          Chỉ thị sư phạm bổ sung của trung tâm (Custom System Instructions — tối đa 1200 ký tự)
          <textarea rows={3} maxLength={1200} value={config.custom_system_instructions} onChange={(e) => onChange({ custom_system_instructions: e.target.value })} placeholder="VD: Luôn dùng giọng điệu khuyến khích học viên sinh viên PTIT, giải thích ngắn gọn bằng bullet points..." className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-900" />
        </label>
      </div>
    </div>
  );
}
