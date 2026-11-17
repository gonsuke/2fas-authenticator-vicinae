import { execFileSync } from "child_process";

/**
 * Linux implementation of the vault key storage, backed by the freedesktop
 * Secret Service API.
 *
 * The Secret Service is the standard D-Bus interface (`org.freedesktop.secrets`)
 * implemented by GNOME Keyring, KWallet (via its compatibility layer) and
 * KeePassXC, among others. The login keyring is typically unlocked at login
 * time by PAM, so no prompt is shown for regular use.
 *
 * We shell out to `secret-tool` (libsecret) instead of using native Node
 * bindings: keytar is deprecated, and a plain CLI dependency keeps the
 * extension bundleable with esbuild. The key never appears in the process
 * argument list; it is passed to stdin and read back from stdout.
 */

const SECRET_TOOL = "secret-tool";

const LABEL = "2FAS Authenticator vault key (Vicinae)";

/**
 * Attribute pairs identifying the vault key item in the Secret Service.
 *
 * The application attribute can be overridden through the environment so test
 * runs write to a separate keyring namespace and cannot clobber a real vault
 * key (tests spawn us with VICINAE_2FAS_KEY_NAMESPACE set).
 */
function keyApplicationAttribute(): string {
  return process.env.VICINAE_2FAS_KEY_NAMESPACE || "vicinae-2fas-authenticator";
}

function keyAttributes(): string[] {
  return ["application", keyApplicationAttribute(), "type", "vault-key"];
}

export class KeychainToolMissing extends Error {
  constructor() {
    super(
      "secret-tool not found. Install the libsecret client tools (libsecret-tools on Debian/Ubuntu, libsecret on Arch/Fedora).",
    );
    this.name = "KeychainToolMissing";
  }
}

export class KeychainServiceUnavailable extends Error {
  constructor(detail?: string) {
    super(
      "No Secret Service provider is running. Start a keyring daemon: gnome-keyring (GNOME), KWallet with the Secret Service layer (KDE) or KeePassXC with Secret Service integration enabled." +
        (detail ? `\n${detail}` : ""),
    );
    this.name = "KeychainServiceUnavailable";
  }
}

export class VaultKeyNotFound extends Error {
  constructor() {
    super(
      "Vault key not found in the keyring. If a keyring unlock prompt appeared and was dismissed, unlock the keyring and try again.",
    );
    this.name = "VaultKeyNotFound";
  }
}

export class VaultKeyCorrupted extends Error {
  constructor() {
    super("Vault key has invalid length. Keyring entry may be corrupted.");
    this.name = "VaultKeyCorrupted";
  }
}

export class KeychainError extends Error {
  constructor(detail?: string) {
    super("Failed to access the system keyring" + (detail ? `: ${detail}` : ""));
    this.name = "KeychainError";
  }
}

interface ExecErrorShape {
  code?: string;
  status?: number | null;
  stderr?: Buffer | string;
  message?: string;
}

/**
 * Run secret-tool and return its stdout.
 *
 * Exit-code semantics of `secret-tool` (libsecret 0.21):
 * - `lookup`: exit 0 with the secret on stdout, or exit 1 with no output when
 *   no item matches the attributes (a normal "not found", not an error).
 * - `store`: exit 0 on success.
 * - `clear`: exit 0 when an item was removed, exit 1 when nothing matched.
 *
 * The child runs under the C locale so error strings are stable regardless of
 * the user's language.
 */
function runSecretTool(
  args: string[],
  options: { input?: string; allowNotFound?: boolean } = {},
): string {
  const { input, allowNotFound } = options;
  try {
    return execFileSync(SECRET_TOOL, args, {
      input,
      encoding: "utf-8",
      env: { ...process.env, LC_ALL: "C", LANG: "C" },
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 4 * 1024 * 1024,
    });
  } catch (error: unknown) {
    const err = error as ExecErrorShape;
    const stderr = err.stderr?.toString() ?? "";

    if (err.code === "ENOENT") {
      throw new KeychainToolMissing();
    }
    if (allowNotFound && err.status === 1 && stderr.trim() === "") {
      return "";
    }
    if (
      stderr.includes("org.freedesktop.secrets was not provided") ||
      stderr.includes("Cannot autostart") ||
      stderr.includes("Cannot connect") ||
      stderr.includes("connection refused") ||
      stderr.includes("No such file or directory")
    ) {
      throw new KeychainServiceUnavailable(stderr.trim());
    }
    if (
      stderr.includes("cancelled") ||
      stderr.includes("canceled") ||
      stderr.includes("dismissed")
    ) {
      throw new KeychainError("keyring unlock was cancelled");
    }
    throw new KeychainError(stderr.trim() || err.message);
  }
}

export function storeVaultKey(key: Buffer): void {
  runSecretTool(
    ["store", "--label", LABEL, ...keyAttributes()],
    { input: key.toString("base64") },
  );
}

export function retrieveVaultKey(): Buffer {
  const stdout = runSecretTool(["lookup", ...keyAttributes()], {
    allowNotFound: true,
  });
  const raw = stdout.toString().trim();

  if (!raw) {
    throw new VaultKeyNotFound();
  }

  const key = Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new VaultKeyCorrupted();
  }

  return key;
}

export function deleteVaultKey(): void {
  try {
    runSecretTool(["clear", ...keyAttributes()], { allowNotFound: true });
  } catch {
    // Key may not exist; deleting a missing item is not an error.
  }
}

export function isVaultKeyStored(): boolean {
  try {
    const stdout = runSecretTool(["lookup", ...keyAttributes()], {
      allowNotFound: true,
    });
    return stdout.toString().trim().length > 0;
  } catch {
    return false;
  }
}

export interface KeychainDiagnostic {
  /** `secret-tool` binary is installed and runnable. */
  toolAvailable: boolean;
  /** A Secret Service provider answers on the session bus. */
  serviceAvailable: boolean;
  /** A vault key is present in the keyring. */
  keyStored: boolean;
  /** Human-readable hint when something is missing. */
  hint?: string;
}

/**
 * Non-destructive diagnostics for the Setup screen. The probe lookup uses an
 * attribute pair that never matches a stored item, so it never triggers an
 * unlock prompt and returns "not found" (empty output) when the service is
 * healthy.
 */
export function diagnoseKeychain(): KeychainDiagnostic {
  try {
    runSecretTool(
      ["lookup", "application", `${keyApplicationAttribute()}-probe`],
      { allowNotFound: true },
    );
    return {
      toolAvailable: true,
      serviceAvailable: true,
      keyStored: isVaultKeyStored(),
    };
  } catch (error: unknown) {
    if (error instanceof KeychainToolMissing) {
      return {
        toolAvailable: false,
        serviceAvailable: false,
        keyStored: false,
        hint: "Install libsecret-tools (Debian/Ubuntu), libsecret (Arch/Fedora) or the equivalent libsecret package for your distribution.",
      };
    }
    if (error instanceof KeychainServiceUnavailable) {
      return {
        toolAvailable: true,
        serviceAvailable: false,
        keyStored: false,
        hint: "Start a keyring daemon: gnome-keyring (GNOME), KWallet (KDE) or KeePassXC with Secret Service integration.",
      };
    }
    return {
      toolAvailable: true,
      serviceAvailable: false,
      keyStored: false,
      hint: error instanceof Error ? error.message : "Unknown keyring error",
    };
  }
}
