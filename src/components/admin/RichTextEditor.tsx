"use client";

import { useEffect, useRef } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function withSelection(action: () => void) {
  action();
}

export function RichTextEditor({ value, onChange, placeholder = "Write product description..." }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = editorRef.current;
    if (!element) return;
    if (element.innerHTML !== value) {
      element.innerHTML = value || "";
    }
  }, [value]);

  const runCommand = (command: string, commandValue?: string) => {
    withSelection(() => {
      document.execCommand(command, false, commandValue);
      onChange(editorRef.current?.innerHTML ?? "");
      editorRef.current?.focus();
    });
  };

  return (
    <div className="rounded-lg border border-slate-300 bg-white">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 p-2">
        <button type="button" onClick={() => runCommand("formatBlock", "h3")} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">
          H3
        </button>
        <button type="button" onClick={() => runCommand("bold")} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">
          Bold
        </button>
        <button type="button" onClick={() => runCommand("italic")} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">
          Italic
        </button>
        <button type="button" onClick={() => runCommand("underline")} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">
          Underline
        </button>
        <button type="button" onClick={() => runCommand("insertUnorderedList")} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">
          Bullets
        </button>
        <button type="button" onClick={() => runCommand("insertOrderedList")} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">
          Numbering
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("Enter URL (https://...)");
            if (!url) return;
            runCommand("createLink", url);
          }}
          className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50"
        >
          Link
        </button>
        <button type="button" onClick={() => runCommand("foreColor", "#1d4ed8")} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">
          Blue
        </button>
        <button type="button" onClick={() => runCommand("removeFormat")} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">
          Clear
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML ?? "")}
        className="min-h-[240px] p-3 text-sm leading-7 text-slate-800 focus:outline-none"
        data-placeholder={placeholder}
      />
      {!value ? <p className="px-3 pb-3 text-xs text-slate-400">{placeholder}</p> : null}
    </div>
  );
}
