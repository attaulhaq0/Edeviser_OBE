export const assertCumulativeCoverage = (attestation, expectedSlugs) => {
  const expected = [...expectedSlugs].sort();
  const declared = [...(attestation.governedFunctions ?? [])].sort();
  const records = (attestation.records ?? [])
    .map((record) => record.functionSlug)
    .sort();
  if (JSON.stringify(expected) !== JSON.stringify(declared)) {
    throw new Error(
      `attestation declared coverage is incomplete (expected ${expected.join(
        ", "
      )}; actual ${declared.join(", ")})`
    );
  }
  if (JSON.stringify(expected) !== JSON.stringify(records)) {
    throw new Error(
      `attestation coverage is incomplete (expected ${expected.join(
        ", "
      )}; actual ${records.join(", ")})`
    );
  }
};
