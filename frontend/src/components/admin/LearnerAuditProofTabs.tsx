"use client";

import React from "react";

export function Br12ProofTab({ br12 }: { br12: any }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 text-xs sm:text-sm text-blue-950 font-semibold">
        Công thức Tổng (BR-02): <span className="font-mono font-black">{br12.overall_formula}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {br12.skills.map((sk: any) => (
          <div key={sk.skill} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-zinc-900">{sk.skill}</span>
              <span className="font-black text-[#932120]">Hiện tại: {sk.current_band.toFixed(1)} / Mục tiêu: {sk.target_band.toFixed(1)} (Thiếu {sk.gap.toFixed(1)})</span>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-white border border-zinc-200 font-semibold text-zinc-700">{sk.rule_applied}</div>
            <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 font-mono text-emerald-900 font-bold">{sk.formula}</div>
            {sk.included_attempts.length > 0 && (
              <div>
                <p className="font-bold text-zinc-600 mb-1">Bài đưa vào tính toán ({sk.included_attempts.length}):</p>
                <ul className="space-y-1">
                  {sk.included_attempts.map((a: any) => (
                    <li key={a.id} className="flex justify-between bg-white px-2.5 py-1 rounded border border-zinc-100">
                      <span className="truncate max-w-[200px]">{a.title} ({a.mode})</span>
                      <span className="font-black text-blue-700">Band {Number(a.band).toFixed(1)} • {a.date}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {sk.excluded_attempts.length > 0 && (
              <p className="text-[11px] text-zinc-500">Đã loại trừ {sk.excluded_attempts.length} lượt (nộp trắng 0.0 / đang chờ Expert / ngoài cửa sổ).</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function UtilityAndEwmaProofTab({ sections }: { sections: any }) {
  return (
    <div className="space-y-5 text-xs">
      <div>
        <h4 className="font-black text-zinc-900 text-sm mb-2">1. Chẩn đoán trọng số thời gian EWMA (α = 0.7)</h4>
        <div className="overflow-x-auto border border-zinc-200 rounded-xl">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 text-zinc-600 font-bold uppercase text-[11px]">
              <tr><th className="px-3 py-2">Dạng câu / Tiêu chí</th><th className="px-3 py-2">Số mẫu gần nhất</th><th className="px-3 py-2">Giá trị EWMA</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(sections.ewma_weakness_proof || []).map((r: any, i: number) => (
                <tr key={i}><td className="px-3 py-2 font-bold text-zinc-800">{r.item}</td><td className="px-3 py-2">{r.sample_count}</td><td className="px-3 py-2 font-black text-[#932120]">{r.ewma_value}</td></tr>
              ))}
              {(!sections.ewma_weakness_proof || sections.ewma_weakness_proof.length === 0) && (
                <tr><td colSpan={3} className="px-3 py-4 text-center text-zinc-400">Chưa có dữ liệu câu trả lời/tiêu chí — đang ở chế độ Chẩn đoán.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="font-black text-zinc-900 text-sm mb-2">2. Bảng chấm điểm 4 Thành phần MatchScore (%) cho từng đề trong kho</h4>
        <div className="overflow-x-auto border border-zinc-200 rounded-xl">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 text-zinc-600 font-bold uppercase text-[11px]">
              <tr>
                <th className="px-3 py-2">Tên đề</th><th className="px-3 py-2">Độ khó</th>
                <th className="px-3 py-2">Khớp yếu (45%)</th><th className="px-3 py-2">ZPD (25%)</th>
                <th className="px-3 py-2">Spaced Rep (20%)</th><th className="px-3 py-2">Pha (10%)</th>
                <th className="px-3 py-2">Tổng Match</th><th className="px-3 py-2">Trạng thái chọn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(sections.utility_match_score_proof || []).map((u: any) => (
                <tr key={u.id} className={u.selected_slot !== "-" ? "bg-emerald-50/50" : ""}>
                  <td className="px-3 py-2 font-bold text-zinc-900">{u.title}</td>
                  <td className="px-3 py-2 uppercase">{u.difficulty}</td>
                  <td className="px-3 py-2 font-mono">{u.w_cov}</td>
                  <td className="px-3 py-2 font-mono">{u.w_zpd}</td>
                  <td className="px-3 py-2 font-mono">{u.w_sr} {u.days_ago !== null ? `(${u.days_ago}d)` : "(Mới)"}</td>
                  <td className="px-3 py-2 font-mono">{u.w_phase}</td>
                  <td className="px-3 py-2 font-black text-emerald-700">{u.total_score}%</td>
                  <td className="px-3 py-2 font-bold text-[#932120]">{u.selected_slot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function MonthlyAndLedgerProofTab({ sections, mode }: { sections: any; mode: "monthly" | "ledger" }) {
  if (mode === "monthly") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        <div className="border border-zinc-200 rounded-xl overflow-hidden">
          <div className="bg-zinc-50 px-3 py-2 font-black text-zinc-800 border-b border-zinc-200">Số liệu theo Tháng (Giờ Việt Nam UTC+7)</div>
          <table className="w-full text-left">
            <thead className="bg-zinc-50/60 text-zinc-500 font-bold text-[11px]">
              <tr><th className="px-3 py-2">Tháng</th><th className="px-3 py-2">Overall</th><th className="px-3 py-2">Đúng L/R</th><th className="px-3 py-2">Giờ</th><th className="px-3 py-2">Tạm tính?</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(sections.monthly_progression || []).slice().reverse().map((m: any) => (
                <tr key={m.month}><td className="px-3 py-2 font-bold">{m.label}</td><td className="px-3 py-2 font-black text-[#932120]">{m.overall_band ?? "--"}</td><td className="px-3 py-2">{m.lr_accuracy_percent !== null ? `${m.lr_accuracy_percent}%` : "-"}</td><td className="px-3 py-2">{m.study_hours}h</td><td className="px-3 py-2">{m.is_provisional ? "Có (<2 bài)" : "Đạt chuẩn"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border border-zinc-200 rounded-xl overflow-hidden">
          <div className="bg-zinc-50 px-3 py-2 font-black text-zinc-800 border-b border-zinc-200">Minh chứng Gom cụm Phiên học (Session Clustering ≤30p)</div>
          <table className="w-full text-left">
            <thead className="bg-zinc-50/60 text-zinc-500 font-bold text-[11px]">
              <tr><th className="px-3 py-2">Ngày</th><th className="px-3 py-2">Số phút hợp lệ</th><th className="px-3 py-2">Quy đổi giờ</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(sections.daily_session_clusters || []).map((d: any) => (
                <tr key={d.date}><td className="px-3 py-2 font-bold">{d.date}</td><td className="px-3 py-2">{d.minutes} phút</td><td className="px-3 py-2 font-bold text-emerald-700">{d.hours}h</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto border border-zinc-200 rounded-xl text-xs">
      <table className="w-full text-left">
        <thead className="bg-zinc-50 text-zinc-600 font-bold uppercase text-[11px]">
          <tr><th className="px-3 py-2">Thời điểm (UTC+7)</th><th className="px-3 py-2">Đề thi</th><th className="px-3 py-2">Kỹ năng / Chế độ</th><th className="px-3 py-2">Trạng thái</th><th className="px-3 py-2">Câu đúng</th><th className="px-3 py-2">Band</th></tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {(sections.raw_attempts_ledger || []).map((a: any) => (
            <tr key={a.id} className="hover:bg-zinc-50">
              <td className="px-3 py-2 whitespace-nowrap font-mono">{a.submitted_vn}</td>
              <td className="px-3 py-2 font-bold text-zinc-900">{a.title}</td>
              <td className="px-3 py-2 uppercase">{a.skill} ({a.mode})</td>
              <td className="px-3 py-2">{a.status}</td>
              <td className="px-3 py-2">{a.raw_score !== null ? `${a.raw_score}/${a.question_count || 40}` : "-"}</td>
              <td className="px-3 py-2 font-black text-blue-700">{a.band ?? (a.preliminary_band ? `${a.preliminary_band} (AI sơ bộ)` : "-")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
