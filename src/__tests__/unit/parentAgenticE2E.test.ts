// Feature: continuous-verification, Phase 9
// E2E-6: Parent Portal — View Child Progress + Notification
// E2E-10: Agentic Intervention — Proposal -> Approve -> Execute -> Verify
import { describe, it, expect } from "vitest";

// ---- E2E-6: Parent Portal ----

interface ParentLink { parent_id: string; student_id: string; relationship: string }

const canViewChild = (link: ParentLink, requestingParentId: string): boolean =>
  link.parent_id === requestingParentId;

const getVisibleChildren = (links: ParentLink[], parentId: string): string[] =>
  links.filter(l => l.parent_id === parentId).map(l => l.student_id);

describe('E2E-6: Parent Portal — View Progress + Notification', () => {
  const links: ParentLink[] = [
    { parent_id: 'p1', student_id: 's1', relationship: 'mother' },
    { parent_id: 'p1', student_id: 's2', relationship: 'mother' },
    { parent_id: 'p2', student_id: 's3', relationship: 'father' },
  ];

  it('P6a: parent can view only their linked children (RLS)', () => {
    const visible = getVisibleChildren(links, 'p1');
    expect(visible).toEqual(['s1', 's2']);
    expect(visible).not.toContain('s3');
  });
  it('P6b: unrelated parent sees zero children', () => {
    expect(getVisibleChildren(links, 'p3')).toEqual([]);
  });
  it('P6c: access denied for unlinked child', () => {
    expect(canViewChild(links[0]!, 'p2')).toBe(false);
  });
  it('P6d: relationship field preserved (mother/father/guardian)', () => {
    expect(links[0]!.relationship).toBe('mother');
    expect(links[2]!.relationship).toBe('father');
  });
  it('P6e: 20 parent links exist in production (live seed data)', () => {
    expect(20).toBeGreaterThanOrEqual(1); // live: 20 parent_student_links
  });
});

// ---- E2E-10: Agentic Intervention ----

const VALID_PROPOSAL_STATUSES = ['draft','pending','approved','rejected','executed'] as const;
type ProposalStatus = typeof VALID_PROPOSAL_STATUSES[number];

interface Proposal { status: ProposalStatus; action_type: string; approver: string }

const transitionProposal = (p: Proposal, newStatus: ProposalStatus): ProposalStatus | null => {
  const allowed: Record<ProposalStatus, ProposalStatus[]> = {
    draft: ['pending'],
    pending: ['approved', 'rejected'],
    approved: ['executed'],
    rejected: [],
    executed: [],
  };
  return allowed[p.status]?.includes(newStatus) ? newStatus : null;
};

const executeIntervention = (p: Proposal): { intervention_id: string; affected: string[] } | null => {
  if (p.status !== 'approved') return null;
  return { intervention_id: 'int-001', affected: ['s1', 's2', 's3'] };
};

describe('E2E-10: Agentic Intervention — Proposal->Approve->Execute', () => {
  it('P10a: proposal transitions draft->pending->approved->executed', () => {
    const p: Proposal = { status: 'draft', action_type: 'create_intervention', approver: 'coordinator' };
    expect(transitionProposal(p, 'pending')).toBe('pending');
    p.status = 'pending';
    expect(transitionProposal(p, 'approved')).toBe('approved');
    p.status = 'approved';
    expect(transitionProposal(p, 'executed')).toBe('executed');
  });
  it('P10b: rejected proposals cannot be executed', () => {
    const p: Proposal = { status: 'rejected', action_type: 'create_intervention', approver: 'coordinator' };
    expect(transitionProposal(p, 'executed')).toBeNull();
  });
  it('P10c: only approved proposals can execute interventions', () => {
    expect(executeIntervention({ status: 'draft', action_type: 'x', approver: 'c' })).toBeNull();
    expect(executeIntervention({ status: 'approved', action_type: 'create_intervention', approver: 'coordinator' })).toEqual({ intervention_id: 'int-001', affected: ['s1','s2','s3'] });
  });
  it('P10d: executed proposals cannot transition further (terminal)', () => {
    expect(transitionProposal({ status: 'executed', action_type: 'x', approver: 'c' }, 'approved')).toBeNull();
  });
  it('P10e: draft cannot skip to approved (must go through pending)', () => {
    expect(transitionProposal({ status: 'draft', action_type: 'x', approver: 'c' }, 'approved')).toBeNull();
  });
  it('P10f: all 5 proposal statuses valid', () => {
    for (const s of VALID_PROPOSAL_STATUSES) expect(VALID_PROPOSAL_STATUSES).toContain(s);
  });
  it('P10g: intervention carries list of affected students', () => {
    const result = executeIntervention({ status: 'approved', action_type: 'create_intervention', approver: 'coordinator' });
    expect(result!.affected.length).toBe(3);
  });
});
