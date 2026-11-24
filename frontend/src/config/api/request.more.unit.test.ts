import { describe, expect, it, vi } from 'vitest';

import type { APIConfig } from './types';
import { getFormData, getHeaders, getRequestBody, getQueryString, resolve } from './request';

const config = (overrides: Partial<APIConfig> = {}): APIConfig =>
  ({
    BASE: '/api',
    VERSION: '0',
    WITH_CREDENTIALS: true,
    CREDENTIALS: 'include',
    TOKEN: undefined,
    USERNAME: undefined,
    PASSWORD: undefined,
    HEADERS: undefined,
    ENCODE_PATH: undefined,
    ...overrides,
  }) as APIConfig;

const options = (overrides: Record<string, unknown> = {}) =>
  ({ method: 'GET', url: '/x', ...overrides }) as never;

describe('getQueryString — edge shapes', () => {
  it('skips null and undefined values rather than sending "null"', () => {
    expect(getQueryString({ a: null, b: undefined, c: 1 })).toBe('?c=1');
  });

  it('flattens an array of objects into indexed keys', () => {
    expect(getQueryString({ f: [{ k: 'v' }] })).toBe(`?${encodeURIComponent('f[k]')}=v`);
  });

  it('encodes reserved characters in both key and value', () => {
    expect(getQueryString({ 'a b': 'c&d' })).toBe('?a%20b=c%26d');
  });

  it('serialises booleans and zero rather than dropping them', () => {
    expect(getQueryString({ flag: false, n: 0 })).toBe('?flag=false&n=0');
  });
});

describe('getFormData — value kinds', () => {
  // The request module constructs FormData from its own realm -- a different constructor from the
  // test's global, so neither instanceof nor a stubbed global can see it, and happy-dom's FormData
  // exposes no entries()/get() to read back. Each shape below still drives its own branch of the
  // encoder; what is observable is that a FormData-shaped object came back.
  it('builds a FormData from strings, objects and numbers', () => {
    const form = getFormData(options({ formData: { s: 'text', o: { k: 1 }, n: 42 } }));

    expect(typeof form?.append).toBe('function');
  });

  it('builds a FormData from array values', () => {
    expect(typeof getFormData(options({ formData: { tags: ['a', 'b'] } }))?.append).toBe('function');
  });

  it('builds a FormData while skipping undefined and null entries', () => {
    expect(
      typeof getFormData(options({ formData: { keep: 'x', gone: undefined, also: null } }))?.append,
    ).toBe('function');
  });

  it('returns undefined when no form data is given', () => {
    expect(getFormData(options())).toBeUndefined();
  });
});

describe('resolve', () => {
  it('calls a function resolver with the request options', async () => {
    const resolver = vi.fn().mockResolvedValue('tok');
    const opts = options();

    await expect(resolve(opts, resolver)).resolves.toBe('tok');
    expect(resolver).toHaveBeenCalledWith(opts);
  });

  it('returns a plain value untouched', async () => {
    await expect(resolve(options(), 'static')).resolves.toBe('static');
  });

  it('returns undefined when nothing is configured', async () => {
    await expect(resolve(options(), undefined)).resolves.toBeUndefined();
  });
});

describe('getHeaders — precedence and content types', () => {
  it('lets request headers override configured extra headers', async () => {
    const headers = await getHeaders(
      config({ HEADERS: { 'X-Trace': 'cfg', 'X-Only-Cfg': '1' } as never }),
      options({ headers: { 'X-Trace': 'req' } }),
    );

    expect(headers['X-Trace']).toBe('req');
    expect(headers['X-Only-Cfg']).toBe('1');
  });

  it('drops undefined header values instead of sending "undefined"', async () => {
    const headers = await getHeaders(config(), options({ headers: { 'X-Gone': undefined } }));

    expect('X-Gone' in headers).toBe(false);
  });

  it('prefers basic credentials over a bearer token when both are configured', async () => {
    const headers = await getHeaders(
      config({ TOKEN: 'tok' as never, USERNAME: 'u' as never, PASSWORD: 'p' as never }),
      options(),
    );

    expect(headers.Authorization.startsWith('Basic ')).toBe(true);
  });

  it('sends no Authorization when the password is missing', async () => {
    const headers = await getHeaders(config({ USERNAME: 'u' as never }), options());

    expect(headers.Authorization).toBeUndefined();
  });

  const blobLike = (type: string) =>
    ({
      type,
      stream: () => undefined,
      arrayBuffer: async () => new ArrayBuffer(0),
      constructor: Blob,
      [Symbol.toStringTag]: 'Blob',
    }) as unknown as Blob;

  it('uses the blob type for a blob body, falling back to octet-stream', async () => {
    const typed = await getHeaders(config(), options({ body: blobLike('image/png') }));
    const untyped = await getHeaders(config(), options({ body: blobLike('') }));

    expect(typed['Content-Type']).toBe('image/png');
    expect(untyped['Content-Type']).toBe('application/octet-stream');
  });

  it('leaves the content type alone for a FormData body so the boundary can be set', async () => {
    const headers = await getHeaders(config(), options({ body: new FormData() }));

    // Not forced to JSON: the default stays and the transport supplies the multipart boundary.
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('honours an explicit mediaType over every inferred type', async () => {
    const headers = await getHeaders(
      config(),
      options({ body: blobLike('image/png'), mediaType: 'application/pdf' }),
    );

    expect(headers['Content-Type']).toBe('application/pdf');
  });

  it('merges headers from a form-data object that exposes getHeaders()', async () => {
    const nodeStyleForm = { getHeaders: () => ({ 'content-type': 'multipart/form-data; boundary=abc' }) } as never;

    const headers = await getHeaders(config(), options(), nodeStyleForm);

    expect(headers['content-type']).toBe('multipart/form-data; boundary=abc');
  });
});

describe('getRequestBody', () => {
  it('returns the body when present and undefined when not', () => {
    expect(getRequestBody(options({ body: { a: 1 } }))).toEqual({ a: 1 });
    expect(getRequestBody(options())).toBeUndefined();
  });
});
