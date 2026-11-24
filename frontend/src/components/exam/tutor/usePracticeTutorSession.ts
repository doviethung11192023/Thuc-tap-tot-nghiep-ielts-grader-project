"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getTutorSession,
  resetTutorSession,
  sendTutorFeedback,
  streamTutorMessage,
  type TutorMessage,
  type TutorSessionData,
} from "@/services/ai-tutor";

interface Params {
  attemptId?: string | null;
  attemptError?: string | null;
  mode: "exam" | "practice";
  activeSectionNo: number;
  userAnswers: Record<number, string | string[]>;
}

export type TutorFallbackReason = "auth" | "role" | "mode" | "error";

function classifyAttemptError(msg: string): TutorFallbackReason {
  const lower = msg.toLowerCase();
  if (lower.includes("chế độ") || lower.includes("practice") || lower.includes("mock")) return "mode";
  if (lower.includes("learner") || lower.includes("admin") || lower.includes("expert")) return "role";
  if (lower.includes("đăng nhập") || lower.includes("401") || lower.includes("token")) return "auth";
  return "error";
}

export function usePracticeTutorSession({ attemptId, attemptError, mode, activeSectionNo, userAnswers }: Params) {
  const [session, setSession] = useState<TutorSessionData | null>(null);
  const [disabledByAdmin, setDisabledByAdmin] = useState(false);
  const [fallbackState, setFallbackState] = useState<{ reason: TutorFallbackReason; detail?: string } | null>(null);
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [hintTier, setHintTier] = useState<1 | 2 | 3>(1);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedQuestionNo, setSelectedQuestionNo] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (mode !== "practice" || !attemptId) return;
    let active = true;
    getTutorSession(attemptId)
      .then((data) => {
        if (!active) return;
        if (!data.config.enabled) return setDisabledByAdmin(true);
        setDisabledByAdmin(false);
        setFallbackState(null);
        setSession(data);
        setLanguage(data.config.default_language || "vi");
        const initTier = Number(data.config.default_hint_tier || 1);
        setHintTier(initTier >= 3 ? 3 : initTier === 2 ? 2 : 1);
      })
      .catch((err) => {
        if (!active) return;
        const status = err?.response?.status;
        const detail = String(err?.response?.data?.detail || "");
        if (status === 403 && detail.includes("tạm tắt")) return setDisabledByAdmin(true);
        setFallbackState({ reason: status === 401 ? "auth" : status === 403 ? "role" : "error", detail: detail || undefined });
      });
    return () => { active = false; };
  }, [attemptId, mode]);

  const resolvedFallbackState = useMemo(
    () =>
      fallbackState ??
      (!attemptId && attemptError ? { reason: classifyAttemptError(attemptError), detail: attemptError } : null),
    [fallbackState, attemptId, attemptError]
  );

  const groupsInSection = useMemo(() => {
    if (!session) return [];
    const matched = session.question_groups.filter((g) => g.section_no === activeSectionNo);
    return matched.length > 0 ? matched : session.question_groups;
  }, [session, activeSectionNo]);

  const groupValid = groupsInSection.some((g) => g.id === selectedGroupId);
  const resolvedGroupId = groupValid ? selectedGroupId : groupsInSection[0]?.id || "";
  const resolvedQuestionNo = groupValid ? selectedQuestionNo : null;

  const currentGroup = useMemo(
    () => groupsInSection.find((g) => g.id === resolvedGroupId) || groupsInSection[0] || null,
    [groupsInSection, resolvedGroupId]
  );

  const sendMessage = async (text: string, opts?: { isQuickChip?: boolean; unlockQ?: number }) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || !attemptId) return;
    setErrorMsg(null);
    const targetQ = opts?.unlockQ ?? resolvedQuestionNo;
    setSession((p) => (p ? { ...p, messages: [...p.messages, { id: `u-${Date.now()}`, role: "user", content: trimmed, group_label: currentGroup?.label, target_question_no: targetQ }] } : p));
    setIsStreaming(true);
    setStreamingText("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let acc = "";
    const scopedAnswers = Object.fromEntries(
      (currentGroup?.question_numbers || [])
        .map((qn) => [String(qn), userAnswers[qn]] as const)
        .filter(([, v]) => v !== undefined && v !== "" && (!Array.isArray(v) || v.length > 0))
    ) as Record<string, string | string[]>;

    const lowerMsg = trimmed.toLowerCase();
    const isDraftCheck = lowerMsg.includes("kiểm tra giúp") || lowerMsg.includes("check my");
    const effectiveTier = isDraftCheck ? 3 : hintTier;

    try {
      await streamTutorMessage(
        {
          attempt_id: attemptId, section_no: currentGroup?.section_no || activeSectionNo,
          question_group_id: currentGroup?.id || null, target_question_no: targetQ,
          message: trimmed, language, hint_tier: effectiveTier, unlock_answer: Boolean(opts?.unlockQ),
          is_quick_chip: Boolean(opts?.isQuickChip), user_answers: scopedAnswers,
        },
        {
          onDelta: (c) => { acc += c; setStreamingText(acc); },
          onDone: (meta) => {
            const aMsg: TutorMessage = { id: meta.message_id || `a-${Date.now()}`, role: "assistant", content: acc, group_label: currentGroup?.label, target_question_no: targetQ, unlocked: meta.unlocked, provider: meta.provider, model: meta.model, cached: meta.cached, feedback: null };
            setSession((p) => (p ? { ...p, quota: meta.quota || p.quota, messages: [...p.messages, aMsg] } : p));
          },
          onError: (detail) => setErrorMsg(detail),
        },
        ctrl.signal
      );
    } catch (e: unknown) {
      if ((e as { name?: string })?.name !== "AbortError") setErrorMsg(language === "en" ? "Connection interrupted." : "Kết nối bị gián đoạn.");
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
      setStreamingText("");
    }
  };

  const resetChat = async () => {
    if (!attemptId) return;
    await resetTutorSession(attemptId);
    setSession((p) => (p ? { ...p, messages: [] } : p));
    setErrorMsg(null);
  };

  const submitFeedback = (id: string, rating: "up" | "down") => {
    if (!attemptId) return;
    setSession((p) => (p ? { ...p, messages: p.messages.map((m) => (m.id === id ? { ...m, feedback: rating } : m)) } : p));
    sendTutorFeedback(attemptId, id, rating).catch(() => {});
  };

  return {
    session, disabledByAdmin, fallbackState: resolvedFallbackState, language, setLanguage, hintTier, setHintTier,
    selectedGroupId: resolvedGroupId, setSelectedGroupId, selectedQuestionNo: resolvedQuestionNo, setSelectedQuestionNo,
    currentGroup, isStreaming, streamingText, errorMsg, sendMessage,
    stopStream: () => abortRef.current?.abort(), resetChat, submitFeedback,
  };
}
