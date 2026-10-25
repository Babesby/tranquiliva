import { get, ref, set, update } from "firebase/database";
import { database } from "@/lib/firebase";

const DEVICE_ONLY_KEYS = new Set([
  "tranquiliva-canvas-device-key",
  "tranquiliva-assessment-last-shown",
]);

function localData() {
  if (typeof window === "undefined") return {};
  const values: Record<string, string> = {};
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith("tranquiliva-") || DEVICE_ONLY_KEYS.has(key)) continue;
    const value = window.localStorage.getItem(key);
    if (value !== null) values[key] = value;
  }
  return values;
}

export async function restoreUserData(uid: string) {
  if (!database || typeof window === "undefined") return;
  const snapshot = await get(ref(database, `userData/${uid}/values`));
  if (!snapshot.exists()) return;
  const values = snapshot.val() as Record<string, string>;
  Object.entries(values).forEach(([key, value]) => {
    if (key.startsWith("tranquiliva-") && !DEVICE_ONLY_KEYS.has(key) && typeof value === "string") {
      window.localStorage.setItem(key, value);
    }
  });
}

export async function backupUserData(uid: string) {
  if (!database || typeof window === "undefined") return;
  await set(ref(database, `userData/${uid}`), {
    values: localData(),
    updatedAt: new Date().toISOString(),
  });
}

export async function readAccountRole(uid: string) {
  if (!database) return "member" as const;
  const snapshot = await get(ref(database, `users/${uid}/role`));
  return snapshot.val() === "therapist" ? ("therapist" as const) : ("member" as const);
}

export async function saveAccountProfile(
  uid: string,
  profile: { name: string; goals: string[] },
) {
  if (!database) return;
  await update(ref(database, `users/${uid}/profile`), {
    ...profile,
    updatedAt: new Date().toISOString(),
  });
}
