import { publicApi } from './api';

export const FEEDBACK_CATEGORIES = ['Food Quality', 'Service', 'Ambiance', 'Overall'];

const FEEDBACK_STORAGE_KEY = 'restaurant.feedbacks.v1';
const FEEDBACK_SUBMITTED_KEY = 'restaurant.feedbacks.submitted.v1';
const FEEDBACK_EVENT_NAME = 'restaurant:feedback-updated';

const clampRating = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(5, Math.max(1, Math.round(parsed)));
};

const ensureDateIso = (value) => {
  const parsed = new Date(value || Date.now());
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
};

const getFeedbackEndpoint = () => {
  const baseURL = String(publicApi.defaults.baseURL || '');
  return /\/api\/?$/.test(baseURL) ? '/feedbacks' : '/api/feedbacks';
};

const toId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};

const dispatchFeedbackEvent = (type, feedback) => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(FEEDBACK_EVENT_NAME, {
      detail: {
        type,
        feedback,
      },
    })
  );
};

const readJsonStorage = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJsonStorage = (key, value) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota and serialization errors.
  }
};

const parseStatus = (value, reviewed) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'reviewed') return 'reviewed';
  if (normalized === 'new') return 'new';
  return reviewed ? 'reviewed' : 'new';
};

const getTableNumber = (value) => {
  if (value && typeof value === 'object' && value.number !== undefined && value.number !== null) {
    return String(value.number);
  }
  return String(value || '-');
};

export const normalizeFeedbackEntry = (entry) => {
  const rating = clampRating(entry?.rating);
  const category = FEEDBACK_CATEGORIES.includes(entry?.category)
    ? entry.category
    : 'Overall';

  const normalized = {
    _id: toId(entry?._id || entry?.id || `local-${Date.now()}-${Math.round(Math.random() * 1e6)}`),
    tableId: toId(entry?.table?._id || entry?.tableId || entry?.table),
    tableNumber: getTableNumber(entry?.table || entry?.tableNumber || entry?.tableId),
    orderId: toId(entry?.order?._id || entry?.orderId || entry?.order),
    rating,
    category,
    comment: String(entry?.comment || '').slice(0, 500),
    createdAt: ensureDateIso(entry?.createdAt),
    status: parseStatus(entry?.status, entry?.reviewed),
    reviewedAt: entry?.reviewedAt ? ensureDateIso(entry.reviewedAt) : null,
    source: entry?.source || 'api',
    isSynced: entry?.isSynced !== false,
  };

  return normalized;
};

const upsertByOrderId = (feedbacks, nextFeedback) => {
  const indexByOrder = feedbacks.findIndex(
    (entry) => entry.orderId && nextFeedback.orderId && entry.orderId === nextFeedback.orderId
  );

  if (indexByOrder >= 0) {
    const next = [...feedbacks];
    next[indexByOrder] = nextFeedback;
    return next;
  }

  const indexById = feedbacks.findIndex((entry) => entry._id === nextFeedback._id);
  if (indexById >= 0) {
    const next = [...feedbacks];
    next[indexById] = nextFeedback;
    return next;
  }

  return [nextFeedback, ...feedbacks];
};

const sortByNewest = (feedbacks) => {
  return [...feedbacks].sort((left, right) => {
    const leftTs = new Date(left?.createdAt || 0).getTime();
    const rightTs = new Date(right?.createdAt || 0).getTime();
    const safeLeftTs = Number.isNaN(leftTs) ? 0 : leftTs;
    const safeRightTs = Number.isNaN(rightTs) ? 0 : rightTs;
    return safeRightTs - safeLeftTs;
  });
};

export const getStoredFeedbacks = () => {
  const stored = readJsonStorage(FEEDBACK_STORAGE_KEY, []);
  if (!Array.isArray(stored)) return [];

  return sortByNewest(stored.map(normalizeFeedbackEntry));
};

const setStoredFeedbacks = (feedbacks) => {
  writeJsonStorage(FEEDBACK_STORAGE_KEY, sortByNewest(feedbacks));
};

export const buildFeedbackPayload = ({ tableId, orderId, rating, category, comment, createdAt }) => {
  return {
    tableId: String(tableId || '').trim(),
    orderId: String(orderId || '').trim(),
    rating: clampRating(rating),
    category: String(category || '').trim(),
    comment: String(comment || '').slice(0, 500),
    createdAt: ensureDateIso(createdAt),
  };
};

