"use client";

import React, { useEffect, useState } from "react";
import { 
  X, 
  BookOpen, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Check,
  Search
} from "lucide-react";
import { 
  loadExpertSnippets, 
  saveExpertSnippet, 
  deleteExpertSnippet, 
  SnippetItem 
} from "@/lib/expert-snippets";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
  skill?: "writing" | "speaking";
  onSelectSnippet: (text: string) => void;
}

export default function SnippetDrawer({
  isOpen,
  onClose,
  defaultCategory = "ALL",
  skill,
  onSelectSnippet
}: Props) {
  const [snippets, setSnippets] = useState<SnippetItem[]>(loadExpertSnippets());
  const [selectedCat, setSelectedCat] = useState<string>(defaultCategory || "ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelectedCat(defaultCategory || "ALL");
    }
  }, [isOpen, defaultCategory]);

  // Add Snippet form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<any>("TR");
  const [newContent, setNewContent] = useState("");

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const updated = saveExpertSnippet({
      category: newCategory,
      title: newTitle.trim(),
      content: newContent.trim()
    });

    setSnippets(updated);
    setShowAddForm(false);
    setNewTitle("");
    setNewContent("");
    toast.success("Đã thêm nhận xét mẫu vào kho cá nhân!");
  };

  const handleDelete = (id: string) => {
    const updated = deleteExpertSnippet(id);
    setSnippets(updated);
    toast.success("Đã xóa nhận xét mẫu");
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snippets, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `expert_snippets_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          localStorage.setItem("ielts_expert_snippets_v1", JSON.stringify(parsed));
          setSnippets(parsed);
          toast.success(`Đã nạp ${parsed.length} nhận xét mẫu thành công!`);
        }
      } catch (err) {
        toast.error("File JSON không hợp lệ");
      }
    };
    reader.readAsText(file);
  };

  const allowedCats =
    skill === "writing"
      ? ["ALL", "TA", "TR", "CC", "LR", "GRA", "GENERAL"]
      : skill === "speaking"
      ? ["ALL", "FC", "P", "LR", "GRA", "GENERAL"]
      : ["ALL", "TA", "TR", "CC", "LR", "GRA", "FC", "P"];

  const filtered = snippets.filter(s => {
    const allowedBySkill = !skill || allowedCats.includes(s.category);
    const matchCat = selectedCat === "ALL" || s.category === selectedCat;
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.content.toLowerCase().includes(search.toLowerCase());
    return allowedBySkill && matchCat && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs animate-in fade-in">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-zinc-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#932120]" />
            <h2 className="text-sm font-bold text-zinc-900">Kho Nhận Xét Mẫu Cá Nhân</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Bar & Search */}
        <div className="p-4 border-b border-zinc-200 space-y-3 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm mẫu nhận xét..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#932120]"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
            {allowedCats.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                  selectedCat === cat
                    ? "bg-[#932120] text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-xs text-zinc-400">
              Không tìm thấy nhận xét mẫu phù hợp
            </div>
          ) : (
            filtered.map(s => (
              <div
                key={s.id}
                className="p-3 border border-zinc-200 rounded-xl space-y-2 hover:border-[#932120] transition-colors group bg-white shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-700">
                      {s.category}
                    </span>
                    <h4 className="text-xs font-bold text-zinc-900">{s.title}</h4>
                  </div>

                  <button
                    onClick={() => handleDelete(s.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-600 transition-opacity"
                    title="Xóa mẫu này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-zinc-600 leading-relaxed font-serif line-clamp-3">
                  "{s.content}"
                </p>

                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => {
                      onSelectSnippet(s.content);
                      toast.success("Đã chèn nhận xét vào tiêu chí!");
                      onClose();
                    }}
                    className="px-3 py-1 bg-red-50 hover:bg-red-100 text-[#932120] rounded-lg text-xs font-bold transition-colors"
                  >
                    Chèn nhận xét này
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer: Export / Import & Add Form */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 space-y-3">
          {showAddForm ? (
            <form onSubmit={handleAdd} className="space-y-3 bg-white p-3 rounded-xl border border-zinc-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900">Thêm nhận xét mẫu mới</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-600"
                >
                  Đóng
                </button>
              </div>

              <div className="flex gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="text-xs p-1.5 border border-zinc-300 rounded-lg"
                >
                  {["TR", "TA", "CC", "LR", "GRA", "FC", "P", "GENERAL"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Tiêu đề mẫu..."
                  required
                  className="flex-1 text-xs p-1.5 border border-zinc-300 rounded-lg"
                />
              </div>

              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={2}
                placeholder="Nội dung nhận xét chi tiết..."
                required
                className="w-full text-xs p-2 border border-zinc-300 rounded-lg"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#932120] text-white text-xs font-bold rounded-lg hover:bg-[#7a1a19]"
                >
                  Lưu mẫu
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-2 bg-white border border-dashed border-zinc-300 hover:border-[#932120] text-zinc-700 hover:text-[#932120] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Thêm mẫu nhận xét cá nhân
            </button>
          )}

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              onClick={handleExport}
              className="text-zinc-500 hover:text-zinc-800 flex items-center gap-1 text-[11px]"
              title="Xuất dữ liệu ra file JSON để sao lưu"
            >
              <Download className="w-3.5 h-3.5" /> Xuất JSON
            </button>

            <label className="text-zinc-500 hover:text-zinc-800 flex items-center gap-1 text-[11px] cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Nạp file JSON
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
