import { useEffect, useState } from 'react';

/**
 * يحاكي جلب بيانات من الخادم (تأخير بسيط) لإظهار **حالات التحميل** في الواجهة.
 * في المرحلة القادمة يُستبدل بطلب حقيقي إلى قاعدة البيانات.
 */
export function useSimulatedData<T>(data: T, delay = 550) {
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      setValue(data);
      setLoading(false);
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay]);

  return { data: value, loading };
}
