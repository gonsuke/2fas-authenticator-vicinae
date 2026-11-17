import { showToast, Toast } from "@vicinae/api";
import { isVaultCached } from "./vault";
import {
  KeychainToolMissing,
  KeychainServiceUnavailable,
  VaultKeyNotFound,
  VaultKeyCorrupted,
} from "./keychain";

export async function withVaultUnlock<T>(cb: () => T): Promise<T> {
  const needsUnlock = !isVaultCached();
  let toast: Toast | null = null;
  if (needsUnlock) {
    toast = await showToast({
      style: Toast.Style.Animated,
      title: "Unlocking vault…",
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  try {
    return cb();
  } finally {
    toast?.hide();
  }
}

export async function reportVaultLoadError(error: unknown): Promise<void> {
  if (error instanceof KeychainToolMissing) {
    await showToast({
      style: Toast.Style.Failure,
      title: "secret-tool not found",
      message: "Install the libsecret tools for your distribution",
    });
  } else if (error instanceof KeychainServiceUnavailable) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Secret Service available",
      message: "Start a keyring daemon (gnome-keyring, KWallet or KeePassXC)",
    });
  } else if (error instanceof VaultKeyNotFound) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Vault key missing",
      message: "Unlock your keyring, then re-import the vault if it stays missing",
    });
  } else if (error instanceof VaultKeyCorrupted) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Vault key corrupted",
      message: "Delete the vault from Setup and re-import your export",
    });
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to load vault",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}
