    import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
    import { promisify } from 'node:util';

    const scrypt = promisify(scryptCallback) as (
      password: string,
      salt: Buffer,
      keylen: number,
      options: { N: number; r: number; p: number },
    ) => Promise<Buffer>;

    const N = 16384;
    const R = 8;
    const P = 5;
    const KEY_LENGTH = 64;

    export async function hashPassword(password: string): Promise<string> {
      const salt = randomBytes(16);
      const hash = await scrypt(password, salt, KEY_LENGTH, { N, r: R, p: P });
      return ['scrypt', N, R, P, salt.toString('hex'), hash.toString('hex')].join('$');
    }

    export async function verifyPassword(password: string, stored: string): Promise<boolean> {
      const [algo, n, r, p, saltHex, hashHex] = stored.split('$');
      if (algo !== 'scrypt' || !saltHex || !hashHex) return false;

      const expected = Buffer.from(hashHex, 'hex');
      const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length, {
        N: Number(n),
        r: Number(r),
        p: Number(p),
      });
      return timingSafeEqual(actual, expected);
    }