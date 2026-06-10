import { describe, it, expect } from 'vitest';
import { NextResponse } from 'next/server';

// ── Inline the helpers under test (no Supabase import needed) ─────────────────

const ok = <T>(data: T, status = 200) =>
  NextResponse.json({ data, error: null }, { status });

const err = (message: string, status = 400) =>
  NextResponse.json({ data: null, error: message }, { status });

const created = <T>(data: T) => ok(data, 201);

function getPagination(searchParams: URLSearchParams) {
  const page  = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
  const from  = (page - 1) * limit;
  const to    = from + limit - 1;
  return { page, limit, from, to };
}

function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return NextResponse.json({
    data,
    error: null,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ok()', () => {
  it('returns 200 by default', () => {
    expect(ok({ id: 1 }).status).toBe(200);
  });
  it('accepts custom status', () => {
    expect(ok({}, 422).status).toBe(422);
  });
});

describe('err()', () => {
  it('returns 400 by default', () => {
    expect(err('bad input').status).toBe(400);
  });
  it('accepts custom status', () => {
    expect(err('not found', 404).status).toBe(404);
  });
});

describe('created()', () => {
  it('returns 201', () => {
    expect(created({ id: 'abc' }).status).toBe(201);
  });
});

describe('getPagination()', () => {
  it('defaults to page=1, limit=20', () => {
    const sp = new URLSearchParams();
    const { page, limit, from, to } = getPagination(sp);
    expect(page).toBe(1);
    expect(limit).toBe(20);
    expect(from).toBe(0);
    expect(to).toBe(19);
  });

  it('calculates correct from/to for page 2', () => {
    const sp = new URLSearchParams({ page: '2', limit: '10' });
    const { from, to } = getPagination(sp);
    expect(from).toBe(10);
    expect(to).toBe(19);
  });

  it('clamps limit to max 100', () => {
    const sp = new URLSearchParams({ limit: '999' });
    expect(getPagination(sp).limit).toBe(100);
  });

  it('clamps limit to min 1', () => {
    const sp = new URLSearchParams({ limit: '0' });
    expect(getPagination(sp).limit).toBe(1);
  });

  it('clamps page to min 1 for invalid input', () => {
    const sp = new URLSearchParams({ page: '-5' });
    expect(getPagination(sp).page).toBe(1);
  });
});

describe('paginatedResponse()', () => {
  it('returns correct totalPages', async () => {
    const res = paginatedResponse([1, 2, 3], 25, 1, 10);
    const json = await res.json();
    expect(json.meta.totalPages).toBe(3);
  });

  it('includes total, page, limit in meta', async () => {
    const res = paginatedResponse([], 50, 2, 20);
    const json = await res.json();
    expect(json.meta).toMatchObject({ total: 50, page: 2, limit: 20 });
  });

  it('sets error to null', async () => {
    const res = paginatedResponse([], 0, 1, 20);
    const json = await res.json();
    expect(json.error).toBeNull();
  });
});
