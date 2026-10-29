"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Home, ChevronRight, Search } from "lucide-react";
import { useExamCollectionDetail } from "@/hooks/useExamCollection";
import { ExamCollectionHeader } from "@/components/exam/student-practice/ExamCollectionHeader";
import { ExamCollectionTestRow } from "@/components/exam/student-practice/ExamCollectionTestRow";

export default function ExamCollectionDetailPage() {
  const params = useParams();
  const setId = params?.setId as string;

  const { collection } = useExamCollectionDetail(setId);
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "not_started">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTests = collection.tests.filter((test) => {
    const isCompleted = test.skills.some((s) => s.status === "completed");
    if (filterStatus === "completed" && !isCompleted) return false;
    if (filterStatus === "not_started" && isCompleted) return false;
    if (searchQuery && !test.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="w-full max-w-[1536px] mx-auto space-y-6 px-2 sm:px-4 py-2">
      <nav className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
        <Link href="/test-practice" className="hover:text-[#932120] flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5" />
          <span>Test Practice</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
        <span className="text-zinc-800 font-bold">{collection.title}</span>
      </nav>

      <ExamCollectionHeader collection={collection} />

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200">
          <h2 className="text-lg font-black text-zinc-900 tracking-tight">
            Danh sách đề
          </h2>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === "all" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Tất cả đề
              </button>
              <button
                onClick={() => setFilterStatus("completed")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === "completed" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Đã làm
              </button>
              <button
                onClick={() => setFilterStatus("not_started")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === "not_started" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Chưa làm
              </button>
            </div>

            <div className="relative flex-1 sm:w-56">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm đề..."
                className="w-full pl-8 pr-3 py-1 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#932120]/20"
              />
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
            </div>
          </div>
        </div>

        <div className="space-y-3.5">
          {filteredTests.map((test) => (
            <ExamCollectionTestRow
              key={test.id}
              test={test}
              collectionId={collection.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
