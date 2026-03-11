const LICENSE_PREFIX = "neat-git-";
const LICENSE_INFIX = ".";
const ED25519_ALGORITHM = {
  name: "Ed25519",
};
// Ed25519 public key for offline license verification. The matching private key lives in the server
const PUBLIC_KEY_JWK: JsonWebKey = {
  key_ops: ["verify"],
  ext: true,
  crv: "Ed25519",
  x: "7zlenC38DyRQ-J5iuPla5UbNB6F81Iz8za1IjCDhtiI",
  kty: "OKP",
};
const CLAIM_API_URL = "https://neat-git.neat-git.workers.dev/api/claim";

const decodeBase64Url = (str: string): Uint8Array<ArrayBuffer> => {
  let padded = str.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4 !== 0) {
    padded += "=";
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

let cachedPublicKey: CryptoKey | null = null;

const getPublicKey = async (): Promise<CryptoKey> => {
  if (cachedPublicKey) {
    return cachedPublicKey;
  }
  cachedPublicKey = await crypto.subtle.importKey("jwk", PUBLIC_KEY_JWK, ED25519_ALGORITHM, false, [
    "verify",
  ]);
  return cachedPublicKey;
};

// Expected format: neat-git-<base64url(transactionId)>.<base64url(signature)>
// The transactionId bytes are what was signed on the server
export const verifyLicense = async (licenseKey: string): Promise<boolean> => {
  try {
    if (!licenseKey.startsWith(LICENSE_PREFIX)) {
      return false;
    }

    const withoutPrefix = licenseKey.slice(LICENSE_PREFIX.length);
    const infixIndex = withoutPrefix.indexOf(LICENSE_INFIX);
    if (infixIndex === -1) {
      return false;
    }

    const transactionIdBytes = decodeBase64Url(withoutPrefix.slice(0, infixIndex));
    const signature = decodeBase64Url(withoutPrefix.slice(infixIndex + 1));
    const publicKey = await getPublicKey();

    return await crypto.subtle.verify(ED25519_ALGORITHM, publicKey, signature, transactionIdBytes);
  } catch {
    return false;
  }
};

export const claimLicense = async (
  transactionId: string
): Promise<{ success: true; licenseKey: string } | { success: false; error: string }> => {
  try {
    const response = await fetch(CLAIM_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction_id: transactionId }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message =
        (body as { error?: string } | null)?.error ?? "Something went wrong. Please try again.";
      return { success: false, error: message };
    }

    const data = (await response.json()) as { license_key: string };
    return { success: true, licenseKey: data.license_key };
  } catch {
    return { success: false, error: "Network error. Please check your connection and try again." };
  }
};
