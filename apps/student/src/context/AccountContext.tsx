import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { StudentAccount } from '../types';
import { sessionStore } from '../utils/sessionStore';
import { markDirty, registerSyncSource } from '../utils/syncBus';

/** طوابع زمنية لكل درس تُستخدم في المزامنة (آخر كتابة تنتصر) */
const STAMP_KEY = 'ssp_progress_stamps_v1';

/**
 * مفتاح جديد للحساب المحلي.
 *
 * لماذا مفتاح جديد: النسخ السابقة كانت تحفظ ثلاثة حسابات تجريبية
 * (أحمد/فاطمة/عمر) في `sudanese_platform_accounts`، ومن عنده نسخة قديمة في
 * جواله يظل يراها. المفتاح الجديد يبدأ نظيفاً: حساب واحد لصاحب الجلسة فقط.
 */
const ACCOUNT_KEY = 'ssp_my_account_v2';

/** الحساب الوحيد: تقدّم الطالب المحلي، وبياناته من الخادم */
function blankAccount(): StudentAccount {
  return {
    id: 'me',
    name: '',
    grade: 'الصف الثالث متوسط',
    state: '',
    school: '',
    avatar: '',
    completedLessonIds: [],
    bookmarkedLessonIds: [],
    quizScores: {},
    streakDays: 0,
    createdAt: new Date().toISOString().split('T')[0],
  };
}

function loadAccount(): StudentAccount {
  try {
    const saved = localStorage.getItem(ACCOUNT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as StudentAccount;
      if (parsed && typeof parsed === 'object') return { ...blankAccount(), ...parsed, id: 'me' };
    }
  } catch {
    /* تجاهل */
  }
  return blankAccount();
}

