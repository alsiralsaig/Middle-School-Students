#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
db_sync.py — مزامنة المحتوى مع Neon **بدون مسح أي شيء**.

الفرق عن `npm run db:seed`:
    البذر يحذف كل الجداول (بما فيها الطلاب وتقدمهم ومحاولاتهم) ثم يبني من جديد.
    هذا السكربت يرفع (upsert) المواد والوحدات والدروس فقط — بالسطر الواحد إن
    وُجد، أو يُنشئه إن لم يوجد — ولا يمسّ المستخدمين ولا المحاولات ولا
    التقدم ولا الرموز.

الاستخدام:
    python3 scripts/db_sync.py            # مزامنة كل المواد
    python3 scripts/db_sync.py math       # مادة واحدة

مصدر الاتصال: متغير البيئة DATABASE_URL، أو ملف /home/user/.arena-secrets.env
"""
import json
import os
import sys

import psycopg2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT_DIR = os.path.join(ROOT, 'shared', 'content')
CONTENT_FILES = [
    'arabic.json', 'civics.json', 'english.json', 'ict.json',
    'islamic.json', 'math.json', 'science.json', 'social.json', 'technical.json',
]


def database_url():
    url = os.environ.get('DATABASE_URL')
    if url:
        return url
    secrets = '/home/user/.arena-secrets.env'
    if os.path.exists(secrets):
        for line in open(secrets, encoding='utf-8'):
            if line.startswith('DATABASE_URL='):
                return line.split('=', 1)[1].strip().strip("'\"")
    raise SystemExit('❌ لا يوجد DATABASE_URL — ضعه في بيئة التشغيل أو في /home/user/.arena-secrets.env')


def jstr(value):
    """JSON نصياً كما يخزنه Prisma (نص فارغ بدل null)."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False)


def sync_subject(cur, subject):
    cur.execute(
        """
        INSERT INTO "Subject"
          (id, name, "nameEn", code, category, description, "curriculumRef",
           "unitsCount", "lessonsCount", official, syllabus, "gradeWarning", status)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s,%s)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, "nameEn" = EXCLUDED."nameEn",
          code = EXCLUDED.code, category = EXCLUDED.category,
          description = EXCLUDED.description, "curriculumRef" = EXCLUDED."curriculumRef",
          "unitsCount" = EXCLUDED."unitsCount", "lessonsCount" = EXCLUDED."lessonsCount",
          official = EXCLUDED.official, syllabus = EXCLUDED.syllabus,
          "gradeWarning" = EXCLUDED."gradeWarning", status = EXCLUDED.status
        """,
        (
            subject.get('id'), subject.get('name'), subject.get('nameEn'),
            subject.get('code'), subject.get('category'), subject.get('description'),
            subject.get('curriculumRef'),
            subject.get('unitsCount', 0), subject.get('lessonsCount', 0),
            jstr(subject.get('official')), jstr(subject.get('syllabus')),
            subject.get('gradeWarning'), subject.get('status', 'sample'),
        ),
    )


def sync_unit(cur, subject_id, unit):
    cur.execute(
        """
        INSERT INTO "Unit" (id, "subjectId", "unitNumber", title, description)
        VALUES (%s,%s,%s,%s,%s)
        ON CONFLICT (id) DO UPDATE SET
          "subjectId" = EXCLUDED."subjectId", "unitNumber" = EXCLUDED."unitNumber",
          title = EXCLUDED.title, description = EXCLUDED.description
        """,
        (unit.get('id'), subject_id, unit.get('unitNumber', 0),
         unit.get('title', ''), unit.get('description', '')),
    )


def sync_lesson(cur, subject_id, unit_id, lesson):
    cur.execute(
        """
        INSERT INTO "Lesson"
          (id, "subjectId", "unitId", "lessonNumber", title, "durationMinutes",
           summary, "learningObjectives", sections, "keyRules", attachments,
           faq, "examTips", status)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (id) DO UPDATE SET
          "subjectId" = EXCLUDED."subjectId", "unitId" = EXCLUDED."unitId",
          "lessonNumber" = EXCLUDED."lessonNumber", title = EXCLUDED.title,
          "durationMinutes" = EXCLUDED."durationMinutes", summary = EXCLUDED.summary,
          "learningObjectives" = EXCLUDED."learningObjectives",
          sections = EXCLUDED.sections, "keyRules" = EXCLUDED."keyRules",
          attachments = EXCLUDED.attachments, faq = EXCLUDED.faq,
          "examTips" = EXCLUDED."examTips", status = EXCLUDED.status
        """,
        (
            lesson.get('id'), subject_id, unit_id, lesson.get('lessonNumber', 0),
            lesson.get('title', ''), lesson.get('durationMinutes', 30),
            lesson.get('summary', ''),
            jstr(lesson.get('learningObjectives', [])),
            jstr(lesson.get('sections', [])),
            jstr(lesson.get('keyRules', [])),
            jstr(lesson.get('attachments', [])),
            jstr(lesson.get('faq', [])),
            jstr(lesson.get('examTips', [])),
            lesson.get('status', 'sample'),
        ),
    )


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    files = [only + '.json'] if only else CONTENT_FILES

    conn = psycopg2.connect(database_url())
    cur = conn.cursor()
    tot_s = tot_u = tot_l = 0
    for fname in files:
        path = os.path.join(CONTENT_DIR, fname)
        if not os.path.exists(path):
            print(f'⚠️  ملف غير موجود: {fname}')
            continue
        subject = json.load(open(path, encoding='utf-8'))
        sync_subject(cur, subject)
        s_id = subject['id']
        u_n = l_n = 0
        for unit in subject.get('units', []):
            sync_unit(cur, s_id, unit)
            u_n += 1
            for lesson in unit.get('lessons', []):
                sync_lesson(cur, s_id, unit['id'], lesson)
                l_n += 1
        tot_s += 1
        tot_u += u_n
        tot_l += l_n
        print(f'✅ {fname}: مادة ١ · وحدات {u_n} · دروس {l_n}')
    conn.commit()
    print(f'─── الإجمالي: {tot_s} مادة · {tot_u} وحدة · {tot_l} درساً (رفع انتقائي، بلا حذف)')
    conn.close()


if __name__ == '__main__':
    main()
