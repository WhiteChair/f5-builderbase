"use client";

import { useEffect, useRef, useState } from "react";

const MAX_SECONDS = 10;

// In-app camera: a short self-recorded video (or a photo) for things like an ID renewal or a claim.
// Nothing leaves the browser; the demo only confirms receipt.
type Recognition = { start: () => void; stop: () => void; lang: string; interimResults: boolean; continuous: boolean; onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

export function CaptureSheet({ title, hint, onDone, onCancel }: { title: string; hint: string; onDone: (kind: "video" | "photo", transcript: string) => void; onCancel: () => void }) {
  const recog = useRef<Recognition | null>(null);
  const transcript = useRef("");
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const [state, setState] = useState<"idle" | "recording" | "preview" | "error">("idle");
  const [seconds, setSeconds] = useState(0);
  const [preview, setPreview] = useState<{ url: string; kind: "video" | "photo" } | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: true })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          video.current.play().catch(() => {});
        }
      })
      .catch(() => setState("error"));
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (state !== "recording") return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [state]);

  useEffect(() => {
    if (state === "recording" && seconds >= MAX_SECONDS) stopVideo();
  }, [seconds, state]);

  function startVideo() {
    if (!stream.current) return;
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream.current);
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => {
      setPreview({ url: URL.createObjectURL(new Blob(chunks, { type: r.mimeType })), kind: "video" });
      setState("preview");
    };
    recorder.current = r;
    r.start();
    setSeconds(0);
    setState("recording");
    // Transcribe in the browser while recording, so Kate can say what she understood.
    transcript.current = "";
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (Ctor) {
      try {
        const sr = new Ctor();
        sr.lang = "en-GB";
        sr.interimResults = false;
        sr.continuous = true;
        sr.onresult = (e) => {
          for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) transcript.current += e.results[i][0].transcript + " ";
        };
        sr.onerror = () => {};
        sr.onend = () => {};
        recog.current = sr;
        sr.start();
      } catch {}
    }
  }

  function stopVideo() {
    recorder.current?.stop();
    try {
      recog.current?.stop();
    } catch {}
  }

  function takePhoto() {
    const v = video.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    c.getContext("2d")?.drawImage(v, 0, 0);
    setPreview({ url: c.toDataURL("image/jpeg", 0.8), kind: "photo" });
    setState("preview");
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <button onClick={onCancel} className="text-sm text-sky-700">Cancel</button>
      </div>
      <p className="px-4 pt-3 text-xs text-slate-600">{hint}</p>
      <div className="mx-4 mt-3 aspect-[4/3] overflow-hidden rounded-xl bg-slate-900">
        {state === "preview" && preview ? (
          preview.kind === "video" ? <video src={preview.url} controls autoPlay className="h-full w-full object-cover" /> : <img src={preview.url} alt="Your photo" className="h-full w-full object-cover" />
        ) : state === "error" ? (
          <div className="flex h-full items-center justify-center p-4 text-center text-xs text-slate-300">Camera not available here. On a phone, this opens the camera.</div>
        ) : (
          <video ref={video} muted playsInline className="h-full w-full object-cover" />
        )}
      </div>
      <div className="mt-auto flex flex-wrap justify-center gap-2 p-4">
        {state === "idle" && (
          <>
            <button onClick={startVideo} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white">● Record ({MAX_SECONDS}s max)</button>
            <button onClick={takePhoto} className="rounded-full border border-slate-300 px-4 py-2 text-sm">Take a photo</button>
          </>
        )}
        {state === "recording" && <button onClick={stopVideo} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">■ Stop ({MAX_SECONDS - seconds}s)</button>}
        {state === "preview" && preview && (
          <>
            <button onClick={() => onDone(preview.kind, transcript.current.trim())} className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white">Send to Kate</button>
            <button onClick={() => { setPreview(null); setState("idle"); }} className="rounded-full border border-slate-300 px-4 py-2 text-sm">Retake</button>
          </>
        )}
        {state === "error" && <button onClick={() => onDone("photo", "")} className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white">Pretend it's sent</button>}
      </div>
    </div>
  );
}
