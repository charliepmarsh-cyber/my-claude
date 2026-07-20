export async function cookies() {
  return { get: () => undefined, set: () => {}, delete: () => {} };
}
export async function headers() {
  return new Map<string, string>();
}
