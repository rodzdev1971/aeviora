import { useSyncExternalStore } from "react";
import { getLanguage, subscribeLanguage } from "./language.js";

export function useLanguage() {
  return useSyncExternalStore(subscribeLanguage, getLanguage, () => "en");
}
