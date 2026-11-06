import { describe, it, expect } from 'vitest';
import { createPool } from './db.module.js';

describe('createPool', () => {
  it('survives a dropped idle connection instead of crashing the process', async () => {
    const pool = createPool('postgres://user:pass@localhost:5432/unused');
    expect(pool.listenerCount('error')).toBe(1);
    expect(() =>
      pool.emit('error', new Error('terminating connection due to administrator command')),
    ).not.toThrow();
    await pool.end();
  });
});
