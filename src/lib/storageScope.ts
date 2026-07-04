/** Active local progress scope — `null` means guest. */
let currentScope: string | null = null;

export function getStorageScope(): string | null {
  return currentScope;
}

export function setStorageScope(userId: string | null): void {
  currentScope = userId;
}
