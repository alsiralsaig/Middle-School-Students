import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './layout/AdminLayout';
import { OverviewPage } from './pages/OverviewPage';
import { ContentPage } from './pages/ContentPage';
import { LibraryPage } from './pages/LibraryPage';
import { RatingsPage } from './pages/RatingsPage';
import { SubjectDetailPage, SubjectsPage } from './pages/SubjectsPage';
import { ActivitiesPage, SettingsPage, StudentsPage } from './pages/MiscPages';
import { EmptyState } from './components/ui';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/subjects/:subjectId" element={<SubjectDetailPage />} />
          <Route path="/content" element={<ContentPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/ratings" element={<RatingsPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/activities" element={<ActivitiesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route
            path="*"
            element={
              <div className="bg-white border border-slate-200 rounded-2xl">
                <EmptyState
                  title="الصفحة غير موجودة"
                  description="الرابط المطلوب غير متاح في لوحة الإدارة. استخدم القائمة الجانبية للتنقّل."
                  hint="رمز الخطأ: 404"
                />
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
