"use client";

import { useEffect, useState } from "react";
import { messages } from "@/translate";
import { type Lang } from "@/types";
import { Button } from "@/components/ui/button";
import supabase from "@/lib/supabase";
import { usePersistentId } from "@/lib/hooks/usePersistentId";

type UserRow = {
  id: string;
  name: string;
  lang: Lang;
};

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [name, setName] = useState("");
  const [user, setUser] = useState<UserRow | null>(null);
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UUID persisted in localStorage
  const userId = usePersistentId("auspicious_light_25_user_id");

  type NameSubmitType = {
    id: string;
    name: string;
    lang: Lang;
  };

  // 🔍 On first load (or refresh), check if this user ID already exists in Supabase
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const checkExistingUser = async () => {
      setIsCheckingUser(true);

      const { data, error } = await supabase
        .from("auspicious_light_25_users")
        .select("id, name, lang")
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
        setLang(existing.lang);
      }

      setIsCheckingUser(false);
    };

    checkExistingUser();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleNameSubmit = async (formData: NameSubmitType) => {
    if (isSubmitting) return; // 🚫 prevent double-click

    setIsSubmitting(true);

    const { data, error } = await supabase
      .from("auspicious_light_25_users")
      .insert(formData)
      .select("id, name, lang");

    if (error) {
      console.error(error);
      setIsSubmitting(false);
      return;
    }

    if (data && data.length > 0) {
      const created = data[0] as UserRow;
      setUser(created);
      setName(created.name);
      setLang(created.lang);
    }

    setIsSubmitting(false);
  };

  // While UUID + initial check is happening
  if (!userId || isCheckingUser) {
    return null; // or a spinner
  }

  const t = messages[lang];
  const fontClass = lang === "en" ? "font-en" : "font-zh";

  // ✅ If user already exists in Supabase, just show welcome screen
  if (user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-100">
        <div
          className={`w-full max-w-md rounded-2xl bg-white shadow p-6 space-y-6 ${fontClass}`}
        >
          <h1 className="text-2xl font-semibold tracking-tight text-center">
            {t.eventName}
          </h1>

          <div className="mt-6 text-center space-y-2">
            <p className="text-lg font-semibold">
              {lang === "en"
                ? `Welcome, ${user.name}!`
                : `${user.name} 欢迎你！`}
            </p>
            <p className="text-sm text-zinc-600">
              {lang === "en"
                ? "You’re already registered."
                : "你已经登记好了。"}
            </p>
          </div>
        </div>
      </main>
    );
  }

  // 📝 If no record yet, show the form
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-100">
      <div
        className={`w-full max-w-md rounded-2xl bg-white shadow p-6 space-y-6 ${fontClass}`}
      >
        <h1 className="text-2xl font-semibold tracking-tight text-center">
          {t.eventName}
        </h1>

        <div className="flex justify-end">
          <Button
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition"
          >
            {t.langButton}
          </Button>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">{t.title}</h2>
          <p className="text-sm text-zinc-600">{t.description}</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!userId) return;

            const formData: NameSubmitType = { id: userId, name, lang };
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
