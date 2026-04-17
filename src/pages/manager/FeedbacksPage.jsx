import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import Star from 'lucide-react/dist/esm/icons/star';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Filter from 'lucide-react/dist/esm/icons/filter';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import X from 'lucide-react/dist/esm/icons/x';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import { toast } from 'react-hot-toast';
import ManagerLayout from '../../layouts/ManagerLayout';
import useAuthStore from '../../store/authStore';
import { connectSocket } from '../../services/socket';
import {
  FEEDBACK_CATEGORIES,
  applyFeedbackFilters,
  computeFeedbackSummary,
  getFeedbacks,
  normalizeFeedbackEntry,
  sortFeedbacks,
  subscribeToFeedbackEvents,
  toggleFeedbackReviewed,
} from '../../services/feedbacks';

const DEFAULT_FILTERS = {
  fromDate: '',
  toDate: '',
  category: 'all',
  minRating: '0',
  status: 'all',
};

const upsertFeedback = (feedbacks, nextFeedback) => {
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

const toRestaurantId = (restaurant) => {
  if (!restaurant) return '';
  if (typeof restaurant === 'string') return restaurant;
  if (typeof restaurant === 'object' && restaurant._id) return String(restaurant._id);
  return String(restaurant);
};

const formatDateTime = (value) => {
  const parsed = new Date(value || 0);
  if (Number.isNaN(parsed.getTime())) return '-';

  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const renderRating = (rating) => {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`h-4 w-4 ${value <= Number(rating || 0) ? 'fill-[#c9963a] text-[#c9963a]' : 'text-slate-500/60'}`}
        />
      ))}
    </div>
  );
};

