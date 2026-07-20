/** Test stub: every action runs as an authenticated test founder. */
export async function requireUser() {
  return { id: "usr_test", email: "test@example.com", name: "Test Founder", role: "founder", passwordHash: "", createdAt: new Date() };
}
export async function getSessionUser() {
  return requireUser();
}
export function hasAnyUser(): boolean {
  return true;
}
export function hashPassword(p: string): string {
  return `test:${p}`;
}
export function verifyPassword(): boolean {
  return true;
}
export async function createSessionCookie(): Promise<void> {}
export async function destroySession(): Promise<void> {}
export function loginRateLimited(): boolean {
  return false;
}
export function recordLoginAttempt(): void {}
export function clearLoginAttempts(): void {}
