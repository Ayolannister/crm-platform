    import { describe, it, expect } from 'vitest';
    import { hashPassword, verifyPassword } from './password.js';

    describe('password hashing', () => {
      it('accepts the correct password', async () => {
        const hash = await hashPassword('correct-horse-battery');
        expect(await verifyPassword('correct-horse-battery', hash)).toBe(true);
      });

      it('rejects a wrong password', async () => {
        const hash = await hashPassword('correct-horse-battery');
        expect(await verifyPassword('wrong-password-here', hash)).toBe(false);
      });

      it('salts every hash differently', async () => {
        const a = await hashPassword('same-password-twice');
        const b = await hashPassword('same-password-twice');
        expect(a).not.toBe(b);
      });
    });