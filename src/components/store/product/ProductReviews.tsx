"use client";

import { useEffect, useState } from "react";
import { RatingStars } from "@/components/store/product/RatingStars";

type ReviewItem = {
  id: string;
  rating: number;
  title: string;
  comment: string;
  userName: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
};

export function ProductReviews({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/v1/products/${slug}/reviews`);
    const body = (await res.json().catch(() => ({}))) as { reviews?: ReviewItem[]; canReview?: boolean };
    setReviews(body.reviews ?? []);
    setCanReview(!!body.canReview);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const submit = async () => {
    setStatus("");
    setSubmitting(true);
    const res = await fetch(`/api/v1/products/${slug}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, title: title.trim(), comment: comment.trim() }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setSubmitting(false);
    if (!res.ok) {
      setStatus(body.error || "Failed to submit review.");
      return;
    }
    setStatus("Review submitted.");
    setTitle("");
    setComment("");
    setRating(5);
    await load();
  };

  return (
    <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="text-lg font-semibold">Customer Reviews</h2>
      {loading ? <p className="mt-2 text-sm text-zinc-500">Loading reviews...</p> : null}
      {!loading && !reviews.length ? <p className="mt-2 text-sm text-zinc-500">No reviews yet.</p> : null}
      <div className="mt-3 space-y-3">
        {reviews.map((review) => (
          <article key={review.id} className="rounded border border-zinc-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-zinc-900">{review.userName}</p>
                <p className="text-xs text-zinc-500">{new Date(review.createdAt).toLocaleDateString()}</p>
              </div>
              <RatingStars rating={review.rating} size="md" />
            </div>
            {review.title ? <p className="mt-2 text-sm font-medium text-zinc-800">{review.title}</p> : null}
            {review.comment ? <p className="mt-1 text-sm text-zinc-700">{review.comment}</p> : null}
            {review.isVerifiedPurchase ? <p className="mt-2 text-xs font-medium text-emerald-600">Verified purchase</p> : null}
          </article>
        ))}
      </div>

      {canReview ? (
        <div className="mt-5 rounded border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-sm font-semibold text-zinc-800">Write a review</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-lg ${star <= rating ? "text-amber-400" : "text-zinc-300"}`}
              >
                ★
              </button>
            ))}
          </div>
          <input
            className="mt-2 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Review title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="mt-2 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Share your experience"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="mt-2 rounded bg-brand-yellow px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
          {status ? <p className="mt-2 text-sm text-zinc-600">{status}</p> : null}
        </div>
      ) : (
        <p className="mt-4 text-xs text-zinc-500">Only customers who purchased this product can add a review.</p>
      )}
    </section>
  );
}
