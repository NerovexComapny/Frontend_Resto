import React, { useMemo, useState } from 'react';
import Star from 'lucide-react/dist/esm/icons/star';
import { toast } from 'react-hot-toast';
import {
  FEEDBACK_CATEGORIES,
  isFeedbackAlreadySubmitted,
  submitFeedback,
  validateFeedbackInput,
} from '../../services/feedbacks';

const MAX_COMMENT_LENGTH = 500;

const FeedbackForm = ({ tableId, orderId }) => {
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState(FEEDBACK_CATEGORIES[0]);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(isFeedbackAlreadySubmitted(orderId));

  const canSubmit = useMemo(() => {
    return rating > 0 && !isSubmitting && !isSubmitted;
  }, [isSubmitted, isSubmitting, rating]);

  const resetForm = () => {
    setRating(0);
    setCategory(FEEDBACK_CATEGORIES[0]);
    setComment('');
    setErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitted || isSubmitting) return;

    const validation = validateFeedbackInput({ rating, category, comment });
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await submitFeedback({
        tableId,
        orderId,
        rating,
        category,
        comment,
        createdAt: new Date().toISOString(),
      });

      toast.success('Thank you for your feedback!');
      resetForm();
      setIsSubmitted(true);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to submit feedback right now.';
      setErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-2xl border border-[#c9963a]/20 bg-white/90 p-4 text-left"
      aria-label="Leave feedback form"
    >
      <h3 className="text-lg font-bold text-[#0a1628]">Leave Feedback</h3>
      <p className="mt-1 text-sm text-[#0a1628]/70">
        Share your experience to help us improve.
      </p>

      <div className="mt-4">
        <label className="block text-sm font-semibold text-[#0a1628]">Rating *</label>
        <div className="mt-2 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((value) => {
            const isActive = value <= rating;

            return (
              <button
                key={value}
                type="button"
                aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                onClick={() => setRating(value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setRating(value);
                  }
                }}
                className={`rounded-lg p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-[#c9963a]/50 ${
                  isActive ? 'text-[#c9963a]' : 'text-[#0a1628]/30 hover:text-[#c9963a]/70'
                }`}
                disabled={isSubmitted}
              >
                <Star className={`h-6 w-6 ${isActive ? 'fill-current' : ''}`} />
              </button>
            );
          })}
        </div>
        {errors.rating && (
          <p className="mt-1 text-xs text-red-600" role="alert">{errors.rating}</p>
        )}
      </div>

      <div className="mt-4">
        <label htmlFor="feedback-category" className="block text-sm font-semibold text-[#0a1628]">
          Category *
        </label>
        <select
          id="feedback-category"
          aria-label="Feedback category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          disabled={isSubmitted}
          className="mt-2 w-full rounded-xl border border-[#c9963a]/30 bg-white px-3 py-2 text-sm text-[#0a1628] focus:border-[#c9963a] focus:outline-none focus:ring-2 focus:ring-[#c9963a]/30"
        >
          {FEEDBACK_CATEGORIES.map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
        {errors.category && (
          <p className="mt-1 text-xs text-red-600" role="alert">{errors.category}</p>
        )}
      </div>

      <div className="mt-4">
        <label htmlFor="feedback-comment" className="block text-sm font-semibold text-[#0a1628]">
          Comment (optional)
        </label>
        <textarea
          id="feedback-comment"
          aria-label="Feedback comment"
          rows={4}
          value={comment}
          onChange={(event) => setComment(event.target.value.slice(0, MAX_COMMENT_LENGTH))}
          placeholder="Tell us what went well and what we can improve."
          disabled={isSubmitted}
          className="mt-2 w-full rounded-xl border border-[#c9963a]/30 bg-white px-3 py-2 text-sm text-[#0a1628] focus:border-[#c9963a] focus:outline-none focus:ring-2 focus:ring-[#c9963a]/30"
        />
        <div className="mt-1 flex items-center justify-between">
          {errors.comment ? (
            <p className="text-xs text-red-600" role="alert">{errors.comment}</p>
          ) : (
            <span className="text-xs text-[#0a1628]/50">Maximum 500 characters</span>
          )}
          <span className="text-xs font-medium text-[#0a1628]/70">
            {comment.length}/{MAX_COMMENT_LENGTH}
          </span>
        </div>
      </div>

      {errors.submit && (
        <p className="mt-3 text-sm text-red-600" role="alert">{errors.submit}</p>
      )}

      {isSubmitted && (
        <p className="mt-3 text-sm font-medium text-emerald-600" role="status">
          Feedback already submitted for this order.
        </p>
      )}

      <button
        type="submit"
        aria-label="Submit feedback"
        disabled={!canSubmit}
        className="mt-4 w-full rounded-xl bg-[#0a1628] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1e3a5f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  );
};

export default FeedbackForm;
