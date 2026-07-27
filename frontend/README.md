# IELTS Writing AI Grader — Frontend

## 🚀 Khởi động
```bash
npm run dev   # Chạy dev server tại http://localhost:3000
```

## 📁 Cấu trúc thư mục (quan trọng — đọc trước khi code)

```
src/
├── app/                        ← Các TRANG (mỗi folder = 1 URL)
│   ├── (student)/              ← Nhóm trang dành cho Học viên
│   │   ├── dashboard/          → URL: /dashboard  (UC08: Tiến trình học tập)
│   │   ├── topics/             → URL: /topics     (UC04: Ngân hàng đề thi)
│   │   ├── exam/               → URL: /exam       (UC05: Nộp bài viết)
│   │   └── results/[essayId]/  → URL: /results/abc123  (UC06: Xem kết quả)
│   │
│   ├── (admin)/                ← Nhóm trang dành cho Admin
│   │   └── admin/
│   │       ├── topics/         → URL: /admin/topics      (UC09)
│   │       ├── users/          → URL: /admin/users       (UC10)
│   │       ├── logs/           → URL: /admin/logs        (UC11)
│   │       └── statistics/     → URL: /admin/statistics  (UC12)
│   │
│   ├── login/                  → URL: /login   (UC02)
│   └── register/               → URL: /register (UC01)
│
├── components/                 ← Các UI COMPONENTS dùng lại nhiều nơi
│   ├── ui/                     ← Components cơ bản (Button, Input, Badge...)
│   ├── shared/                 ← Components dùng chung (Navbar, Footer...)
│   ├── student/                ← Components riêng cho học viên
│   └── admin/                  ← Components riêng cho admin
│
├── hooks/                      ← Custom React Hooks
│   ├── useAuth.ts              ← Quản lý đăng nhập/đăng xuất
│   └── useRealtimeEssayStatus.ts ← Nhận kết quả AI qua Supabase Realtime
│
├── services/                   ← Hàm gọi API (dựa theo api_design_specification.md)
│   ├── essays.ts               ← API 1, 2, 6
│   ├── topics.ts               ← API 3, 5, 8
│   └── users.ts                ← API 4, 7, 9, 10, 11
│
├── types/
│   └── index.ts                ← TypeScript interfaces (dựa theo UML + API spec)
│
└── lib/
    ├── supabase.ts             ← Kết nối Supabase (Auth + Realtime)
    ├── api-client.ts           ← Axios instance (gọi FastAPI backend)
    └── utils.ts                ← Hàm tiện ích (format điểm, đếm từ...)
```

## 🔑 Cấu hình .env.local
Điền thông tin Supabase (lấy từ app.supabase.com → project → settings → API):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## 📌 Thứ tự làm màn hình (Actor: Học viên — làm trước)
1. `/login` và `/register` — Auth với Supabase
2. `/topics` — Danh sách đề thi (gắn API 5)
3. `/exam` — Viết & nộp bài (gắn API 1 + Realtime)
4. `/results/[essayId]` — Kết quả + highlight lỗi (gắn API 2)
5. `/dashboard` — Tiến trình học tập (gắn API 4, 6)