const FeedbacksPage = () => {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState('date_desc');
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  const restaurantId = useMemo(() => toRestaurantId(user?.restaurant), [user?.restaurant]);

  const refreshFeedbacks = useCallback(async ({ showLoader = false } = {}) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const entries = await getFeedbacks();
      setFeedbacks(entries.map(normalizeFeedbackEntry));
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load feedbacks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshFeedbacks({ showLoader: true });

    const pollInterval = window.setInterval(() => {
      refreshFeedbacks({ showLoader: false });
    }, 15000);

    const handleOnline = () => {
      refreshFeedbacks({ showLoader: false });
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.clearInterval(pollInterval);
      window.removeEventListener('online', handleOnline);
    };
  }, [refreshFeedbacks]);

  useEffect(() => {
    const socket = connectSocket();

    if (restaurantId) {
      socket.emit('joinRestaurant', restaurantId);
    }

    const handleRealtimeCreated = (payload) => {
      const incoming = payload?.feedback;
      if (!incoming) return;

      const normalized = normalizeFeedbackEntry(incoming);
      setFeedbacks((previous) => sortFeedbacks(upsertFeedback(previous, normalized), sortBy));
    };

    const handleRealtimeUpdated = (payload) => {
      const incoming = payload?.feedback;
      if (!incoming) return;

      const normalized = normalizeFeedbackEntry(incoming);
      setFeedbacks((previous) => sortFeedbacks(upsertFeedback(previous, normalized), sortBy));
    };

    const handleReconnectSync = () => {
      refreshFeedbacks({ showLoader: false });
    };

    socket.on('feedbackCreated', handleRealtimeCreated);
    socket.on('feedback_created', handleRealtimeCreated);
    socket.on('feedbackUpdated', handleRealtimeUpdated);
    socket.on('feedback_updated', handleRealtimeUpdated);
    socket.on('connect', handleReconnectSync);
    socket.on('reconnect', handleReconnectSync);

    return () => {
      socket.off('feedbackCreated', handleRealtimeCreated);
      socket.off('feedback_created', handleRealtimeCreated);
      socket.off('feedbackUpdated', handleRealtimeUpdated);
      socket.off('feedback_updated', handleRealtimeUpdated);
      socket.off('connect', handleReconnectSync);
      socket.off('reconnect', handleReconnectSync);
    };
  }, [refreshFeedbacks, restaurantId, sortBy]);

  useEffect(() => {
    const unsubscribe = subscribeToFeedbackEvents((detail) => {
      if (!detail?.feedback) return;

      const normalized = normalizeFeedbackEntry(detail.feedback);
      setFeedbacks((previous) => sortFeedbacks(upsertFeedback(previous, normalized), sortBy));
    });

    return unsubscribe;
  }, [sortBy]);

  const filteredFeedbacks = useMemo(() => {
    const visible = applyFeedbackFilters(feedbacks, {
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      category: filters.category,
      minRating: filters.minRating,
      status: filters.status,
    });

    return sortFeedbacks(visible, sortBy);
  }, [feedbacks, filters, sortBy]);

  const summary = useMemo(() => computeFeedbackSummary(feedbacks), [feedbacks]);

  const handleToggleReviewed = async (feedback) => {
    const shouldReview = feedback.status !== 'reviewed';

    try {
      const updated = await toggleFeedbackReviewed(feedback._id, shouldReview);
      const normalized = normalizeFeedbackEntry(updated);

      setFeedbacks((previous) => sortFeedbacks(upsertFeedback(previous, normalized), sortBy));
      toast.success(shouldReview ? 'Marked as reviewed.' : 'Marked as new.');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Unable to update feedback status.');
    }
  };

  if (loading) {
    return (
      <ManagerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7c6af7] border-t-transparent" />
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 md:text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              Feedbacks
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Real-time guest feedback monitoring
            </p>
          </div>

          <button
            type="button"
            onClick={() => refreshFeedbacks({ showLoader: false })}
            aria-label="Refresh feedback list"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1e3a5f] bg-[#132845] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-[#1e3a5f]"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#1e3a5f] bg-[#0d1f3c] p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Average Rating (All Time)</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{summary.averageAllTime.toFixed(2)}</p>
          </div>

          <div className="rounded-2xl border border-[#1e3a5f] bg-[#0d1f3c] p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Average Rating (Last 7 Days)</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{summary.averageLast7Days.toFixed(2)}</p>
          </div>

          <div className="rounded-2xl border border-[#1e3a5f] bg-[#0d1f3c] p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Total Feedbacks</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{summary.total}</p>
          </div>

          <div className="rounded-2xl border border-[#1e3a5f] bg-[#0d1f3c] p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">% Reviewed</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{summary.reviewedPercentage.toFixed(1)}%</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1e3a5f] bg-[#0d1f3c] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Filter className="h-4 w-4 text-[#7c6af7]" /> Filters & Sorting
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="text-xs text-slate-400">
              <span className="mb-1 inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> From</span>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(event) => setFilters((previous) => ({ ...previous, fromDate: event.target.value }))}
                className="w-full rounded-lg border border-[#1e3a5f] bg-[#132845] px-3 py-2 text-sm text-slate-100 focus:border-[#7c6af7] focus:outline-none"
              />
            </label>

            <label className="text-xs text-slate-400">
              <span className="mb-1 inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> To</span>
              <input
                type="date"
                value={filters.toDate}
                onChange={(event) => setFilters((previous) => ({ ...previous, toDate: event.target.value }))}
                className="w-full rounded-lg border border-[#1e3a5f] bg-[#132845] px-3 py-2 text-sm text-slate-100 focus:border-[#7c6af7] focus:outline-none"
              />
            </label>

            <label className="text-xs text-slate-400">
              <span className="mb-1 block">Category</span>
              <select
                value={filters.category}
                onChange={(event) => setFilters((previous) => ({ ...previous, category: event.target.value }))}
                className="w-full rounded-lg border border-[#1e3a5f] bg-[#132845] px-3 py-2 text-sm text-slate-100 focus:border-[#7c6af7] focus:outline-none"
              >
                <option value="all">All</option>
                {FEEDBACK_CATEGORIES.map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-400">
              <span className="mb-1 block">{'Rating (>=)'}</span>
              <select
                value={filters.minRating}
                onChange={(event) => setFilters((previous) => ({ ...previous, minRating: event.target.value }))}
                className="w-full rounded-lg border border-[#1e3a5f] bg-[#132845] px-3 py-2 text-sm text-slate-100 focus:border-[#7c6af7] focus:outline-none"
              >
                <option value="0">All</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5</option>
              </select>
            </label>

            <label className="text-xs text-slate-400">
              <span className="mb-1 block">Status</span>
              <select
                value={filters.status}
                onChange={(event) => setFilters((previous) => ({ ...previous, status: event.target.value }))}
                className="w-full rounded-lg border border-[#1e3a5f] bg-[#132845] px-3 py-2 text-sm text-slate-100 focus:border-[#7c6af7] focus:outline-none"
              >
                <option value="all">All</option>
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
              </select>
            </label>

            <label className="text-xs text-slate-400">
              <span className="mb-1 block">Sort By</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="w-full rounded-lg border border-[#1e3a5f] bg-[#132845] px-3 py-2 text-sm text-slate-100 focus:border-[#7c6af7] focus:outline-none"
              >
                <option value="date_desc">Date (Newest)</option>
                <option value="date_asc">Date (Oldest)</option>
                <option value="rating_desc">Rating (High to Low)</option>
                <option value="rating_asc">Rating (Low to High)</option>
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#1e3a5f] bg-[#0d1f3c]">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="border-b border-[#1e3a5f] bg-[#132845]/50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Table #</th>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Comment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedbacks.map((feedback) => (
                <tr
                  key={feedback._id}
                  onClick={() => setSelectedFeedback(feedback)}
                  className="cursor-pointer border-b border-[#1e3a5f]/60 text-slate-200 transition-colors hover:bg-[#132845]/35"
                >
                  <td className="px-4 py-3 text-slate-300">{formatDateTime(feedback.createdAt)}</td>
                  <td className="px-4 py-3 font-semibold">{feedback.tableNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#7c6af7]">{feedback.orderId || '-'}</td>
                  <td className="px-4 py-3">{feedback.category}</td>
                  <td className="px-4 py-3">{renderRating(feedback.rating)}</td>
                  <td className="max-w-[260px] truncate px-4 py-3 text-slate-300">
                    {feedback.comment || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold border ${
                        feedback.status === 'reviewed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-[#7c6af7]/10 text-[#7c6af7] border-[#7c6af7]/30'
                      }`}
                    >
                      {feedback.status === 'reviewed' ? 'Reviewed' : 'New'}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleToggleReviewed(feedback)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#1e3a5f] bg-[#132845] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-[#1e3a5f]"
                      aria-label={feedback.status === 'reviewed' ? 'Mark feedback as new' : 'Mark feedback as reviewed'}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {feedback.status === 'reviewed' ? 'Mark New' : 'Mark Reviewed'}
                    </button>
                  </td>
                </tr>
              ))}

              {filteredFeedbacks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No feedbacks found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedFeedback && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm md:items-center"
            onClick={() => setSelectedFeedback(null)}
          >
            <Motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#1e3a5f] bg-[#0d1f3c]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#1e3a5f] bg-[#132845]/50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#7c6af7]" />
                  <h3 className="text-lg font-bold text-slate-100">Feedback Details</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFeedback(null)}
                  aria-label="Close feedback details"
                  className="rounded-full bg-[#132845] p-2 text-slate-300 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 px-5 py-5 text-sm text-slate-300">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <p><span className="text-slate-500">Date:</span> {formatDateTime(selectedFeedback.createdAt)}</p>
                  <p><span className="text-slate-500">Table:</span> {selectedFeedback.tableNumber}</p>
                  <p><span className="text-slate-500">Order ID:</span> {selectedFeedback.orderId || '-'}</p>
                  <p><span className="text-slate-500">Category:</span> {selectedFeedback.category}</p>
                </div>

                <div>
                  <p className="mb-1 text-slate-500">Rating</p>
                  {renderRating(selectedFeedback.rating)}
                </div>

                <div>
                  <p className="mb-1 text-slate-500">Comment</p>
                  <div className="rounded-xl border border-[#1e3a5f] bg-[#132845]/40 p-3 leading-relaxed text-slate-200">
                    {selectedFeedback.comment || 'No comment provided.'}
                  </div>
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </ManagerLayout>
  );
};

export default FeedbacksPage;
