import { encrypt, decrypt } from './whatsapp/encryption';

/**
 * Server-only cryptographic utilities for encrypting and decrypting sensitive credentials.
 * Reuses the robust, GCM-authenticated implementation from `@/lib/whatsapp/encryption`
 * to maintain backward compatibility and unit-test alignment.
 */
export { encrypt, decrypt };
