"use client";
import { LessonBuilderLayout } from "@/views/lesson-builder/LessonBuilderLayout";
import AdminUsers from "@/views/admin/AdminUsers";
export default function Page() {
  return (
    <LessonBuilderLayout>
      <AdminUsers />
    </LessonBuilderLayout>
  );
}
