"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import { getTopics, createTopic, updateTopic, deleteTopic } from "@/services/topics";
import type { Topic, TaskType, Difficulty } from "@/types";
import toast from "react-hot-toast";
import { TopicTable } from "@/components/admin/TopicTable";
import { TopicModal } from "@/components/admin/TopicModal";
import { DeleteTopicModal } from "@/components/admin/DeleteTopicModal";

export default function AdminTopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    prompt_content: string;
    task_type: TaskType;
    difficulty: Difficulty;
    category: string;
  }>({
    title: "",
    description: "",
    prompt_content: "",
    task_type: "task2",
    difficulty: "medium",
    category: "",
  });

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const data = await getTopics({ limit: 1000 });
      setTopics(data.items);
    } catch (error) {
      toast.error("Không thể tải danh sách đề thi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTopics(); }, []);

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setSelectedTopic(null);
    setFormData({ title: "", description: "", prompt_content: "", task_type: "task2", difficulty: "medium", category: "" });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (topic: Topic) => {
    setModalMode("edit");
    setSelectedTopic(topic);
    setFormData({
      title: topic.title,
      description: topic.description || "",
      prompt_content: topic.prompt_content,
      task_type: topic.task_type,
      difficulty: topic.difficulty,
      category: topic.category || "",
    });
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (topic: Topic) => {
    setSelectedTopic(topic);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (modalMode === "create") {
        await createTopic({ ...formData, description: formData.description || undefined, category: formData.category || undefined });
        toast.success("Thêm đề thi thành công");
      } else {
        if (!selectedTopic) return;
        await updateTopic(selectedTopic.id, formData);
        toast.success("Cập nhật đề thi thành công");
      }
      setIsModalOpen(false);
      fetchTopics();
    } catch (error) {
      toast.error(modalMode === "create" ? "Không thể thêm đề thi" : "Không thể cập nhật đề thi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTopic) return;
    try {
      setSubmitting(true);
      await deleteTopic(selectedTopic.id);
      toast.success("Xóa đề thi thành công");
      setIsDeleteModalOpen(false);
      fetchTopics();
    } catch (error) {
      toast.error("Không thể xóa đề thi");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTopics = topics.filter(
    (t) => t.title.toLowerCase().includes(search.toLowerCase()) || (t.category && t.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">Quản lý Đề thi Writing & Speaking</h1>
          <p className="text-sm sm:text-base text-zinc-500 mt-1">Thêm, sửa, xóa các bộ đề luyện tập và bài thi thử trong hệ thống</p>
        </div>
        <button onClick={handleOpenCreateModal} className="bg-[#932120] text-white px-5 py-2.5 rounded-xl font-bold shadow-xs hover:bg-[#7a1a19] transition-all flex items-center gap-2 text-xs sm:text-sm">
          <Plus className="w-4 h-4" /> Thêm đề thi mới
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden w-full">
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-zinc-50/50">
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input type="text" placeholder="Tìm kiếm đề thi..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 pr-4 py-2.5 border border-zinc-300 rounded-xl text-sm text-zinc-900 bg-white placeholder:text-zinc-400 font-medium focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] w-full" />
          </div>
          <div className="text-xs sm:text-sm font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200 px-3.5 py-1.5 rounded-lg whitespace-nowrap self-start md:self-auto">
            Tổng cộng: {filteredTopics.length} đề thi
          </div>
        </div>

        <TopicTable topics={filteredTopics} loading={loading} onEdit={handleOpenEditModal} onDelete={handleOpenDeleteModal} />
      </div>

      <TopicModal isOpen={isModalOpen} modalMode={modalMode} formData={formData} submitting={submitting} onChange={setFormData} onSubmit={handleSubmit} onClose={() => setIsModalOpen(false)} />
      <DeleteTopicModal isOpen={isDeleteModalOpen} topic={selectedTopic} submitting={submitting} onConfirm={handleDelete} onClose={() => setIsDeleteModalOpen(false)} />
    </div>
  );
}
