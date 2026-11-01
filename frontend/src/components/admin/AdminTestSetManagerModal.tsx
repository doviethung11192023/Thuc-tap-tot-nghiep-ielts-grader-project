"use client";

import React, { useState, useEffect } from "react";
import { FolderKanban, Plus, X, Loader2 } from "lucide-react";
import {
  getAdminTestSets,
  createAdminTestSet,
  updateAdminTestSet,
  deleteAdminTestSet,
  type AdminTestSetItem,
} from "@/services/admin-test-sets";
import { AdminTestSetRow } from "./AdminTestSetRow";

interface AdminTestSetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSetFilter?: (setId: string) => void;
  onChanged?: () => void;
}

export function AdminTestSetManagerModal({
  isOpen,
  onClose,
  onSelectSetFilter,
  onChanged,
}: AdminTestSetManagerModalProps) {
  const [sets, setSets] = useState<AdminTestSetItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newName, setNewName] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSets = async () => {
    setLoading(true);
    try {
      const data = await getAdminTestSets();
      setSets(data.items || []);
    } catch {
      setError("Không thể tải danh sách bộ đề");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSets();
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createAdminTestSet(newName.trim());
      setNewName("");
      await fetchSets();
      onChanged?.();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Không thể tạo bộ đề mới");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async (setId: string) => {
    if (!editName.trim()) return;
    setActionLoading(true);
    try {
      await updateAdminTestSet(setId, editName.trim());
      setEditingId(null);
      await fetchSets();
      onChanged?.();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Không thể đổi tên bộ đề");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (setId: string, name: string) => {
    if (!confirm(`Xác nhận xóa bộ đề "${name}"? Các bài thi thuộc bộ này sẽ được chuyển về dạng độc lập.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await deleteAdminTestSet(setId);
      await fetchSets();
      onChanged?.();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Không thể xóa bộ đề");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-200/80 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 text-[#932120] rounded-2xl border border-red-100">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">Quản Lý Bộ Đề Thi (Test Sets)</h2>
              <p className="text-xs text-zinc-500">Tạo, đổi tên và sắp xếp các tuyển tập đề thi trong hệ thống</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-700 rounded-xl hover:bg-zinc-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create Input Box */}
        <form onSubmit={handleCreate} className="p-5 sm:p-6 border-b border-zinc-100 bg-white flex gap-3 items-center">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nhập tên bộ đề mới (VD: Cambridge IELTS 19 Academic)..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#932120]/20 font-medium"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Tạo Bộ Đề</span>
          </button>
        </form>

        {error && (
          <div className="mx-6 mt-3 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Sets List */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-zinc-400">
              <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#932120] mb-2" />
              <p className="text-xs font-medium">Đang nạp danh sách bộ đề...</p>
            </div>
          ) : sets.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs font-medium">
              Chưa có bộ đề nào. Hãy nhập tên và bấm &quot;Tạo Bộ Đề&quot; ở trên.
            </div>
          ) : (
            sets.map((item) => (
              <AdminTestSetRow
                key={item.id}
                item={item}
                isEditing={editingId === item.id}
                editName={editName}
                onEditNameChange={setEditName}
                onStartEdit={(it) => { setEditingId(it.id); setEditName(it.name); }}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => setEditingId(null)}
                onDelete={handleDelete}
                onSelectSetFilter={(id) => {
                  onSelectSetFilter?.(id);
                  onClose();
                }}
                disabled={actionLoading}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-xs font-bold text-zinc-700 transition-colors cursor-pointer">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
