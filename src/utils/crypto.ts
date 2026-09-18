/**
 * Cryptographic utilities for DROPONCE.
 * High-entropy random token generation & zero-knowledge SHA-256 hashing.
 */

// Generate a high-entropy URL-safe base64 string (32 bytes = 256 bits of CSPRNG entropy)
export function generateSecureToken(): string {
  const buffer = new Uint8Array(32);
  window.crypto.getRandomValues(buffer);
  
  // Convert to URL-safe base64 string
  return Array.from(buffer, byte => ('0' + byte.toString(16)).slice(-2)).join('');
}

// Compute SHA-256 hash in hex format
export async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Anonymous session identifier for quota tracking (resets if storage cleared, persistent per browser)
const SESSION_KEY = 'droponce_anon_session_id';

export function getOrCreateSessionId(): string {
  const createSecureSessionId = (): string => {
    const buffer = new Uint8Array(16);
    window.crypto.getRandomValues(buffer);
    return Array.from(
      buffer,
      (byte) => byte.toString(16).padStart(2, '0'),
    ).join('');
  };

  try {
    let sessionId = localStorage.getItem(SESSION_KEY);

    if (!sessionId) {
      sessionId = createSecureSessionId();
      localStorage.setItem(SESSION_KEY, sessionId);
    }

    return sessionId;
  } catch {
    // localStorage may be unavailable, but Web Crypto can still provide
    // a cryptographically secure identifier.
    return createSecureSessionId();
  }
}
