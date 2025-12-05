"use client";

import { useEffect, useRef, useState } from "react";
import { createModel } from "vosk-browser";

const MODEL_URL = "/vosk-model-small-cn-0.3.tar.gz";

type Status = "loading-model" | "ready" | "listening" | "error";

export default function VoskRealtimePage() {
  const [status, setStatus] = useState<Status>("loading-model");
  const [partial, setPartial] = useState("");
  const [finalText, setFinalText] = useState("");
  const [deCount, setDeCount] = useState(0);
  const detectedPhrase = "的";
  const sensitive = false;

  const modelRef = useRef<any>(null);
  const recognizerRef = useRef<any>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // serial
  const portRef = useRef<any>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(
    null
  );
  const [serialStatus, setSerialStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");

  const openPort = async (port: any) => {
    console.log("Opening port...");
    await port.open({ baudRate: 9600 });
    const writer = port.writable?.getWriter();
    if (!writer) throw new Error("No writable stream on serial port");

    portRef.current = port;
    writerRef.current = writer;
    setSerialStatus("connected");
    console.log("Serial connected");
  };

  const connectSerial = async () => {
    try {
      if (!("serial" in navigator)) {
        alert("Web Serial API not supported in this browser.");
        return;
      }
      setSerialStatus("connecting");

      console.log("Requesting serial port...");
      const port = await (navigator as any).serial.requestPort();
      console.log("Port chosen:", port.getInfo?.());
      await openPort(port);
    } catch (err: any) {
      console.error("Serial connect error:", err.name, err.message, err);
      setSerialStatus("error");
    }
  };

  useEffect(() => {
    const restoreSerial = async () => {
      try {
        if (!("serial" in navigator)) return;

        const ports = await (navigator as any).serial.getPorts();
        if (ports.length === 0) {
          console.log("No previously authorized serial ports");
          return;
        }

        console.log("Restoring serial from previous permission…");
        setSerialStatus("connecting");
        await openPort(ports[0]);
      } catch (err) {
        console.error("Error restoring serial port:", err);
        setSerialStatus("error");
      }
    };

    restoreSerial();
  }, []);

  // ---- recompute 的 count whenever finalText changes ----
  useEffect(() => {
    if (sensitive) return;
    // split by whitespace into tokens
    const tokens = finalText.trim().split(/\s+/);

    let count = 0;
    let prevIsDe = false;

    for (const token of tokens) {
      if (token === "的") {
        // only count when we *enter* a run of 的
        if (!prevIsDe) {
          count += 5;
        }
        prevIsDe = true;
      } else {
        prevIsDe = false;
      }
    }

    setDeCount(count);
  }, [finalText]);

  // optional: listen for unplug
  useEffect(() => {
    if (!("serial" in navigator)) return;

    const handleDisconnect = () => {
      console.log("Serial device disconnected");
      setSerialStatus("disconnected");
      portRef.current = null;
      writerRef.current = null;
    };

    (navigator as any).serial.addEventListener("disconnect", handleDisconnect);
    return () => {
      (navigator as any).serial.removeEventListener(
        "disconnect",
        handleDisconnect
      );
    };
  }, []);

  // ----- load Vosk model once on mount -----
  useEffect(() => {
    let cancelled = false;

    async function initModel() {
      try {
        setStatus("loading-model");
        console.log("Loading Vosk model…");

        const model = await createModel(MODEL_URL);
        if (cancelled) {
          model.terminate?.();
          return;
        }

        modelRef.current = model;
        const sampleRate = 16000;

        const grammar = sensitive
          ? JSON.stringify([detectedPhrase])
          : undefined;
        const recognizer = new model.KaldiRecognizer(sampleRate, grammar);

        recognizerRef.current = recognizer;

        recognizer.on("result", (message: any) => {
          const text = message?.result?.text ?? "";
          if (!text) return;

          if (text.includes(detectedPhrase) && sensitive) {
            setDeCount((prev) => prev + 1);
          }
          // still keep a transcript if you want to see it
          setFinalText((prev) => (prev ? prev + " " + text : text));

          // clear partial line
          setPartial("");
        });

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
        modelRef.current.terminate?.();
      }

      // close serial
      (async () => {
        try {
          if (writerRef.current) {
            await writerRef.current.close();
          }
          if (portRef.current) {
            await portRef.current.close();
          }
        } catch (e) {
          console.error("Error closing serial:", e);
        }
      })();
    };
  }, []);

  // ----- start mic & stream audio into Vosk -----
  const startListening = async () => {
    if (!recognizerRef.current || streamRef.current) return;

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
      const processor = audioContext.createScriptProcessor(1024, 1, 1);

      processor.onaudioprocess = (event) => {
        try {
          recognizerRef.current.acceptWaveform(event.inputBuffer);
        } catch (error) {
          console.error("acceptWaveform failed:", error);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      processorRef.current = processor;

      setFinalText("");
      setPartial("");
      setStatus("listening");
    } catch (err) {
      console.error("getUserMedia / audio init failed:", err);
      setStatus("error");
    }
  };

  // 🔥 Auto-start mic once model is ready
  useEffect(() => {
    if (status === "ready" && recognizerRef.current && !streamRef.current) {
      startListening();
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- stop mic -----
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

  // helper to send current count to Arduino
  const sendCountToSerial = async (count: number) => {
    if (!writerRef.current) return;
    const encoder = new TextEncoder();
    // Example protocol: just send the number + newline, e.g. "3\n"
    const data = encoder.encode(`${count}\n`);
    try {
      await writerRef.current.write(data);
    } catch (err) {
      console.error("Serial write error:", err);
      setSerialStatus("error");
    }
  };

  // 🔄 whenever deCount changes AND serial is connected, send it
  useEffect(() => {
    if (serialStatus === "connected") {
      sendCountToSerial(deCount);
    }
  }, [deCount, serialStatus]);

  const disabledStart =
    status === "loading-model" || status === "listening" || status === "error";
  const disabledStop = status !== "listening";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Vosk Browser – Live STT Demo</h1>
      <p className="text-sm text-gray-500">
        STT Status:{" "}
        <span className="font-mono">
          {status === "loading-model" && "Loading model…"}
          {status === "ready" && "Ready (mic will auto-start)"}
          {status === "listening" && "Listening"}
          {status === "error" && "Error (check console)"}
        </span>
      </p>

      <p className="text-sm text-gray-500">
        Serial:{" "}
        <span className="font-mono">
          {serialStatus === "disconnected" && "Disconnected"}
          {serialStatus === "connecting" && "Connecting…"}
          {serialStatus === "connected" && "Connected"}
          {serialStatus === "error" && "Error – see console"}
        </span>
      </p>

      <div className="flex gap-3">
        <button
          onClick={connectSerial}
          className="rounded-md border px-4 py-2 text-sm"
        >
          🔌 Connect Arduino
        </button>
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

      <p className="text-sm text-gray-700">
        Count of <span className="font-mono">"的"</span> (runs):{" "}
        <span className="font-bold">{deCount}</span>
      </p>

      <section className="mt-4 space-y-2">
        <h2 className="text-sm font-medium text-gray-600">Live (partial):</h2>
        <div className="min-h-12 rounded-md border bg-gray-50 p-2 font-mono text-sm">
          {partial || (
            <span className="text-gray-400">
              Model loading or waiting for mic…
            </span>
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
