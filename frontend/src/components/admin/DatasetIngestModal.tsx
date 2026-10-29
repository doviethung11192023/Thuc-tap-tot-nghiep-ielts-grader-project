"use client";

import React, { useState, useEffect } from "react";
import { Database, Loader2, AlertCircle, X, Sparkles } from "lucide-react";
import { ingestCrawledDataset, scanDataset } from "@/services/admin-content";
import { IngestResultCard } from "@/components/admin/IngestResultCard";
import { IngestProgressBar } from "@/components/admin/IngestProgressBar";
import { DatasetTestList } from "@/components/admin/DatasetTestList";
import { DatasetIngestModalFooter } from "@/components/admin/DatasetIngestModalFooter";
import { DifficultySelectorBar } from "@/components/admin/DifficultySelectorBar";
import type { IngestResponse, DatasetScanResult, TestDifficulty } from "@/types/exam";

interface DatasetIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DatasetIngestModal({ isOpen, onClose, onSuccess }: DatasetIngestModalProps) {
  const [scanData, setScanData] = useState<DatasetScanResult | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDifficulty, setBatchDifficulty] = useState<TestDifficulty>("medium");
  const [forceOverwrite, setForceOverwrite] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentStageText, setCurrentStageText] = useState<string>("");
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setResult(null); setError(null); setLoading(false); setProgress(0);
      setIsScanning(true); setSelectedIds(new Set()); setBatchDifficulty("medium");
      setForceOverwrite(false);
      scanDataset()
        .then((data) => {
          setScanData(data);
          const pending = data.tests.filter((t) => !t.is_imported).map((t) => t.id);
          if (pending.length > 0) {
            setSelectedIds(new Set(pending.slice(0, 10)));
          } else {
            setForceOverwrite(true);
            setSelectedIds(new Set(data.tests.slice(0, 10).map((t) => t.id)));
          }
        })
        .catch((err) => console.error("Failed to scan dataset:", err))
        .finally(() => setIsScanning(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBatchDifficultyChange = (diff: TestDifficulty) => {
    setBatchDifficulty(diff);
    if (!scanData) return;
    setScanData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        tests: prev.tests.map((t) => (selectedIds.has(t.id) ? { ...t, difficulty: diff } : t))
      };
    });
  };

  const handleIndividualDifficultyChange = (id: string, diff: TestDifficulty) => {
    if (!scanData) return;
    setScanData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        tests: prev.tests.map((t) => (t.id === id ? { ...t, difficulty: diff } : t))
      };
    });
  };

  const handleIngest = async () => {
    if (!scanData) return;
    setLoading(true); setError(null); setResult(null); setProgress(15);
    setCurrentStageText("Đang nạp đề thi từ dataset_clean...");

    try {
      const timer = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? prev : prev + Math.floor(Math.random() * 8) + 4));
      }, 500);

      const selectedTests = scanData.tests
        .filter((t) => selectedIds.has(t.id))
        .map((t) => ({ ...t, difficulty: t.difficulty || batchDifficulty }));

      const res = await ingestCrawledDataset({
        selected_tests: selectedTests.length > 0 ? selectedTests : undefined,
        default_difficulty: batchDifficulty,
        only_pending: !forceOverwrite,
      });

      clearInterval(timer);
      setProgress(100);
      setCurrentStageText("Đã nạp và đồng bộ thành công!");
      setResult(res);
      if (res.success) onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Quá trình nạp dữ liệu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-200 flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#932120]/10 flex items-center justify-center text-[#932120]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                Kho Đề Thi Dataset Thực Chiến
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>
              <p className="text-xs text-zinc-500">Tự do lựa chọn đề thi & phân bổ độ khó khi nạp vào hệ thống</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3.5 space-y-3.5 overflow-y-auto pr-1 flex-1 text-xs">
          {!result ? (
            isScanning ? (
              <div className="py-16 text-center bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col items-center justify-center gap-2.5 text-zinc-500">
                <Loader2 className="w-6 h-6 animate-spin text-[#932120]" />
                <span className="font-semibold text-xs">Đang quét toàn bộ kho đề thi clean & đối chiếu CSDL...</span>
              </div>
            ) : scanData ? (
              <>
                <DifficultySelectorBar
                  difficulty={batchDifficulty}
                  onSelect={handleBatchDifficultyChange}
                  selectedCount={selectedIds.size}
                  forceOverwrite={forceOverwrite}
                  onToggleOverwrite={setForceOverwrite}
                />
                <DatasetTestList
                  tests={scanData.tests}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onSelectMultiple={(ids) => setSelectedIds((prev) => new Set([...prev, ...ids]))}
                  onDeselectAll={() => setSelectedIds(new Set())}
                  onDifficultyChange={handleIndividualDifficultyChange}
                  disabled={loading}
                />
              </>
            ) : null
          ) : (
            <IngestResultCard result={result} />
          )}

          {loading && <IngestProgressBar progress={progress} stageText={currentStageText} />}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DatasetIngestModalFooter
          result={result}
          loading={loading}
          selectedCount={selectedIds.size}
          onResetResult={() => { setResult(null); setError(null); setProgress(0); }}
          onClose={onClose}
          onIngest={handleIngest}
        />
      </div>
    </div>
  );
}
