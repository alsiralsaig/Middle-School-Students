import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Layers, Pencil } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  NotConnectedNote,
  StatusBadge,
  Table,
} from '../components/ui';
import { useSimulatedData } from '../hooks/useSimulatedData';
import { SUBJECTS_DATA, subjectEmoji, CONTENT_STATUS } from '@shared/curriculum';

/* ============================ قائمة المواد ============================ */

export const SubjectsPage: React.FC = () => {
  const { data: subjects, loading } = useSimulatedData(SUBJECTS_DATA);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-navy-800">المواد والدروس</h1>
          <p className="text-xs text-slate-500 mt-1">
            هيكل المنهج كما سيُدار من لوحة التحكم — البيانات الحالية تجريبية.
          </p>
        </div>
        <Button disabled title="الحفظ يتطلب قاعدة بيانات (المرحلة القادمة)">
          إضافة مادة
        </Button>
      </header>

      <Card>
        {loading ? (
          <LoadingState label="جارٍ تحميل المواد…" />
        ) : (
          <Table head={['المادة', 'الكود', 'الوحدات', 'الدروس', 'الحالة', '']}>
            {(subjects ?? []).map((s) => {
              const lessons = s.units.reduce((a, u) => a + u.lessons.length, 0);
              return (
                <tr key={s.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{subjectEmoji(s.id)}</span>
                      <div>
                        <p className="font-bold text-navy-800">{s.name}</p>
                        <p className="text-[10px] text-slate-500">{s.nameEn}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 nums text-slate-500">{s.code}</td>
                  <td className="py-3 px-3 nums">{s.units.length}</td>
                  <td className="py-3 px-3 nums">{lessons}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={CONTENT_STATUS} />
                  </td>
                  <td className="py-3 px-3">
                    <Link
                      to={`/subjects/${s.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-navy-800 hover:text-gold-600"
                    >
                      تفاصيل
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
};

/* ============================ تفاصيل مادة ============================ */

export const SubjectDetailPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { data: subjects, loading } = useSimulatedData(SUBJECTS_DATA);
  const subject = (subjects ?? []).find((s) => s.id === subjectId);

  if (loading) return <LoadingState label="جارٍ تحميل تفاصيل المادة…" />;

  if (!subject) {
    return (
      <div className="space-y-4">
        <Link to="/subjects" className="text-xs font-bold text-navy-800 hover:text-gold-600">
          ← الرجوع للمواد
        </Link>
        <ErrorState
          title="المادة غير موجودة"
          description={`لم يتم العثور على مادة بالمعرف «${subjectId}». تأكد من الرابط أو اختر مادة من القائمة.`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link to="/subjects" className="text-xs font-bold text-navy-800 hover:text-gold-600">
        ← الرجوع للمواد
      </Link>

      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{subjectEmoji(subject.id)}</span>
          <div>
            <h1 className="text-xl font-black text-navy-800">{subject.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{subject.description}</p>
          </div>
        </div>
        <Button disabled title="التعديل يتطلب قاعدة بيانات (المرحلة القادمة)">
          <Pencil className="w-3.5 h-3.5" />
          تعديل المادة
        </Button>
      </header>

      {subject.units.length === 0 ? (
        <Card>
          <EmptyState
            title="لا توجد وحدات بعد"
            description="لم تُضف أي وحدة لهذه المادة. عند ربط قاعدة البيانات ستتمكن من إضافة الوحدات والدروس من هنا."
            hint="المرحلة القادمة: إضافة وحدة"
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {subject.units.map((unit) => (
            <Card
              key={unit.id}
              title={unit.title}
              subtitle={unit.description}
              action={
                <Badge tone="navy">
                  <Layers className="w-3 h-3" />
                  {unit.lessons.length} دروس
                </Badge>
              }
            >
              {unit.lessons.length === 0 ? (
                <EmptyState
                  title="لا توجد دروس في هذه الوحدة"
                  description="أضف الدروس بعد ربط قاعدة البيانات."
                />
              ) : (
                <Table head={['#', 'الدرس', 'المدة', 'الأهداف', 'المرفقات', 'الحالة']}>
                  {unit.lessons.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 nums text-slate-500">{l.lessonNumber}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-navy-800">{l.title}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{l.summary}</p>
                      </td>
                      <td className="py-2.5 px-3 nums">{l.durationMinutes} د</td>
                      <td className="py-2.5 px-3 nums">{l.learningObjectives.length}</td>
                      <td className="py-2.5 px-3 nums">{l.attachments.length}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={CONTENT_STATUS} />
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
          ))}
        </div>
      )}

      <NotConnectedNote>
        أزرار الإضافة والتعديل <strong>معطّلة عمداً</strong>: لا توجد قاعدة بيانات في هذه المرحلة،
        ولن نعرض أزراراً توحي بوجود حفظ وهو غير مُفعّل.
      </NotConnectedNote>

      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <BookOpen className="w-4 h-4 text-navy-800" />
        <span>نفس البيانات معروضة في تطبيق الطالب عبر الحزمة المشتركة.</span>
      </div>
    </div>
  );
};
