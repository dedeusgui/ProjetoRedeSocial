function resolvePublicAuthorId(user) {
  if (!user) {
    return null;
  }

  return user.id ?? (user._id ? String(user._id) : null);
}

export function resolvePublicReputation(privateMetrics = null) {
  const score = Number(privateMetrics?.score ?? 0);

  if (score >= 70) {
    return {
      tier: "high",
      label: "Alta",
    };
  }

  if (score >= 40) {
    return {
      tier: "medium",
      label: "Média",
    };
  }

  return {
    tier: "low",
    label: "Baixa",
  };
}

export function resolveProfileImageUrl(profileImage = null) {
  const url = typeof profileImage?.url === "string" ? profileImage.url.trim() : "";
  return url || null;
}

export function buildPublicAuthorSummary(user = null) {
  return {
    id: resolvePublicAuthorId(user),
    username: user?.username ?? null,
    avatarUrl: resolveProfileImageUrl(user?.profileImage),
    reputation: resolvePublicReputation(user?.privateMetrics),
  };
}
