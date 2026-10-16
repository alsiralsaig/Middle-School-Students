import { useSyncExternalStore } from 'react';
import { sessionStore, SessionState } from '../utils/sessionStore';

/** يقرأ حالة الجلسة من المخزن الخارج React */
export function useSession(): SessionState {
  return useSyncExternalStore(
    (cb) => sessionStore.subscribe(cb),
    () => sessionStore.getState(),
  );
}
