const isValidMediaUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  return trimmed !== '0' && trimmed.toLowerCase() !== 'null' && trimmed.toLowerCase() !== 'undefined';
};

const looksLikeHashtags = (value: string): boolean => {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return false;
  }

  const hashtagTokens = tokens.filter((token) => token.startsWith('#'));
  return hashtagTokens.length > 0 && hashtagTokens.length === tokens.length;
};

const pickFirstValid = (...candidates: unknown[]): string | null => {
  for (const candidate of candidates) {
    if (isValidMediaUrl(candidate)) {
      return candidate.trim();
    }
  }
  return null;
};

export interface TrendThumbnailFields {
  thumbnail_url?: string | null;
  screenshot_url?: string | null;
  post_url?: string | null;
  evidence?: any;
  metadata?: any;
  media?: any;
}

export interface TrendTitleFields {
  trend_name?: string | null;
  title?: string | null;
  description?: string | null;
  post_caption?: string | null;
  evidence?: any;
}

export function getTrendThumbnailUrl<T extends TrendThumbnailFields>(trend: T): string | null {
  const candidates: string[] = [];

  const addCandidate = (value: unknown) => {
    const candidate = pickFirstValid(value);
    if (candidate) {
      candidates.push(candidate);
    }
  };

  addCandidate(trend.thumbnail_url);
  addCandidate(trend.screenshot_url);

  const evidence = trend.evidence || (trend.metadata && trend.metadata.evidence);
  if (evidence) {
    addCandidate(evidence.thumbnail_url);
    addCandidate(evidence.thumbnail);
    addCandidate(evidence.image_url);
    addCandidate(evidence.screenshot_url);
    if (evidence.media) {
      addCandidate(evidence.media.thumbnail);
      addCandidate(evidence.media.thumbnail_url);
      addCandidate(evidence.media.preview_image_url);
      addCandidate(evidence.media.image_url);
    }
    if (evidence.metadata) {
      addCandidate(evidence.metadata.thumbnail_url);
      addCandidate(evidence.metadata.image_url);
    }
  }

  const metadata = trend.metadata;
  if (metadata) {
    addCandidate(metadata.thumbnail_url);
    addCandidate(metadata.thumbnail);
    addCandidate(metadata.image_url);
    addCandidate(metadata.social_image);
    addCandidate(metadata.preview_image_url);
  }

  const media = trend.media;
  if (media) {
    addCandidate(media.thumbnail);
    addCandidate(media.thumbnail_url);
    addCandidate(media.preview_image_url);
    addCandidate(media.image_url);
  }

  if (!candidates.length && isValidMediaUrl(trend.post_url)) {
    const postUrl = trend.post_url.trim();
    if (postUrl.includes('youtube.com') || postUrl.includes('youtu.be')) {
      const match = postUrl.match(/(?:v=|\/embed\/|\/shorts\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        candidates.push(`https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`);
      }
    }
  }

  return candidates.length > 0 ? candidates[0] : null;
}

export function getTrendTitle<T extends TrendTitleFields>(trend: T): string {
  const sanitize = (value: unknown): string | null => {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed || looksLikeHashtags(trimmed)) {
      return null;
    }

    return trimmed;
  };

  const candidates = [
    sanitize(trend.trend_name),
    sanitize(trend.title),
    sanitize(trend.description),
    sanitize(trend.post_caption),
    sanitize(trend.evidence?.title),
  ];

  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }

  return 'New Trend';
}
