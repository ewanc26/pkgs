import assert from 'node:assert';
import { describe, it } from 'node:test';
import { getAgentToken, getPdsUrlFromAgent } from '../utils/car-fetch.js';

describe('CAR client endpoint extraction', () => {
  it('gets the PDS from a password session wrapped by a lex Client', () => {
    const client = {
      service: 'https://public.api.bsky.app',
      agent: {
        session: {
          service: 'https://pds.example',
          accessJwt: 'password-token',
        },
      },
    };

    assert.strictEqual(getPdsUrlFromAgent(client), 'https://pds.example');
  });

  it('gets the PDS from an OAuth session wrapped by a lex Client', () => {
    const client = {
      service: null,
      agent: {
        serverMetadata: { issuer: 'https://pds.example' },
      },
    };

    assert.strictEqual(getPdsUrlFromAgent(client), 'https://pds.example');
  });

  it('reads a password-session token through the lex Client wrapper', async () => {
    const client = {
      agent: {
        session: { accessJwt: 'password-token' },
      },
    };

    assert.strictEqual(await getAgentToken(client), 'password-token');
  });

  it('preserves direct service support for legacy agents', () => {
    assert.strictEqual(
      getPdsUrlFromAgent({ service: 'https://legacy-pds.example' }),
      'https://legacy-pds.example',
    );
  });
});