export const validateFeedbackInput = (values) => {
  const errors = {};

  if (!clampRating(values?.rating)) {
    errors.rating = 'Please select a star rating.';
  }

  if (!FEEDBACK_CATEGORIES.includes(values?.category)) {
    errors.category = 'Please choose a category.';
  }

  if (String(values?.comment || '').length > 500) {
    errors.comment = 'Comment cannot exceed 500 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const markFeedbackSubmitted = (orderId) => {
  const normalizedOrderId = String(orderId || '').trim();
  if (!normalizedOrderId) return;

  const current = readJsonStorage(FEEDBACK_SUBMITTED_KEY, {});
  current[normalizedOrderId] = true;
  writeJsonStorage(FEEDBACK_SUBMITTED_KEY, current);
};

export const isFeedbackAlreadySubmitted = (orderId) => {
  const normalizedOrderId = String(orderId || '').trim();
  if (!normalizedOrderId) return false;

  const current = readJsonStorage(FEEDBACK_SUBMITTED_KEY, {});
  return Boolean(current?.[normalizedOrderId]);
};

const mergeRemoteAndLocal = (remoteEntries) => {
  const localEntries = getStoredFeedbacks();
  let merged = remoteEntries.map(normalizeFeedbackEntry);

  for (const localEntry of localEntries) {
    if (localEntry.isSynced) continue;

    const hasSyncedEquivalent = merged.some((entry) => {
      if (localEntry.orderId && entry.orderId && localEntry.orderId === entry.orderId) {
        return true;
      }
      return entry._id === localEntry._id;
    });

    if (hasSyncedEquivalent) {
      continue;
    }

    merged = upsertByOrderId(merged, localEntry);
  }

  merged = sortByNewest(merged);
  setStoredFeedbacks(merged);
  return merged;
};

export const submitFeedback = async (feedbackInput) => {
  const payload = buildFeedbackPayload(feedbackInput);

  const localCandidate = normalizeFeedbackEntry({
    ...payload,
    _id: `local-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    status: 'new',
    source: 'queued',
    isSynced: false,
  });

  try {
    const response = await publicApi.post(getFeedbackEndpoint(), payload, {
      suppressGlobalErrorToast: true,
    });

    const createdFeedback = normalizeFeedbackEntry(
      response?.data?.feedback || {
        ...payload,
        _id: response?.data?.id,
        status: 'new',
      }
    );

    const nextStored = upsertByOrderId(getStoredFeedbacks(), {
      ...createdFeedback,
      source: 'api',
      isSynced: true,
    });

    setStoredFeedbacks(nextStored);
    markFeedbackSubmitted(payload.orderId);
    dispatchFeedbackEvent('created', createdFeedback);

    return {
      feedback: createdFeedback,
      queued: false,
    };
  } catch (error) {
    const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
    const isNetworkFailure = !error?.response || String(error?.code || '').toLowerCase() === 'err_network';

    if (!isNetworkFailure && isOnline) {
      throw error;
    }

    const nextStored = upsertByOrderId(getStoredFeedbacks(), localCandidate);
    setStoredFeedbacks(nextStored);
    markFeedbackSubmitted(payload.orderId);
    dispatchFeedbackEvent('created', localCandidate);

    return {
      feedback: localCandidate,
      queued: true,
    };
  }
};

export const getFeedbacks = async (params = {}) => {
  try {
    const response = await publicApi.get(getFeedbackEndpoint(), {
      params,
      suppressGlobalErrorToast: true,
    });

    const remoteFeedbacks = Array.isArray(response?.data?.feedbacks)
      ? response.data.feedbacks
      : [];

    return mergeRemoteAndLocal(remoteFeedbacks);
  } catch {
    return getStoredFeedbacks();
  }
};

export const toggleFeedbackReviewed = async (feedbackId, reviewed) => {
  const normalizedFeedbackId = String(feedbackId || '').trim();
  if (!normalizedFeedbackId) {
    throw new Error('Missing feedback id');
  }

  try {
    const response = await publicApi.put(
      `${getFeedbackEndpoint()}/${normalizedFeedbackId}/reviewed`,
      { reviewed: Boolean(reviewed) },
      { suppressGlobalErrorToast: true }
    );

    const updatedFeedback = normalizeFeedbackEntry(
      response?.data?.feedback || { _id: normalizedFeedbackId, status: reviewed ? 'reviewed' : 'new' }
    );

    const nextStored = upsertByOrderId(getStoredFeedbacks(), {
      ...updatedFeedback,
      source: 'api',
      isSynced: true,
    });

    setStoredFeedbacks(nextStored);
    dispatchFeedbackEvent('updated', updatedFeedback);

    return updatedFeedback;
  } catch (error) {
    const feedbacks = getStoredFeedbacks();
    const index = feedbacks.findIndex((entry) => entry._id === normalizedFeedbackId);

    if (index < 0) {
      throw error;
    }

    const fallbackUpdated = {
      ...feedbacks[index],
      status: reviewed ? 'reviewed' : 'new',
      reviewedAt: reviewed ? ensureDateIso(new Date()) : null,
      isSynced: false,
      source: 'queued',
    };

    const next = [...feedbacks];
    next[index] = fallbackUpdated;
    setStoredFeedbacks(next);
    dispatchFeedbackEvent('updated', fallbackUpdated);

    return fallbackUpdated;
  }
};

export const getUnreadFeedbackCount = async () => {
  try {
    const response = await publicApi.get(`${getFeedbackEndpoint()}/unread-count`, {
      suppressGlobalErrorToast: true,
    });

    const unreadCount = Number(response?.data?.unreadCount);
    if (Number.isFinite(unreadCount)) {
      return Math.max(0, unreadCount);
    }
  } catch {
    // Fallback to local cached entries.
  }

  return getStoredFeedbacks().filter((entry) => entry.status !== 'reviewed').length;
};

export const applyFeedbackFilters = (feedbacks, filters) => {
  const fromDate = filters?.fromDate ? new Date(filters.fromDate) : null;
  const toDate = filters?.toDate ? new Date(filters.toDate) : null;
  const minRating = Number(filters?.minRating || 0);

  const normalizedFrom = fromDate && !Number.isNaN(fromDate.getTime())
    ? new Date(fromDate.setHours(0, 0, 0, 0))
    : null;

  const normalizedTo = toDate && !Number.isNaN(toDate.getTime())
    ? new Date(toDate.setHours(23, 59, 59, 999))
    : null;

  return feedbacks.filter((feedback) => {
    const createdAt = new Date(feedback?.createdAt || 0);

    if (normalizedFrom && createdAt < normalizedFrom) return false;
    if (normalizedTo && createdAt > normalizedTo) return false;

    if (filters?.category && filters.category !== 'all' && feedback.category !== filters.category) {
      return false;
    }

    if (Number.isFinite(minRating) && minRating > 0 && Number(feedback.rating || 0) < minRating) {
      return false;
    }

    if (filters?.status && filters.status !== 'all') {
      const expected = filters.status === 'reviewed' ? 'reviewed' : 'new';
      if (feedback.status !== expected) {
        return false;
      }
    }

    return true;
  });
};

export const sortFeedbacks = (feedbacks, sortBy = 'date_desc') => {
  const source = [...feedbacks];

  if (sortBy === 'rating_desc') {
    return source.sort((left, right) => Number(right.rating || 0) - Number(left.rating || 0));
  }

  if (sortBy === 'rating_asc') {
    return source.sort((left, right) => Number(left.rating || 0) - Number(right.rating || 0));
  }

  if (sortBy === 'date_asc') {
    return source.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }

  return source.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
};

export const computeFeedbackSummary = (feedbacks, now = new Date()) => {
  const total = feedbacks.length;
  const reviewed = feedbacks.filter((entry) => entry.status === 'reviewed').length;

  const totalRating = feedbacks.reduce((sum, entry) => sum + Number(entry.rating || 0), 0);
  const averageAllTime = total > 0 ? totalRating / total : 0;

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recent = feedbacks.filter((entry) => new Date(entry.createdAt) >= sevenDaysAgo);
  const recentRating = recent.reduce((sum, entry) => sum + Number(entry.rating || 0), 0);
  const averageLast7Days = recent.length > 0 ? recentRating / recent.length : 0;

  return {
    total,
    reviewed,
    unread: Math.max(0, total - reviewed),
    reviewedPercentage: total > 0 ? (reviewed / total) * 100 : 0,
    averageAllTime,
    averageLast7Days,
  };
};

export const subscribeToFeedbackEvents = (handler) => {
  if (typeof window === 'undefined' || typeof handler !== 'function') {
    return () => {};
  }

  const wrapped = (event) => handler(event?.detail || null);
  window.addEventListener(FEEDBACK_EVENT_NAME, wrapped);

  return () => {
    window.removeEventListener(FEEDBACK_EVENT_NAME, wrapped);
  };
};
