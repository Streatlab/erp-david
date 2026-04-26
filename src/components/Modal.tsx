import { useEffect } from 'react';

export default function Modal({
  open, onClose, title, children, footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl border border-[var(--arena,#EFE6D8)] shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--arena,#EFE6D8)]">
          <h3 className="text-lg font-bold text-[var(--marino,#16355C)]">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-[var(--arena,#EFE6D8)] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function FormRow({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase text-gray-500 tracking-wide mb-1">
        {label}{required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 rounded-lg border border-[var(--arena,#EFE6D8)] bg-white text-sm text-[var(--marino,#16355C)] focus:outline-none focus:border-[var(--fuego,#F26B1F)] ${props.className ?? ''}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 rounded-lg border border-[var(--arena,#EFE6D8)] bg-white text-sm text-[var(--marino,#16355C)] focus:outline-none focus:border-[var(--fuego,#F26B1F)] ${props.className ?? ''}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 rounded-lg border border-[var(--arena,#EFE6D8)] bg-white text-sm text-[var(--marino,#16355C)] focus:outline-none focus:border-[var(--fuego,#F26B1F)] ${props.className ?? ''}`}
    />
  );
}

export function BtnPrimary({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`px-4 py-2 rounded-lg bg-[var(--fuego,#F26B1F)] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 ${rest.className ?? ''}`}
    >{children}</button>
  );
}

export function BtnGhost({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 ${rest.className ?? ''}`}
    >{children}</button>
  );
}
