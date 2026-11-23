import React, { useState } from "react";
import { X } from "lucide-react";
import { adminCreateAdmin, adminCreateExpert } from "@/services/users";
import toast from "react-hot-toast";
import { UserCreateSuccess } from "@/components/admin/UserCreateSuccess";
import { UserCreateForm } from "@/components/admin/UserCreateForm";

interface UserCreateModalProps {
  isOpen: boolean;
  initialRole?: "admin" | "expert";
  onClose: () => void;
  onSuccess: () => void;
}

export function UserCreateModal({
  isOpen,
  initialRole = "expert",
  onClose,
  onSuccess,
}: UserCreateModalProps) {
  const [modalRole, setModalRole] = useState<"admin" | "expert">(initialRole);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountName, setAccountName] = useState("");
  const [expertBio, setExpertBio] = useState("");
  const [expertMaxReviews, setExpertMaxReviews] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<{
    email: string;
    role: "admin" | "expert";
    setup_link?: string | null;
  } | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setAccountEmail("");
    setAccountName("");
    setExpertBio("");
    setExpertMaxReviews(5);
    setCreatedResult(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountEmail.trim() || !accountName.trim()) {
      toast.error("Vui lòng điền đầy đủ Email và Họ tên");
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalRole === "admin") {
        const res = await adminCreateAdmin({
          email: accountEmail.trim(),
          full_name: accountName.trim(),
        });
        toast.success("Đã gửi email kích hoạt và tạo tài khoản Admin!");
        setCreatedResult({
          email: accountEmail.trim(),
          role: "admin",
          setup_link: res.data?.setup_link,
        });
      } else {
        const res = await adminCreateExpert({
          email: accountEmail.trim(),
          full_name: accountName.trim(),
          bio: expertBio.trim() || undefined,
          max_active_reviews: Number(expertMaxReviews) || 5,
        });
        toast.success("Đã gửi email kích hoạt và tạo tài khoản Expert!");
        setCreatedResult({
          email: accountEmail.trim(),
          role: "expert",
          setup_link: res.data?.setup_link,
        });
      }
      onSuccess();
    } catch (err: any) {
      toast.error(
        err.response?.data?.detail ||
          `Lỗi khi tạo tài khoản ${modalRole === "admin" ? "Admin" : "Expert"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!createdResult ? (
          <UserCreateForm
            modalRole={modalRole}
            setModalRole={setModalRole}
            accountEmail={accountEmail}
            setAccountEmail={setAccountEmail}
            accountName={accountName}
            setAccountName={setAccountName}
            expertBio={expertBio}
            setExpertBio={setExpertBio}
            expertMaxReviews={expertMaxReviews}
            setExpertMaxReviews={setExpertMaxReviews}
            isSubmitting={isSubmitting}
            onSubmit={handleCreateAccount}
            onCancel={handleClose}
          />
        ) : (
          <UserCreateSuccess
            email={createdResult.email}
            role={createdResult.role}
            setupLink={createdResult.setup_link}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
}
