"use client";

import { useEffect, useRef, useState } from "react";
// vite/webpack will only run this on the client because this is a client component.
// Types are provided by the package; at runtime this is just normal JS.
import { createModel } from "vosk-browser";

// const MODEL_URL =
//   "https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-cn-0.3.tar.gz";

const MODEL_URL = "./vosk-model-small-cn-0.3.tar.gz";

type Status = "loading-model" | "ready" | "listening" | "error";

export default function VoskRealtimePage() {
  const [status, setStatus] = useState<Status>("loading-model");
  const [partial, setPartial] = useState("");
  const [finalText, setFinalText] = useState("");

  const modelRef = useRef<any>(null);
  const recognizerRef = useRef<any>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ---- load Vosk model once on mount ----
  useEffect(() => {
    let cancelled = false;

    async function initModel() {
      try {
        setStatus("loading-model");
        console.log("Loading Vosk model…");

        const model = await createModel(MODEL_URL);
        if (cancelled) {
          model.terminate();
          return;
        }

        modelRef.current = model;

        // sample rate we'll request from getUserMedia
        const sampleRate = 16000;
        const recognizer = new model.KaldiRecognizer(sampleRate);

        recognizerRef.current = recognizer;

        // Final results (chunks of finished text)
        recognizer.on("result", (message: any) => {
          const text = message?.result?.text ?? "";
          if (!text) return;

          setFinalText((prev) => (prev ? prev + " " + text : text));
          setPartial(""); // clear partial line when a final result arrives
        });

        // Live / partial text while you are speaking
        recognizer.on("partialresult", (message: any) => {
          const text = message?.result?.partial ?? "";
          setPartial(text);
        });

        setStatus("ready");
        console.log("Vosk ready.");
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    }

    initModel();

    // cleanup when page unmounts
    return () => {
      cancelled = true;

      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (modelRef.current) {
        modelRef.current.terminate();
      }
    };
  }, []);

  // ---- start mic & stream audio into Vosk ----
  const startListening = async () => {
    if (status !== "ready" || !recognizerRef.current) return;

    try {
      const sampleRate = 16000;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate,
        },
      });

      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx({ sampleRate });

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        try {
          // vosk-browser can take an AudioBuffer directly
          // (acceptWaveformFloat is also available if you prefer float32 arrays)
          recognizerRef.current.acceptWaveform(event.inputBuffer);
        } catch (error) {
          console.error("acceptWaveform failed:", error);
        }
      };

      source.connect(processor);
      // Optional: you can skip connecting to destination to avoid echo,
      // but some browsers behave better if the node is in the graph.
      processor.connect(audioContext.destination);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      processorRef.current = processor;

      setFinalText("");
      setPartial("");
      setStatus("listening");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  // ---- stop mic ----
  const stopListening = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (status === "listening") {
      setStatus("ready");
    }
  };

  const disabledStart =
    status === "loading-model" || status === "listening" || status === "error";
  const disabledStop = status !== "listening";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Vosk Browser – Live STT Demo</h1>

      <p className="text-sm text-gray-500">
        Status:{" "}
        <span className="font-mono">
          {status === "loading-model" && "Loading model…"}
          {status === "ready" && "Ready"}
          {status === "listening" && "Listening"}
          {status === "error" && "Error (check console)"}
        </span>
      </p>

      <div className="flex gap-3">
        <button
          onClick={startListening}
          disabled={disabledStart}
          className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
        >
          🎙 Start
        </button>
        <button
          onClick={stopListening}
          disabled={disabledStop}
          className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
        >
          ⏹ Stop
        </button>
      </div>

      <section className="mt-4 space-y-2">
        <h2 className="text-sm font-medium text-gray-600">Live (partial):</h2>
        <div className="min-h-[3rem] rounded-md border bg-gray-50 p-2 font-mono text-sm">
          {partial || (
            <span className="text-gray-400">Speak into the mic…</span>
          )}
        </div>
      </section>

      <section className="mt-4 space-y-2">
        <h2 className="text-sm font-medium text-gray-600">Final transcript:</h2>
        <textarea
          className="h-40 w-full resize-none rounded-md border bg-gray-50 p-2 font-mono text-sm"
          value={finalText}
          readOnly
        />
      </section>
    </main>
  );
}
