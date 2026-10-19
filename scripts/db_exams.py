#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
db_exams.py — يستورد الامتحانات التجريبية ومفاتيح الإجابة إلى Neon.

صيغة الملف: shared/exams/<subject-id>.json
{
  "subjectId": "math",
  "exams": [
    {
      "title": "امتحان تجريبي ١ — الرياضيات",
      "durationMinutes": 60,
      "status": "sample",
      "sourceNote": "من إعدادنا على نموذج ورقة ولاية نهر النيل ٢٠٢٤",
      "answerKey": "الحل الكامل سطراً سطراً… (يُحفظ في المكتبة)",
      "questions": [
        {
          "question": "نص السؤال؟",
          "options": ["أ", "ب", "ج", "د"],
          "correctIndex": 1,
          "explanation": "التبرير — يظهر للطالب بعد التسليم"
        }
      ]
    }
  ]
}

القواعد:
    * آمن تماماً: لا يحذف أي شيء، ولا يمسّ الطلاب ولا المحاولات.
    * مفتاح التكرار: (subjectId, title) — الامتحان الموجود يُحدَّث،
      وأسئلته تُضاف فقط إن لم يكن لها أسئلة بعد (حماية المحاولات السابقة).
    * `answerKey` يُحفظ كمورد (Resource) من فئة «مفتاح الإجابة» في المكتبة.

الاستخدام:
    python3 scripts/db_exams.py            # كل الملفات
    python3 scripts/db_exams.py math       # مادة واحدة
"""
import json
import os
import re
import sys

import psycopg2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXAMS_DIR = os.path.join(ROOT, 'shared', 'exams')


def database_url():
    url = os.environ.get('DATABASE_URL')
    if url:
        return url
    secrets = '/home/user/.arena-secrets.env'
    if os.path.exists(secrets):
        for line in open(secrets, encoding='utf-8'):
            if line.startswith('DATABASE_URL='):
                return line.split('=', 1)[1].strip().strip("'\"")
    raise SystemExit('❌ لا يوجد DATABASE_URL')


def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', (text or '').lower()).strip('-')[:60] or 'key'


def upsert_exam(cur, subject_id, exam):
    """ينشئ/يحدّث الامتحان ويعيد id — ويستورد أسئلته إن لم توجد بعد."""
    cur.execute(
        """
        INSERT INTO "Exam" (subjectId, title, "durationMinutes", status)
        VALUES (%s,%s,%s,%s)
        ON CONFLICT (subjectId, title) DO UPDATE SET
          "durationMinutes" = EXCLUDED."durationMinutes", status = EXCLUDED.status
        RETURNING id
        """,
        (subject_id, exam['title'], exam.get('durationMinutes', 30),
         exam.get('status', 'sample')),
    )
    # لا يوجد UNIQUE على (subjectId, title) افتراضياً — نتأكد من عدم التكرار يدوياً
    exam_id = cur.fetchone()[0]
    return exam_id


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    if not os.path.isdir(EXAMS_DIR):
        os.makedirs(EXAMS_DIR, exist_ok=True)
        print(f'أنشأت {EXAMS_DIR} — ضع ملفات الامتحانات هنا')
        return

    files = ([only + '.json'] if only else
             sorted(f for f in os.listdir(EXAMS_DIR) if f.endswith('.json')))
    if not files:
        print('لا ملفات امتحانات بعد — ضع ملفات JSON في shared/exams/')
        return

    conn = psycopg2.connect(database_url())
    cur = conn.cursor()
    tot_e = tot_q = tot_k = 0
    for fname in files:
        data = json.load(open(os.path.join(EXAMS_DIR, fname), encoding='utf-8'))
        subject_id = data['subjectId']
        for exam in data.get('exams', []):
            # مفتاح تكرار صريح: نبحث عن الامتحان أولاً
            cur.execute(
                'SELECT id FROM "Exam" WHERE "subjectId"=%s AND title=%s',
                (subject_id, exam['title']))
            row = cur.fetchone()
            if row:
                exam_id = row[0]
                cur.execute(
                    'UPDATE "Exam" SET "durationMinutes"=%s, status=%s WHERE id=%s',
                    (exam.get('durationMinutes', 30), exam.get('status', 'sample'), exam_id))
            else:
                cur.execute(
                    'INSERT INTO "Exam" ("subjectId", title, "durationMinutes", status) '
                    'VALUES (%s,%s,%s,%s) RETURNING id',
                    (subject_id, exam['title'], exam.get('durationMinutes', 30),
                     exam.get('status', 'sample')))
                exam_id = cur.fetchone()[0]

            # الأسئلة: فقط إن لم يكن للامتحان أسئلة (حماية المحاولات السابقة)
            cur.execute('SELECT COUNT(*) FROM "ExamQuestion" WHERE "examId"=%s', (exam_id,))
            existing = cur.fetchone()[0]
            added = 0
            if existing == 0:
                for i, q in enumerate(exam.get('questions', []), 1):
                    cur.execute(
                        """INSERT INTO "ExamQuestion"
                           (id, "examId", "lessonId", question, options, "correctIndex", explanation)
                           VALUES (%s,%s,NULL,%s,%s,%s,%s)""",
                        (f'{exam_id}-q{i}', exam_id, q['question'],
                         json.dumps(q['options'], ensure_ascii=False),
                         q['correctIndex'], q.get('explanation', '')))
                    added += 1

            # مفتاح الإجابة الكامل → مورد في المكتبة
            key_id = None
            if exam.get('answerKey'):
                key_id = f'res-{subject_id}-{slug(exam["title"])}-key'
                cur.execute(
                    """INSERT INTO "Resource"
                       (id, "subjectId", title, category, "fileType", "fileSize",
                        "pageCount", description, "previewSummary", status)
                       VALUES (%s,%s,%s,'مفتاح إجابة','text','—',0,%s,'[]','sample')
                       ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description""",
                    (key_id, subject_id, f'مفتاح الإجابة — {exam["title"]}',
                     exam['answerKey']))
                tot_k += 1

            print(f'✅ {subject_id} · «{exam["title"]}» · أسئلة أُضيفت {added}'
                  f'{" (كان له أسئلة — أُبقي)" if existing else ""}'
                  f'{" · مفتاح إجابة" if key_id else ""}')
            tot_e += 1
            tot_q += added
    conn.commit()
    print(f'─── الإجمالي: {tot_e} امتحاناً · {tot_q} سؤالاً · {tot_k} مفتاح إجابة (بلا أي حذف)')
    conn.close()


if __name__ == '__main__':
    main()
