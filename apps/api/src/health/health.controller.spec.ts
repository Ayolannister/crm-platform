    import { describe, it, expect } from 'vitest';
    import { HealthController } from './health.controller.js';

    describe('HealthController', () => {
      it('reports ok', () => {
        expect(new HealthController().check().status).toBe('ok');
      });
    });