const STORAGE_KEY = "elevate-presence";

export type PresenceStatus = "active" | "away";

type PresenceStore = Record<string, PresenceStatus>;

function readStore(): PresenceStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: PresenceStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("elevate-presence"));
}

export function getPresence(userId: string): PresenceStatus {
  const store = readStore();
  return store[userId] === "away" ? "away" : "active";
}

export function setPresence(userId: string, status: PresenceStatus) {
  const store = readStore();
  store[userId] = status;
  writeStore(store);
}

export function togglePresence(userId: string): PresenceStatus {
  const next = getPresence(userId) === "active" ? "away" : "active";
  setPresence(userId, next);
  return next;
}

export function presenceLabel(
  role: "candidate" | "company",
  status: PresenceStatus,
) {
  if (role === "candidate") {
    return status === "active" ? "Ready to interview" : "Away";
  }
  return status === "active" ? "Active" : "Paused";
}
