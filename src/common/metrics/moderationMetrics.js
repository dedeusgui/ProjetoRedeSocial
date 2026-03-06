function toRoundedPercentage(value) {
  return Number(Number(value).toFixed(2));
}

function toFiniteNumber(value, fallback = 0) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return numberValue;
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
  const approved = Number(approvedCount) || 0;
  const notRelevant = Number(notRelevantCount) || 0;
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
    approvalPercentage: toRoundedPercentage((approved / totalReviews) * 100),
    notRelevantPercentage: toRoundedPercentage((notRelevant / totalReviews) * 100),
  };
}

export function computeUnifiedAuthorScore(approvedCount, notRelevantCount) {
  const approved = Number(approvedCount) || 0;
  const notRelevant = Number(notRelevantCount) || 0;
  const totalReviews = approved + notRelevant;

  if (totalReviews === 0) {
    return 0;
  }

  return toRoundedPercentage(((approved - notRelevant) / totalReviews) * 100);
}

export function resolveUnifiedScoreFromPrivateMetrics(privateMetrics = null) {
  const storedScore = toFiniteNumber(privateMetrics?.score, Number.NaN);
  if (Number.isFinite(storedScore)) {
    return toRoundedPercentage(Math.max(-100, Math.min(100, storedScore)));
  }

  const legacyApprovalRate = toFiniteNumber(privateMetrics?.approvalRate, 0);
  const legacyRejectionRate = toFiniteNumber(privateMetrics?.rejectionRate, 0);
  return toRoundedPercentage(
    Math.max(-100, Math.min(100, legacyApprovalRate - legacyRejectionRate)),
  );
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
