# Master Plan: IELTS Listening & Reading Exam Room Architecture (V4)

**Status:** Ready for `/ck:cook`  
**Target Spec:** `REPORT-RL-AUDIT-PROPOSAL-V4` (IELTS on Computer Standard)  
**Scope:** Frontend (`ListeningWorkspace`, `ListeningAudioBar`, `ListeningQuestionsPane`, `useListeningPlayer`, `ReadingWorkspace`) + Backend (`practice_attempt_lifecycle.py`)

---

## 1. Root Cause Debug Findings (`/ck:debug`)

| ID | Severity | Location | Root Cause |
| :--- | :--- | :--- | :--- |
| **BUG-LIS-EXAM-01** | **CRITICAL** | `ListeningWorkspace.tsx` (L58-65), `useListeningPlayer.ts` (L39-64) | `useListeningPlayer` is bound to `currentSection = availableSections[activeSection]`. Switching Section tabs changes `audioUrl`/`sectionKey`, triggering `useEffect` which calls `audio.pause()`, sets `isPlaying(false)`, and reloads `audio.src`. **Audio stops when switching sections.** |
| **BUG-LIS-EXAM-02** | **CRITICAL** | `ListeningWorkspace.tsx` (L69-103), `useListeningPlayer.ts` (L198-202) | `ListeningWorkspace` uses a flat 30-min countdown instead of Section `1 → 4` continuous playback. `useListeningPlayer.handleEnded` only resets `currentTime = 0` and has no `onEnded` callback to auto-advance `activeAudioSection` or trigger the **2-Minute Final Review Period** after Section 4 ends. |
| **BUG-LIS-EXAM-03** | **HIGH** | `ListeningAudioBar.tsx` (L86-100) | In `exam` mode, the Play/Pause button is never disabled once playback begins, allowing candidates to pause the exam audio. |
| **BUG-LIS-EXAM-04** | **HIGH** | `backend/app/services/practice/practice_attempt_lifecycle.py` (L17-18, L53, L86-95) | `DEFAULT_MINUTES["listening"] = 30` with `LATE_GRACE_SECONDS = 30`. When audio (~28-32m) + 2-minute review period runs past 30m30s, forced auto-submit at `00:00` risks HTTP `409 ConflictError("Đã quá thời gian làm bài")`. |
| **BUG-LR-EXAM-05** | **MEDIUM** | `ListeningWorkspace.tsx` (L31-43), `ReadingWorkspace.tsx` (L30-42) | `localStorage` draft is restored unconditionally even in `mode === 'exam'`, risking stale answers leaking into a fresh mock exam attempt. Also, forced auto-submit needs explicit input-lock state (`isAutoSubmitting` / `isReviewExpired`) to guarantee zero edits after `00:00`. |

---

## 2. Implementation Phases (`/ck:plan`)

### Phase 1: Decouple `activeAudioSection` from `viewingSection` (Continuous Background Audio)
**Files:**
- `frontend/src/hooks/useListeningPlayer.ts`
- `frontend/src/components/exam/ListeningWorkspace.tsx`
- `frontend/src/components/exam/listening/ListeningQuestionsPane.tsx`

**Changes:**
1. **`useListeningPlayer.ts`**:
   - Add optional `onEnded?: () => void` and `autoPlayOnSectionChange?: boolean` options to `UseListeningPlayerOptions`.
   - In `handleEnded`, invoke `onEnded?.()` after resetting section state.
   - When `autoPlayOnSectionChange` is true (or `exam` mode auto-advancing to next section), automatically call `audio.play()` on `canplay` / `loadedmetadata` (with safe `.catch()` fallback if browser blocks autoplay).
