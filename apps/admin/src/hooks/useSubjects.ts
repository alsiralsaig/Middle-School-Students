import { useCallback, useEffect, useState } from 'react';
import { getApiBase } from '../lib/serverUrl';
import type { Subject } from '@shared/curriculumTypes';

/**
 * مواد المنهج من قاعدة البيانات.
 *
 * يحلّ محل `useSimulatedData(SUBJECTS_DATA)` — أي أن اللوحة صارت تقرأ
 * نفس المصدر الذي يقرأ منه الطالب، فلا تعرض شيئاً يخالف ما يراه.
 *
 * يبقى محتفظاً بنسخة مضمّنة كاحتياط: إن تعذّر الوصول إلى الخادم تُعرض
 * البيانات المضمّنة مع تعليمها بوضوح، بدل شاشة فارغة.
 */
export type { Subject };

export function useSubjects(): {
  subjects: Subject[] | null;
  loading: boolean;
  offline: boolean;
  reload: () => void;
} {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/subjects`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { subjects: Subject[] };
      setSubjects(data.subjects);
      setOffline(false);
    } catch {
      setSubjects(null);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { subjects, loading, offline, reload: () => void load() };
}
