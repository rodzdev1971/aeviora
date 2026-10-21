const eventName = "aeviora:form-library-changed";
const storageKey = "aeviora.form-library-updated";

export function notifyFormLibraryChanged(browser = window) {
  browser.dispatchEvent(new Event(eventName));
  try { browser.localStorage.setItem(storageKey, String(Date.now())); }
  catch { /* Focus refresh still works when browser storage is unavailable. */ }
}

export function subscribeFormLibraryRefresh(refresh, browser = window, page = document) {
  const visible = () => { if (page.visibilityState !== "hidden") refresh(); };
  const storage = (event) => { if (event.key === storageKey) visible(); };
  browser.addEventListener(eventName, visible);
  browser.addEventListener("focus", visible);
  browser.addEventListener("storage", storage);
  page.addEventListener("visibilitychange", visible);
  return () => {
    browser.removeEventListener(eventName, visible);
    browser.removeEventListener("focus", visible);
    browser.removeEventListener("storage", storage);
    page.removeEventListener("visibilitychange", visible);
  };
}
