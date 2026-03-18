function resolvePreviousPostId(post) {
  const value = post?.sequence?.previousPostId ?? null;
  return value ? String(value) : null;
}

function buildSequenceSummary(post, { hasNext = false, nextPostId = null } = {}) {
  const previousPostId = resolvePreviousPostId(post);
  const resolvedNextPostId = hasNext && nextPostId ? String(nextPostId) : null;

  return {
    isPartOfSequence: Boolean(previousPostId || hasNext),
    previousPostId,
    hasNext: Boolean(hasNext),
    nextPostId: resolvedNextPostId,
  };
}

export { buildSequenceSummary, resolvePreviousPostId };
