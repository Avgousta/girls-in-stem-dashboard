/**
 * E2E mutation tests — write/delete flows against the real Supabase instance.
 *
 * Each test creates a record, verifies it, then cleans it up in afterEach so
 * no test data is left behind. Records are marked with '[E2E]' in any text
 * field so they are easy to identify and manually clean up if a test run aborts.
 *
 * Requires E2E_ADMIN_PASSWORD to be set (same as the other E2E specs).
 * Run with: npm run test:e2e -- mutations.spec.ts
 */

import { test, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { loginAsAdmin, ADMIN_PASSWORD } from './helpers';

// IDs created during each test, cleaned up in afterEach
let createdInterventionId: string | null = null;
let createdAssessmentId:   string | null = null;
let targetLearnerId:       string | null = null;
let targetAttendanceIds:   string[]      = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchFirstLearnerId(request: APIRequestContext): Promise<string> {
  const res = await request.get('/api/v1/learners?limit=1');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  // The learners list route uses paginatedResponse: { data: [...], total, page, limit }
  const learners: Array<{ learner_id: string }> = body.data ?? body;
  if (!Array.isArray(learners) || !learners[0]?.learner_id) {
    throw new Error('Could not fetch a learner_id from /api/v1/learners');
  }
  return learners[0].learner_id;
}

// ─── Test suite ───────────────────────────────────────────────────────────────

test.describe('Mutation tests (requires credentials)', () => {
  test.beforeEach(async ({ page, request }, testInfo) => {
    if (!ADMIN_PASSWORD) testInfo.skip();
    await loginAsAdmin(page);
    targetLearnerId       = await fetchFirstLearnerId(request);
    createdInterventionId = null;
    createdAssessmentId   = null;
    targetAttendanceIds   = [];
  });

  test.afterEach(async ({ request }) => {
    if (createdInterventionId) {
      await request.patch(`/api/v1/interventions/${createdInterventionId}`, {
        data: { status: 'resolved', resolution_notes: '[E2E] cleaned up by test runner' },
      }).catch(() => {});
      createdInterventionId = null;
    }

    if (createdAssessmentId) {
      await request.delete(`/api/v1/assessments/${createdAssessmentId}`).catch(() => {});
      createdAssessmentId = null;
    }

    for (const id of targetAttendanceIds) {
      await request.patch(`/api/v1/attendance/${id}`, {
        data: { status: 'present' },
      }).catch(() => {});
    }
    targetAttendanceIds = [];
  });

  // ── 1. Intervention: create → verify → resolve ─────────────────────────────

  test('create intervention, verify it, then resolve it', async ({ request }) => {
    const learnerId = targetLearnerId!;

    const createRes = await request.post('/api/v1/interventions', {
      data: {
        learner_id:        learnerId,
        intervention_type: 'academic',
        priority:          'low',
        reason:            '[E2E] mutation test — safe to delete',
        status:            'open',
      },
    });
    expect(createRes.ok(), `POST /api/v1/interventions failed: ${await createRes.text()}`).toBeTruthy();
    const { data: created } = await createRes.json();
    createdInterventionId = created.intervention_id ?? created.id;
    expect(createdInterventionId).toBeTruthy();

    // Verify via GET
    const getRes = await request.get(`/api/v1/interventions/${createdInterventionId}`);
    expect(getRes.ok()).toBeTruthy();
    const { data: fetched } = await getRes.json();
    expect(fetched.reason).toContain('[E2E]');
    expect(fetched.status).toBe('open');

    // Resolve
    const resolveRes = await request.patch(`/api/v1/interventions/${createdInterventionId}`, {
      data: {
        status:           'resolved',
        resolution_notes: '[E2E] resolved by test runner',
        effectiveness:    3,
      },
    });
    expect(resolveRes.ok(), `PATCH resolve failed: ${await resolveRes.text()}`).toBeTruthy();
    createdInterventionId = null; // resolved — afterEach cleanup not needed
  });

  // ── 2. Assessment: create → verify → delete ────────────────────────────────

  test('create assessment, verify it, then delete it', async ({ request }) => {
    const learnerId = targetLearnerId!;

    const createRes = await request.post('/api/v1/assessments', {
      data: {
        learner_id:      learnerId,
        assessment_type: 'quiz',
        subject:         'Mathematics',
        score:           42,
        max_score:       50,
        grade_band:      'Merit',
        difficulty:      'medium',
        assessment_date: new Date().toISOString().split('T')[0],
        notes:           '[E2E] mutation test — safe to delete',
      },
    });
    expect(createRes.ok(), `POST /api/v1/assessments failed: ${await createRes.text()}`).toBeTruthy();
    const { data: created } = await createRes.json();
    createdAssessmentId = created.assessment_id ?? created.id;
    expect(createdAssessmentId).toBeTruthy();

    // Verify
    const getRes = await request.get(`/api/v1/assessments/${createdAssessmentId}`);
    expect(getRes.ok()).toBeTruthy();
    const { data: fetched } = await getRes.json();
    expect(fetched.score).toBe(42);
    expect(fetched.notes).toContain('[E2E]');

    // Delete
    const deleteRes = await request.delete(`/api/v1/assessments/${createdAssessmentId}`);
    expect(deleteRes.ok(), `DELETE assessment failed: ${await deleteRes.text()}`).toBeTruthy();
    createdAssessmentId = null;

    // Confirm gone
    const confirmRes = await request.get(`/api/v1/assessments/${fetched.assessment_id}`);
    if (confirmRes.status() === 200) {
      const body = await confirmRes.json();
      expect(body.data).toBeNull();
    } else {
      expect(confirmRes.status()).toBe(404);
    }
  });

  // ── 3. Learner profile: PATCH context fields → verify → reset ──────────────

  test('update learner context fields and reset them', async ({ request }) => {
    const learnerId = targetLearnerId!;

    // Capture original value
    const getRes = await request.get(`/api/v1/learners/${learnerId}`);
    expect(getRes.ok()).toBeTruthy();
    const { data: original } = await getRes.json();
    const originalLanguage: string | null = original.learner_profiles?.primary_language ?? null;

    // Patch
    const patchRes = await request.patch(`/api/v1/learners/${learnerId}`, {
      data: {
        primary_language:  '[E2E] Test Language',
        internet_access:   true,
        household_size:    4,
        transport_type:    'taxi',
        first_gen_student: false,
      },
    });
    expect(patchRes.ok(), `PATCH learner context failed: ${await patchRes.text()}`).toBeTruthy();
    const { data: patched } = await patchRes.json();
    expect(patched.learner_profiles?.primary_language).toBe('[E2E] Test Language');
    expect(patched.learner_profiles?.internet_access).toBe(true);
    expect(patched.learner_profiles?.household_size).toBe(4);

    // Reset
    const resetRes = await request.patch(`/api/v1/learners/${learnerId}`, {
      data: { primary_language: originalLanguage },
    });
    expect(resetRes.ok()).toBeTruthy();
  });

  // ── 4. WhatsApp opt-in toggle → verify → reset ────────────────────────────

  test('toggle whatsapp_opted_in on learner profile and reset', async ({ request }) => {
    const learnerId = targetLearnerId!;

    const getRes = await request.get(`/api/v1/learners/${learnerId}`);
    expect(getRes.ok()).toBeTruthy();
    const { data: original } = await getRes.json();
    const originalOptIn: boolean = original.learner_profiles?.whatsapp_opted_in ?? false;

    // Toggle
    const patchRes = await request.patch(`/api/v1/learners/${learnerId}`, {
      data: { whatsapp_opted_in: !originalOptIn },
    });
    expect(patchRes.ok(), `PATCH whatsapp_opted_in failed: ${await patchRes.text()}`).toBeTruthy();
    const { data: patched } = await patchRes.json();
    expect(patched.learner_profiles?.whatsapp_opted_in).toBe(!originalOptIn);

    // Reset
    const resetRes = await request.patch(`/api/v1/learners/${learnerId}`, {
      data: { whatsapp_opted_in: originalOptIn },
    });
    expect(resetRes.ok()).toBeTruthy();
  });

  // ── 5. Attendance bulk save → verify absent record → reset to present ───────

  test('bulk save attendance marks absent then resets to present', async ({ request }) => {
    const learnerId = targetLearnerId!;

    // Get a programme the learner is enrolled in
    const lRes = await request.get(`/api/v1/learners/${learnerId}`);
    expect(lRes.ok()).toBeTruthy();
    const { data: lData } = await lRes.json();
    const enrollments: Array<{ program_id: string }> = lData.program_enrollments ?? [];
    if (!enrollments.length) {
      test.skip(); // learner has no enrollments
      return;
    }
    const programId  = enrollments[0].program_id;
    const sessionDate = new Date().toISOString().split('T')[0];

    // Mark absent
    const bulkRes = await request.post('/api/v1/attendance/bulk', {
      data: {
        program_id:   programId,
        session_date: sessionDate,
        records:      [{ learner_id: learnerId, status: 'absent' }],
      },
    });
    expect(bulkRes.ok(), `POST attendance/bulk failed: ${await bulkRes.text()}`).toBeTruthy();

    // Verify via history
    const histRes = await request.get(
      `/api/v1/attendance/history?learner_id=${learnerId}&program_id=${programId}&date=${sessionDate}`,
    );
    if (histRes.ok()) {
      const histBody = await histRes.json();
      const records: Array<{ session_date: string; status: string; attendance_id: string }> =
        histBody.data ?? histBody;
      if (Array.isArray(records)) {
        const record = records.find(r => r.session_date === sessionDate);
        if (record) {
          expect(record.status).toBe('absent');
          targetAttendanceIds.push(record.attendance_id); // afterEach resets to present
        }
      }
    }
  });

  // ── 6. Peer support pair: create → verify → delete ─────────────────────────

  test('create peer support pair, verify it, then delete it', async ({ request }) => {
    // Fetch two distinct learners
    const res = await request.get('/api/v1/learners?limit=2');
    expect(res.ok()).toBeTruthy();
    const { data: learners }: { data: Array<{ learner_id: string }> } = await res.json();
    if (!learners || learners.length < 2) {
      test.skip();
      return;
    }
    const [tutor, mentee] = learners;

    // Create pair
    const createRes = await request.post('/api/v1/peer-support', {
      data: {
        tutor_id:  tutor.learner_id,
        mentee_id: mentee.learner_id,
        notes:     '[E2E] mutation test pair — safe to delete',
      },
    });

    // 409 = already paired — skip gracefully
    if (createRes.status() === 409) {
      test.skip();
      return;
    }
    expect(createRes.ok(), `POST peer-support failed: ${await createRes.text()}`).toBeTruthy();
    const { data: created } = await createRes.json();
    const pairId: string = created.pair_id ?? created.id;
    expect(pairId).toBeTruthy();
    expect(created.tutor_id).toBe(tutor.learner_id);
    expect(created.mentee_id).toBe(mentee.learner_id);

    // Delete
    const deleteRes = await request.delete(`/api/v1/peer-support/${pairId}`);
    expect(deleteRes.ok(), `DELETE peer-support failed: ${await deleteRes.text()}`).toBeTruthy();
  });
});
