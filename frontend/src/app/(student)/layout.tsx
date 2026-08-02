import { StudentPageLayout } from '@/components/layout/StudentPageLayout';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <StudentPageLayout>{children}</StudentPageLayout>;
}
