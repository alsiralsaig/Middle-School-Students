import React, { createContext, useContext, useState, useEffect } from 'react';
import { StudentAccount } from '../types';
import { INITIAL_STUDENT_ACCOUNTS } from '../data/platformFeaturesData';

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
  const [accounts, setAccounts] = useState<StudentAccount[]>(() => {
    try {
      const saved = localStorage.getItem('sudanese_platform_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_STUDENT_ACCOUNTS;
  });

  const [activeAccountId, setActiveAccountId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sudanese_platform_active_acc_id');
      if (saved) return saved;
    } catch {
      // fallback
    }
    return INITIAL_STUDENT_ACCOUNTS[0]?.id || 'acc-1';
  });

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sudanese_platform_accounts', JSON.stringify(accounts));
    } catch {
      // ignore
    }
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem('sudanese_platform_active_acc_id', activeAccountId);
    } catch {
      // ignore
    }
  }, [activeAccountId]);

  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0] || INITIAL_STUDENT_ACCOUNTS[0];

  const switchAccount = (id: string) => {
    const target = accounts.find(a => a.id === id);
    if (target) {
      setActiveAccountId(id);
    }
  };

  const createAccount = (data: { name: string; grade: string; state: string; school: string; avatar?: string }) => {
    const newAccount: StudentAccount = {
      id: `acc-${Date.now()}`,
      name: data.name,
      grade: data.grade,
      state: data.state,
      school: data.school,
      avatar: data.avatar || '👨‍🎓',
      completedLessonIds: [],
      bookmarkedLessonIds: [],
      quizScores: {},
      streakDays: 1,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setAccounts(prev => [newAccount, ...prev]);
    setActiveAccountId(newAccount.id);
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
