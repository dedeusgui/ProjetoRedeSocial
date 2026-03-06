function toFiniteNumber(value, fallback = 0) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return numberValue;
}

function clampPercentage(value) {
  return Math.max(0, Math.min(100, value));
}

// Approval is now a true ratio: approved votes divided by total votes.
// The result is always clamped to the valid percentage range and rounded
// to the nearest integer so the same rule is reused across posts and users.
export function calculateApprovalPercentage(approvedCount, notRelevantCount) {
  const approved = Math.max(0, toFiniteNumber(approvedCount, 0));
  const notRelevant = Math.max(0, toFiniteNumber(notRelevantCount, 0));
  const totalVotes = approved + notRelevant;

  if (totalVotes === 0) {
    return 0;
  }

  return Math.round(clampPercentage((approved / totalVotes) * 100));
}

export function resolveTrend(approvedCount, notRelevantCount) {
  if (approvedCount === notRelevantCount) {
    return "neutral";
  }

  if (approvedCount > notRelevantCount) {
    return "positive";
  }

  return "negative";
}

export function buildPostModerationMetrics(approvedCount, notRelevantCount) {
  const approved = Math.max(0, toFiniteNumber(approvedCount, 0));
  const notRelevant = Math.max(0, toFiniteNumber(notRelevantCount, 0));
  const totalReviews = approved + notRelevant;

  if (totalReviews === 0) {
    return {
      approvedCount: 0,
      notRelevantCount: 0,
      totalReviews: 0,
      approvalPercentage: 0,
      notRelevantPercentage: 0,
    };
  }

  return {
    approvedCount: approved,
    notRelevantCount: notRelevant,
    totalReviews,
    approvalPercentage: calculateApprovalPercentage(approved, notRelevant),
    notRelevantPercentage: calculateApprovalPercentage(notRelevant, approved),
  };
}

export function computeUnifiedAuthorScore(approvedCount, notRelevantCount) {
  return calculateApprovalPercentage(approvedCount, notRelevantCount);
}

export function resolveUnifiedScoreFromPrivateMetrics(privateMetrics = null) {
  const storedScore = toFiniteNumber(privateMetrics?.score, Number.NaN);
  if (Number.isFinite(storedScore)) {
    return Math.round(clampPercentage(storedScore));
  }

  const legacyApprovalRate = toFiniteNumber(privateMetrics?.approvalRate, 0);
  const legacyRejectionRate = toFiniteNumber(privateMetrics?.rejectionRate, 0);
  return calculateApprovalPercentage(legacyApprovalRate, legacyRejectionRate);
}

export function buildPrivateMetricsFromAuthorSummary(summary = null) {
  const postCount = Number(summary?.postCount) || 0;

  if (postCount === 0) {
    return {
      score: 0,
      totalReviews: 0,
    };
  }

  const approvedCount = Number(summary?.approvedCount) || 0;
  const notRelevantCount = Number(summary?.notRelevantCount) || 0;

  return {
    score: computeUnifiedAuthorScore(approvedCount, notRelevantCount),
    totalReviews: Number(summary.totalReviews) || 0,
  };
}
