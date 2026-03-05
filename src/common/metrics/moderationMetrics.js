function toRoundedPercentage(value) {
  return Number(Number(value).toFixed(2));
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

export function buildPrivateMetricsFromAuthorSummary(summary = null) {
  const postCount = Number(summary?.postCount) || 0;

  if (postCount === 0) {
    return {
      approvalRate: 0,
      rejectionRate: 0,
      approvedCount: 0,
      notRelevantCount: 0,
      totalReviews: 0,
    };
  }

  return {
    approvalRate: toRoundedPercentage(summary.avgApprovalPercentage ?? 0),
    rejectionRate: toRoundedPercentage(summary.avgNotRelevantPercentage ?? 0),
    approvedCount: Number(summary.approvedCount) || 0,
    notRelevantCount: Number(summary.notRelevantCount) || 0,
    totalReviews: Number(summary.totalReviews) || 0,
  };
}
