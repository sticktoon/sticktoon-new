import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { formatDate } from '../utils/formatDate';

/**
 * Ratings + reviews for a single product.
 *
 * `productId` is whatever id the product is addressed by in the URL — a Mongo
 * ObjectId hex for database products, or a loose string like "sticker-1" for
 * the hardcoded catalogue. The backend keys reviews off the same loose id that
 * orders record in `items.badgeId`, so both work.
 *
 * Only customers with a SUCCESS order for this product may post; the backend
 * enforces that, and this component just reflects it.
 */

export type ProductReview = {
  _id: string;
  userName?: string;
  rating: number;
  comment?: string;
  createdAt: string;
};

type ReviewUser = { name?: string; email?: string } | null | undefined;

interface ProductReviewsProps {
  productId?: string;
  user?: ReviewUser;
  className?: string;
}

const Stars = ({ value, size = 'w-4 h-4' }: { value: number; size?: string }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`${size} ${
          i < Math.round(value)
            ? 'text-yellow-500 fill-yellow-500'
            : 'text-slate-300 fill-slate-200'
        }`}
      />
    ))}
  </div>
);

export default function ProductReviews({ productId, user, className = '' }: ProductReviewsProps) {
  const navigate = useNavigate();

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [stats, setStats] = useState({ average: 0, count: 0 });
  const [canReview, setCanReview] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const fetchReviews = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reviews/${encodeURIComponent(id)}`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      setStats({ average: data.average || 0, count: data.count || 0 });
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  // Reset everything when navigating between products.
  useEffect(() => {
    if (!productId) return;
    setReviews([]);
    setStats({ average: 0, count: 0 });
    setCanReview(false);
    setHasExistingReview(false);
    setEligibilityChecked(false);
    setRating(5);
    setComment('');
    setMessage('');
    setMessageType('');
    fetchReviews(productId);
  }, [productId]);

  useEffect(() => {
    if (!productId || !user) {
      setCanReview(false);
      setEligibilityChecked(true);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setCanReview(false);
      setEligibilityChecked(true);
      return;
    }

    let isMounted = true;

    const checkEligibility = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/reviews/${encodeURIComponent(productId)}/eligibility`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        setCanReview(Boolean(data.canReview));
        if (data.myReview) {
          setHasExistingReview(true);
          setRating(data.myReview.rating || 5);
          setComment(data.myReview.comment || '');
        }
      } catch (err) {
        console.error('Error checking review eligibility:', err);
      } finally {
        if (isMounted) setEligibilityChecked(true);
      }
    };

    checkEligibility();

    return () => {
      isMounted = false;
    };
  }, [productId, user]);

  const handleSubmit = async () => {
    if (!productId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('Please log in to submit a review.');
      setMessageType('error');
      return;
    }

    setSubmitting(true);
    setMessage('');
    setMessageType('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/reviews/${encodeURIComponent(productId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data?.message || 'Failed to submit review.');
        setMessageType('error');
        return;
      }

      setMessage('Thanks! Your review has been saved.');
      setMessageType('success');
      setHasExistingReview(true);
      fetchReviews(productId);
    } catch (err) {
      console.error('Error submitting review:', err);
      setMessage('Failed to submit review. Please try again.');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-5 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-900">Customer Reviews</h2>
        {stats.count > 0 && (
          <div className="flex items-center gap-2">
            <Stars value={stats.average} />
            <span className="text-sm font-bold text-slate-700">
              {stats.average.toFixed(1)} ({stats.count})
            </span>
          </div>
        )}
      </div>

      {/* Write / update a review */}
      {!user ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs font-medium text-slate-600">
          <button
            onClick={() => navigate('/login')}
            className="text-yellow-600 font-bold hover:underline"
          >
            Log in
          </button>{' '}
          to write a review.
        </div>
      ) : !eligibilityChecked ? null : !canReview ? (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs font-medium text-slate-600">
          Only customers who've ordered this product can leave a review.
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
            {hasExistingReview ? 'Update your review' : 'Write a review'}
          </p>

          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i + 1)}
                aria-label={`Rate ${i + 1} star${i === 0 ? '' : 's'}`}
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    i < rating
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-slate-300 fill-slate-200'
                  }`}
                />
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this product (optional)"
            rows={3}
            className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400"
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-black uppercase tracking-wider shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
            {message && (
              <p
                className={`text-xs font-semibold ${
                  messageType === 'success' ? 'text-emerald-600' : 'text-rose-500'
                }`}
              >
                {message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <p className="text-sm text-slate-500">
          No reviews yet. Be the first to review this product!
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r._id}
              className="border-b border-slate-100 last:border-0 pb-3 last:pb-0"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">
                    {r.userName || 'Verified Buyer'}
                  </span>
                  <Stars value={r.rating} size="w-3 h-3" />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {formatDate(r.createdAt)}
                </span>
              </div>
              {r.comment && <p className="text-xs text-slate-600 mt-1">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
