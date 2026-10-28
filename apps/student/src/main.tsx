import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyTheme, readSavedTheme } from './utils/theme';

applyTheme(readSavedTheme());

createRoot(document.getElementById('root')!).render(<App />);

/**
 * تسجيل Service Worker — في الإنتاج فقط.
 * عطّلناه في التطوير عشان الكاش ما يخبّيش التعديلات وأنت بتجرّب.
 * النتيجة: التطبيق يتثبّت على الهاتف ويفتح بدون إنترنت (مهم لطلاب السودان).
 */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {
      // فشل التسجيل مش يمنع استخدام المنصة
    });
  });
}
