"use client";

import { useRef, useState } from "react";

type Props = {
  label: string;
  onChange: (file: File | null) => void;
};

export default function PhotoInput({ label, onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    onChange(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  }

  function limpar() {
    onChange(null);
    setPreview(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>

      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label} className="w-full max-h-64 object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
          <button
            type="button"
            onClick={limpar}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center gap-1 py-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 transition"
          >
            <span className="text-2xl">📷</span>
            <span className="text-xs font-medium">Câmera</span>
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="flex flex-col items-center gap-1 py-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 transition"
          >
            <span className="text-2xl">🖼️</span>
            <span className="text-xs font-medium">Galeria</span>
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-1 py-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 transition"
          >
            <span className="text-2xl">📁</span>
            <span className="text-xs font-medium">Arquivo</span>
          </button>
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