2. **`ListeningWorkspace.tsx`**:
   - Separate state into:
     - `viewingSection` (replaces `activeSection` for UI tab & questions pane — learner can switch freely between Sections 1–4).
     - `activeAudioSection` (tracks which Section's audio is currently playing in Exam Mode; in `practice` mode it stays synced with `viewingSection` so learners can practice individual sections freely).
     - `hasExamAudioStarted` (boolean) + `examPhase`: `'audio' | 'review' | 'expired'` (used when `mode === 'exam'`).
   - Pass `audioSection = mode === 'exam' ? availableSections[activeAudioSection] : availableSections[viewingSection]` to `useListeningPlayer`.
   - On `onAudioEnded` in `exam` mode:
     - If `activeAudioSection < availableSections.length - 1`: increment `activeAudioSection` by `1` and auto-play the next section's audio.
     - If `activeAudioSection === availableSections.length - 1` (Section 4 ended): transition `examPhase` to `'review'` and start the `120`-second (`02:00`) Final Review countdown!
3. **`ListeningQuestionsPane.tsx`**:
   - Add optional `playingAudioSectionIndex?: number` + `isExamAudioPlaying?: boolean` prop so the Section tab currently playing audio displays a subtle live audio indicator (e.g. pulsing dot / speaker badge) even when the learner is viewing another Section tab.

---

### Phase 2: Lock Audio Controls in Exam Mode (`ListeningAudioBar`)
**Files:**
- `frontend/src/components/exam/listening/ListeningAudioBar.tsx`

**Changes:**
1. Accept `activeAudioSectionNumber?: number`, `totalSections?: number`, `examPhase?: 'audio' | 'review' | 'expired'`, and `hasExamAudioStarted?: boolean`.
2. **Exam Mode Control Lock**:
   - Play/Pause button: Once `hasExamAudioStarted && isPlaying` in `exam` mode, `disabled={true}` (cannot pause). If `examPhase === 'review' || examPhase === 'expired'`, disable Play button and show `"Đã kết thúc Audio • Thời gian kiểm tra bài"`.
   - If browser blocks initial autoplay on room entry, show a clear primary CTA button (`"Bắt đầu phát Audio thi"`), and once clicked, lock Pause for the remainder of the test.
   - Keep Rewind/Forward/Seeker/Speed hidden in `exam` mode (`1.0x` locked).
   - Keep Volume slider & Mute button always enabled.
   - Display `"Đang phát Section X / Y"` badge in Exam Mode so candidates always know which section the audio stream is on while browsing other tabs.

---

### Phase 3: 2-Minute Review Period, Forced Auto-Submit & Backend Deadline Alignment
**Files:**
- `frontend/src/components/exam/listening/ListeningWorkspaceHeader.tsx`
- `frontend/src/components/exam/ListeningWorkspace.tsx`
- `frontend/src/components/exam/ReadingWorkspace.tsx`
- `backend/app/services/practice/practice_attempt_lifecycle.py`

**Changes:**
1. **2-Minute Review Banner & Countdown (`ListeningWorkspace.tsx` + `ListeningWorkspaceHeader.tsx`)**:
   - During `examPhase === 'audio'` in `exam` mode: header displays `"Audio Section X/4"` (plus remaining/elapsed safety timer) instead of pretending to have a fixed 30m countdown that desyncs from actual audio length.
   - When `examPhase === 'review'` (triggered when Section 4 `onEnded` fires):
     - Show a prominent amber/crimson banner above the questions pane: `"Audio đã kết thúc. Bạn có 02:00 để kiểm tra lại toàn bộ đáp án trước khi hệ thống tự động nộp bài."` with live `MM:SS` countdown (`120 → 0`).
     - Header timer switches to the `02:00` Review Countdown in highlighted warning style.
     - Candidate can click **"Nộp bài"** early at any time during audio or review period.
2. **Forced Auto-Submit at `00:00`**:
   - When `reviewSeconds` hits `0` (Listening) or `timerSeconds` hits `0` (Reading):
     - Set `examPhase = 'expired'` / `isLocked = true` (`pointer-events-none select-none` on question inputs to immediately prevent edits).
     - Bypass `SubmitConfirmModal` (`setIsSubmitModalOpen(false)`), set `isGrading = true` (displays `GradingProgressOverlay`), and invoke `onSubmit(userAnswers)` once via `autoSubmittedRef`.
3. **Draft Isolation in Exam Mode (`ListeningWorkspace.tsx` & `ReadingWorkspace.tsx`)**:
   - Only read/write `localStorage` `draftKey` when `mode === 'practice'`. In `exam` mode, start with clean `{}` (unless keyed to an active `attemptId`, or fresh state) so previous practice drafts never pollute a mock exam.
4. **Backend Deadline Alignment (`backend/app/services/practice/practice_attempt_lifecycle.py`)**:
   - In `start_attempt` / `DEFAULT_MINUTES`: ensure Listening mock attempts include a `+5` minute buffer (`duration + 5` or `max(duration, 35)`) on `deadline_at` to accommodate real-world audio durations (~30m) + 2-minute Review Period + network latency without falsely triggering HTTP `409 ConflictError` on forced auto-submit.

---

### Phase 4: Verification Plan
1. **TypeScript & Build Check**:
   - Run `cd frontend; npx tsc --noEmit` to confirm zero type errors.
2. **Backend Check**:
   - Verify `practice_attempt_lifecycle.py` syntax/tests (`uv run pytest` if unit tests exist for practice lifecycle).
3. **Live Browser Verification (`ck:agent-browser`)**:
   - Test **Listening Exam Mode**:
     - Start audio → verify Pause/Rewind/Forward/Seeker/Speed are locked, Volume/Mute work.
     - Switch Section tabs `1 → 2 → 3 → 4` while audio plays → verify audio time advances uninterrupted and `userAnswers` persist across tabs & Palette `1-40`.
   - Test **Listening Practice Mode**:
     - Verify Play/Pause, `-5s`/`+5s`, Seeker, Speed (`0.8x/1.0x/1.2x`), Volume/Mute all work freely.
   - Test **Reading Exam & Practice Mode**:
     - Verify Passage switching preserves answers, palette jumps smoothly, and `localStorage` draft only restores in Practice Mode.

---

## 3. Risks & Unresolved Questions
- **Browser Autoplay Policy**: Modern browsers block `<audio>.play()` on mount without a user gesture. If the learner enters `/exam/...` directly via URL refresh, should we attempt `audio.play()` and gracefully show a `"Bắt đầu phát Audio"` prompt if blocked? (Recommended: Yes — auto-attempt play, and if `NotAllowedError` occurs, show the start button; once started, lock Pause).
- **Audio Duration > 30m**: Backend `deadline_at` buffer (`+5` mins for Listening Mock) prevents HTTP 409 when audio + 2m review exceeds 30m.
