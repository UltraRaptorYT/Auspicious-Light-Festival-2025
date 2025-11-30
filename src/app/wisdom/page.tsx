"use client";

import React, { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const TARGET_PHRASE = "om ara pa cha na dhi";

// --- Helpers --------------------------------------------------

// Normalize: lowercase, remove accents, keep letters only
const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    // remove accents
    .replace(/\p{Diacritic}/gu, "")
    // keep letters + spaces
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Levenshtein distance between 2 strings
const levenshtein = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // delete
        dp[i][j - 1] + 1, // insert
        dp[i - 1][j - 1] + cost // substitute
      );
    }
  }
  return dp[m][n];
};

const targetCollapsed = normalize(TARGET_PHRASE).replace(/\s+/g, "");

// Does this chunk contain something close to the mantra?
const chunkContainsMantra = (chunk: string): boolean => {
  const collapsed = normalize(chunk).replace(/\s+/g, "");
  if (!collapsed) return false;

  const len = targetCollapsed.length;
  const maxDistance = 3; // allow up to 3 char errors

  if (collapsed.length < len) {
    return levenshtein(collapsed, targetCollapsed) <= maxDistance;
  }

  for (let i = 0; i <= collapsed.length - len; i++) {
    const window = collapsed.slice(i, i + len);
    const dist = levenshtein(window, targetCollapsed);
    if (dist <= maxDistance) return true;
  }
  return false;
};

export default function HomePage() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Speech recognition is not supported in this browser. Try Chrome."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US"; // you can try other langs if your accent is different
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          finalChunk += " " + text;
        } else {
          interimChunk += " " + text;
        }
      }

      if (finalChunk) {
        // check this chunk for mantra
        if (chunkContainsMantra(finalChunk)) {
          setCount((prev) => prev + 1);
        }

        // append to global transcript
        setTranscript((prev) => (prev + " " + finalChunk).trim());
      }

      setInterim(interimChunk.trim());
    };

    recognition.onerror = (event: any) => {
      setError(event.error || "Unknown speech recognition error");
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) {
      setError("Speech recognition not available.");
      return;
    }
    setError(null);
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (e) {
      console.error(e);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setListening(false);
  };

  const clearTranscript = () => {
    setTranscript("");
    setInterim("");
    setCount(0);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl border rounded-xl p-6 shadow-sm space-y-4">
        <h1 className="text-2xl font-semibold text-center">
          OM ARA PA CHA NA DHI Counter (Free Browser STT)
        </h1>
        <p className="text-sm text-gray-600 text-center">
          Uses the browser&apos;s built-in speech recognition, plus fuzzy
          matching, to detect <strong>“OM ARA PA CHA NA DHI”</strong> even when
          it&apos;s transcribed slightly wrong.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={startListening}
            disabled={listening}
            className={`px-4 py-2 rounded-md text-sm font-medium border ${
              listening
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            Start Listening
          </button>
          <button
            onClick={stopListening}
            disabled={!listening}
            className={`px-4 py-2 rounded-md text-sm font-medium border ${
              listening
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            Stop
          </button>
          <button
            onClick={clearTranscript}
            className="px-4 py-2 rounded-md text-sm font-medium border bg-white hover:bg-gray-50"
          >
            Clear
          </button>
        </div>

        <div className="flex justify-center items-center gap-2">
          <span
            className={`inline-block w-3 h-3 rounded-full ${
              listening ? "bg-green-500 animate-pulse" : "bg-gray-400"
            }`}
          />
          <span className="text-sm text-gray-700">
            {listening ? "Listening…" : "Not listening"}
          </span>
        </div>

        <div className="text-center">
          <div className="text-sm text-gray-500">Detected count</div>
          <div className="text-4xl font-bold mt-1">{count}</div>
        </div>

        {error && (
          <div className="text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded-md">
            Error: {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold mb-1">Transcript (final)</h2>
            <div className="border rounded-md p-3 min-h-[80px] text-sm bg-gray-50 whitespace-pre-wrap">
              {transcript || (
                <span className="text-gray-400">No speech yet…</span>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-1">Interim (live)</h2>
            <div className="border rounded-md p-3 min-h-[50px] text-sm bg-gray-50 whitespace-pre-wrap">
              {interim || (
                <span className="text-gray-400">Listening buffer…</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
