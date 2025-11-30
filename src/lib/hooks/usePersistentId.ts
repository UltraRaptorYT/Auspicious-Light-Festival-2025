"use client";

import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useLocalStorageState } from "./useLocalStorageState";

export function usePersistentId(key: string) {
  const [id, setId] = useLocalStorageState<string | null>(key, null);

  useEffect(() => {
    if (!id) {
      const newId = uuidv4();
      setId(newId);
    }
  }, [id, setId]);

  return id;
}
