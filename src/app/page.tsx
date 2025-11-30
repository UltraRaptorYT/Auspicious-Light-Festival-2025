"use client";

import { useEffect, useState } from "react";
import { messages } from "@/translate";
import { type Lang, type UserRow } from "@/types";
import { Button } from "@/components/ui/button";
import supabase from "@/lib/supabase";
import { usePersistentId } from "@/lib/hooks/usePersistentId";
import { useLocalStorageState } from "@/lib/hooks/useLocalStorageState";
import LanguageToggle from "@/components/LanguageToggle";
import GamePage from "@/components/GamePage";

export default function Home() {
  const [lang, setLang] = useLocalStorageState<Lang>("lang", "en");
  const [name, setName] = useState("");
  const [user, setUser] = useState<UserRow | null>(null);
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userId = usePersistentId("auspicious_light_25_user_id");

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const checkExistingUser = async () => {
      setIsCheckingUser(true);

      const { data, error } = await supabase
        .from("auspicious_light_25_users")
        .select("id, name")
        .eq("id", userId);

      if (cancelled) return;

      if (error) {
        console.error(error);
        setIsCheckingUser(false);
        return;
      }

      if (data && data.length > 0) {
        const existing = data[0] as UserRow;
        setUser(existing);
        setName(existing.name);
      }

      setIsCheckingUser(false);
    };

    checkExistingUser();

    return () => {
      cancelled = true;
    };
  }, [userId, setLang]);

  const handleNameSubmit = async (formData: UserRow) => {
    if (isSubmitting) return; // 🚫 prevent double-click

    setIsSubmitting(true);

    const { data, error } = await supabase
      .from("auspicious_light_25_users")
      .insert(formData)
      .select("id, name");

    if (error) {
      console.error(error);
      setIsSubmitting(false);
      return;
    }

    if (data && data.length > 0) {
      const created = data[0] as UserRow;
      setUser(created);
      setName(created.name);
    }

    setIsSubmitting(false);
  };

  // Toggle language — UI/local-storage only, no DB writes
  const toggleLang = () => {
    const nextLang: Lang = lang === "en" ? "zh" : "en";
    setLang(nextLang);
  };

  // While UUID + initial check is happening
  if (!userId || isCheckingUser) {
    return null; // or a spinner
  }

  const t = messages[lang];
  const fontClass = lang === "en" ? "font-en" : "font-zh";

  if (user) {
    return (
      <main className="min-h-screen flex items-stretch justify-center bg-zinc-100">
        <LanguageToggle label={t.langButton} onToggle={toggleLang} />
        <GamePage message={t} user={user} lang={lang} fontClass={fontClass} />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-100">
      <LanguageToggle label={t.langButton} onToggle={toggleLang} />

      <div
        className={`w-full max-w-md rounded-2xl bg-white shadow p-6 space-y-6 ${fontClass}`}
      >
        <h1 className="text-2xl font-semibold tracking-tight text-center">
          {t.eventName}
        </h1>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">{t.title}</h2>
          <p className="text-sm text-zinc-600">{t.description}</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!userId) return;

            const formData: UserRow = { id: userId, name };
            handleNameSubmit(formData);
          }}
        >
          <label className="block text-sm font-medium mb-1">
            {t.nameLabel}
          </label>
          <input
            type="text"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/80"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Button
            type="submit"
            disabled={isSubmitting}
            className={`mt-2 inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition ${
              isSubmitting ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting
              ? lang === "en"
                ? "Submitting..."
                : "提交中…"
              : t.submit}
          </Button>
        </form>
      </div>
    </main>
  );
}
