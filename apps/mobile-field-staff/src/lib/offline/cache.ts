import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "ems_cache_";

/** Last-synced snapshot of a GET response, keyed by request path — read when a live fetch fails due to no connectivity. */
export async function getCached<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function setCached<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
}
