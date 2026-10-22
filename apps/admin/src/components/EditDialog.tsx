import React from 'react';
import { Loader2, X } from 'lucide-react';

export interface EditField { name: string; label: string; multiline?: boolean; required?: boolean; type?: 'text' | 'number'; placeholder?: string }

export const EditDialog: React.FC<{
  title: string; fields: EditField[]; values: Record<string, string>;
  onChange: (name: string, value: string) => void; onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  saving?: boolean; error?: string;
}> = ({ title, fields, values, onChange, onClose, onSubmit, saving = false, error = '' }) => (
  <div className="fixed inset-0 z-[100] bg-slate-950/50 p-4 grid place-items-center" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <form onSubmit={onSubmit} dir="rtl" className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200">
      <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-slate-100"><h2 className="font-black text-navy-800">{title}</h2><button type="button" onClick={onClose} aria-label="إغلاق" className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button></div>
      <div className="p-5 space-y-3">{fields.map((f) => <label key={f.name} className="block"><span className="block text-xs font-bold text-slate-600 mb-1">{f.label}</span>{f.multiline ? <textarea rows={3} required={f.required} value={values[f.name] ?? ''} onChange={(e) => onChange(f.name, e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /> : <input type={f.type ?? 'text'} required={f.required} value={values[f.name] ?? ''} onChange={(e) => onChange(f.name, e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />}</label>)}{error && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">{error}</p>}</div>
      <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">إلغاء</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-800 text-white text-xs font-bold disabled:opacity-60">{saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{saving ? 'جارٍ الحفظ…' : 'حفظ'}</button></div>
    </form>
  </div>
);
