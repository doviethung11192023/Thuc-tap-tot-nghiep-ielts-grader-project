"""Xoá cache RAM của phía Learner (danh mục, nội dung đề, bài tập theo dạng) khi Admin đổi đề, để publish hoặc
archive có hiệu lực ngay thay vì chờ hết TTL."""


def clear_student_caches() -> None:
    from app.api.endpoints.student_practice import attempts, catalog, exercises
    catalog._CATALOG_CACHE.clear()
    attempts._TEST_CONTENT_CACHE.clear()
    exercises._EXERCISES_CACHE.clear()
    exercises._TYPES_SUMMARY_CACHE.clear()
