"use client";

import { useEffect, useRef, useState } from "react";

type Recognition = { start: () => void; stop: () => void; abort: () => void; lang: string; interimResults: boolean; continuous: boolean; onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

function speechCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// The message box at the bottom of Kate's chat: type, or hold the mic and talk (transcribed in the browser).
export function Composer({ onSend, busy, onCamera }: { onSend: (text: string) => void; busy: boolean; onCamera?: () => void }) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => setCanListen(!!speechCtor()), []);

  function toggleMic() {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = speechCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "en-GB";
    r.interimResults = true;
    r.continuous = false;
    let finalText = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      setText((finalText + " " + interim).trim());
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    onSend(t);
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5 border-t border-slate-200 bg-white px-2 py-2">
      {onCamera && (
        <button type="button" onClick={onCamera} title="Send a photo or video to Kate" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
          📷
        </button>
      )}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={listening ? "Listening…" : "Ask Kate anything"}
        maxLength={600}
        className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500"
      />
      <button type="button" onClick={toggleMic} disabled={!canListen} title={canListen ? "Talk to Kate" : "Voice needs Chrome or Edge"} className={`rounded-full p-2 ${listening ? "bg-rose-100 text-rose-700" : "text-slate-500 hover:bg-slate-100"} disabled:opacity-30`}>
        🎤
      </button>
      <button type="submit" disabled={busy || !text.trim()} className="rounded-full bg-[#0091d2] px-3 py-2 text-sm font-medium text-white disabled:opacity-40">
        ↑
      </button>
    </form>
  );
}
