import { AdminPageLayout } from '@/components/layout/AdminPageLayout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPageLayout>{children}</AdminPageLayout>;
}
