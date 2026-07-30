"use client";

import React, { useState, useEffect } from 'react';
import { AdminPageLayout } from '@/components/layout/AdminPageLayout';
import { Search, Plus, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { getTopics, createTopic, updateTopic, deleteTopic } from '@/services/topics';
import type { Topic, TaskType, Difficulty } from '@/types';
import toast from 'react-hot-toast';

export default function AdminTopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  
  // Form states
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    prompt_content: string;
    task_type: TaskType;
    difficulty: Difficulty;
    category: string;
  }>({
    title: '',
    description: '',
    prompt_content: '',
    task_type: 'task2',
    difficulty: 'medium',
    category: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  
  // Delete states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const data = await getTopics({ limit: 1000 }); // fetch all for simplicity, or implement pagination
      setTopics(data.items);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải danh sách đề thi');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedTopic(null);
    setFormData({
      title: '',
      description: '',
      prompt_content: '',
      task_type: 'task2',
      difficulty: 'medium',
      category: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (topic: Topic) => {
    setModalMode('edit');
    setSelectedTopic(topic);
    setFormData({
      title: topic.title,
      description: topic.description || '',
      prompt_content: topic.prompt_content,
      task_type: topic.task_type,
      difficulty: topic.difficulty,
      category: topic.category || ''
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
      if (modalMode === 'create') {
        await createTopic({
          ...formData,
          description: formData.description || undefined,
          category: formData.category || undefined,
        });
        toast.success('Thêm đề thi thành công');
      } else {
        if (!selectedTopic) return;
        await updateTopic(selectedTopic.id, formData);
        toast.success('Cập nhật đề thi thành công');
      }
      setIsModalOpen(false);
      fetchTopics();
    } catch (error) {
      console.error(error);
      toast.error(modalMode === 'create' ? 'Không thể thêm đề thi' : 'Không thể cập nhật đề thi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTopic) return;
    try {
      setSubmitting(true);
      await deleteTopic(selectedTopic.id);
      toast.success('Xóa đề thi thành công');
      setIsDeleteModalOpen(false);
      fetchTopics();
    } catch (error) {
      console.error(error);
      toast.error('Không thể xóa đề thi');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTopics = topics.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    (t.category && t.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AdminPageLayout>
      <div className="space-y-6 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Quản lý Đề thi</h1>
            <p className="text-sm text-zinc-500 mt-1">Thêm, sửa, xóa các đề thi trong hệ thống</p>
          </div>
          <button 
            onClick={handleOpenCreateModal}
            className="bg-[#932120] text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-[#7a1a19] transition-colors flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Thêm đề thi mới
          </button>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm đề thi..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] w-64 bg-white"
              />
            </div>
            <div className="text-sm font-medium text-zinc-500">
              Tổng cộng: {filteredTopics.length} đề thi
            </div>
          </div>
          
          <div className="overflow-x-auto min-h-[300px]">
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-[#932120]" />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 font-bold">
                    <th className="px-6 py-4 text-center w-16">STT</th>
                    <th className="px-6 py-4">Tiêu đề / Prompt</th>
                    <th className="px-6 py-4">Phân loại</th>
                    <th className="px-6 py-4 text-center">Trạng thái</th>
                    <th className="px-6 py-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredTopics.map((topic, index) => (
                    <tr key={topic.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-zinc-500 text-center">#{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-zinc-900 line-clamp-1 max-w-md" title={topic.title}>{topic.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">{topic.category || 'N/A'}</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#932120]">{topic.task_type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          topic.is_active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {topic.is_active ? 'Active' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleOpenEditModal(topic)}
                            className="p-1.5 text-zinc-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors" 
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleOpenDeleteModal(topic)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors" 
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTopics.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-zinc-500 text-sm">
                        Không tìm thấy đề thi nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal Thêm/Sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-zinc-200">
              <h2 className="text-xl font-bold text-zinc-900">
                {modalMode === 'create' ? 'Thêm đề thi mới' : 'Cập nhật đề thi'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Tiêu đề *</label>
                <input 
                  required
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Đề bài (Prompt) *</label>
                <textarea 
                  required
                  rows={4}
                  value={formData.prompt_content}
                  onChange={(e) => setFormData({...formData, prompt_content: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Loại bài thi *</label>
                  <select 
                    value={formData.task_type}
                    onChange={(e) => setFormData({...formData, task_type: e.target.value as TaskType})}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
                  >
                    <option value="task1">Task 1</option>
                    <option value="task2">Task 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Độ khó *</label>
                  <select 
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value as Difficulty})}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Danh mục (Category)</label>
                <input 
                  type="text" 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Mô tả thêm (Description)</label>
                <textarea 
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
                ></textarea>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-zinc-700 font-medium hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#932120] text-white font-bold rounded-lg hover:bg-[#7a1a19] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {modalMode === 'create' ? 'Thêm mới' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xóa */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold text-zinc-900 mb-2">Xác nhận xóa</h2>
              <p className="text-sm text-zinc-600">
                Bạn có chắc chắn muốn xóa đề thi <span className="font-bold">"{selectedTopic?.title}"</span>? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="p-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-zinc-700 font-medium hover:bg-zinc-200 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Xóa đề thi
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminPageLayout>
  );
}