function readStamps(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STAMP_KEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function stampLesson(lessonId: string, at?: string): void {
  try {
    const stamps = readStamps();
    stamps[lessonId] = at ?? new Date().toISOString();
    localStorage.setItem(STAMP_KEY, JSON.stringify(stamps));
  } catch {
    /* تجاهل */
  }
}

interface AccountContextType {
  accounts: StudentAccount[];
  activeAccount: StudentAccount;
  switchAccount: (id: string) => void;
  createAccount: (data: { name: string; grade: string; state: string; school: string; avatar?: string }) => void;
  updateActiveAccount: (updates: Partial<StudentAccount>) => void;
  toggleCompletedLesson: (lessonId: string) => void;
  toggleBookmarkedLesson: (lessonId: string) => void;
  isAccountModalOpen: boolean;
  setIsAccountModalOpen: (open: boolean) => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<StudentAccount[]>(() => [loadAccount()]);
  const [activeAccountId, setActiveAccountId] = useState<string>('me');

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // مرآة حديثة للحالة تُقرأ من خارج React (محرّك المزامنة)
  const stateRef = useRef<{ accounts: StudentAccount[]; activeAccountId: string }>({
    accounts,
    activeAccountId,
  });
  stateRef.current = { accounts, activeAccountId };

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(accounts[0]));
    } catch {
      // ignore
    }
  }, [accounts]);

  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0] || blankAccount();

  /* بيانات صاحب الجلسة من الخادم هي المرجع: اسمه وصورته وصفّه */
  useEffect(() => {
    const sync = () => {
      const user = sessionStore.getState().user;
      if (!user) return;
      setAccounts(prev => {
        const cur = prev[0] ?? blankAccount();
        const next: StudentAccount = {
          ...cur,
          id: 'me',
          name: user.name || cur.name,
          grade: user.grade || cur.grade,
          school: user.school || cur.school,
          avatar: user.avatar || cur.avatar,
        };
        if (
          next.name === cur.name &&
          next.grade === cur.grade &&
          next.school === cur.school &&
          next.avatar === cur.avatar
        ) {
          return prev;
        }
        return [next];
      });
    };
    sync();
    return sessionStore.subscribe(sync);
  }, []);

  /* لا تبديل حسابات في تطبيق الطالب — الحساب حساب صاحب الجلسة فقط */
  const switchAccount = (_id: string) => {};

  /**
   * إنشاء الحساب صار من بوابة الدخول فقط (رمز من الإدارة + هاتف + رقم سري)،
   * فلم يبقَ للحساب المحلي دور — نحدّث بيانات الحساب الواحد بدلاً من إضافة آخر.
   */
  const createAccount = (data: { name: string; grade: string; state: string; school: string; avatar?: string }) => {
    setAccounts(prev => [{ ...(prev[0] ?? blankAccount()), ...data, id: 'me' }]);
    setIsAccountModalOpen(false);
  };

  const updateActiveAccount = (updates: Partial<StudentAccount>) => {
    setAccounts(prev =>
      prev.map(acc => {
        if (acc.id === activeAccountId) {
          return { ...acc, ...updates };
        }
        return acc;
      })
    );
  };

  const toggleCompletedLesson = (lessonId: string) => {
    stampLesson(lessonId);
    markDirty('progress');
    setAccounts(prev =>
      prev.map(acc => {
        if (acc.id === activeAccountId) {
          const exists = acc.completedLessonIds.includes(lessonId);
          const nextCompleted = exists
            ? acc.completedLessonIds.filter(id => id !== lessonId)
            : [...acc.completedLessonIds, lessonId];
          return { ...acc, completedLessonIds: nextCompleted };
        }
        return acc;
      })
    );
  };

  const toggleBookmarkedLesson = (lessonId: string) => {
    stampLesson(lessonId);
    markDirty('progress');
    setAccounts(prev =>
      prev.map(acc => {
        if (acc.id === activeAccountId) {
          const exists = acc.bookmarkedLessonIds.includes(lessonId);
          const nextBookmarks = exists
            ? acc.bookmarkedLessonIds.filter(id => id !== lessonId)
            : [...acc.bookmarkedLessonIds, lessonId];
          return { ...acc, bookmarkedLessonIds: nextBookmarks };
        }
        return acc;
      })
    );
  };

  /* تسجيل تقدّم الطالب كمصدر للمزامنة مع الخادم */
  useEffect(() => {
    return registerSyncSource(
      'progress',
      () => {
        const snap = stateRef.current;
        const acc = snap.accounts.find(a => a.id === snap.activeAccountId) ?? snap.accounts[0];
        if (!acc) return null;
        const stamps = readStamps();
        const ids = Array.from(
          new Set([...(acc.completedLessonIds ?? []), ...(acc.bookmarkedLessonIds ?? [])]),
        );
        return ids.map(lessonId => ({
          lessonId,
          completed: acc.completedLessonIds.includes(lessonId),
          bookmarked: acc.bookmarkedLessonIds.includes(lessonId),
          secondsSpent: 0,
          updatedAt: stamps[lessonId] ?? new Date(0).toISOString(),
        }));
      },
      serverValue => {
        const rows = Array.isArray(serverValue)
          ? (serverValue as Array<{
              lessonId: string;
              completed: boolean;
              bookmarked: boolean;
              updatedAt?: string;
            }>)
          : [];
        if (!rows.length) return;
        const stamps = readStamps();
        setAccounts(prev =>
          prev.map(acc => {
            if (acc.id !== activeAccountId) return acc;
            let completed = [...acc.completedLessonIds];
            let bookmarked = [...acc.bookmarkedLessonIds];
            let changed = false;
            rows.forEach(row => {
              const id = String(row.lessonId ?? '');
              if (!id) return;
              stamps[id] = row.updatedAt ?? new Date().toISOString();
              const wantCompleted = Boolean(row.completed);
              const wantBookmarked = Boolean(row.bookmarked);
              if (wantCompleted && !completed.includes(id)) {
                completed = [...completed, id];
                changed = true;
              }
              if (wantBookmarked && !bookmarked.includes(id)) {
                bookmarked = [...bookmarked, id];
                changed = true;
              }
            });
            try {
              localStorage.setItem(STAMP_KEY, JSON.stringify(stamps));
            } catch {
              /* تجاهل */
            }
            return changed ? { ...acc, completedLessonIds: completed, bookmarkedLessonIds: bookmarked } : acc;
          }),
        );
      },
    );
  }, [activeAccountId]);

  return (
    <AccountContext.Provider
      value={{
        accounts,
        activeAccount,
        switchAccount,
        createAccount,
        updateActiveAccount,
        toggleCompletedLesson,
        toggleBookmarkedLesson,
        isAccountModalOpen,
        setIsAccountModalOpen,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = (): AccountContextType => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};
