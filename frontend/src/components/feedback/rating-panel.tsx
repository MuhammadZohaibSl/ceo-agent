"use client";

/**
 * Rating Panel Component
 * Star rating with optional comment for providing feedback on analysis results
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, Check } from "lucide-react";
import { recordRating } from "@/lib/api";

interface RatingPanelProps {
  contextId: string;
  onRatingSubmitted?: (rating: number) => void;
}

export function RatingPanel({ contextId, onRatingSubmitted }: RatingPanelProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await recordRating({
        contextId,
        rating: rating as 1 | 2 | 3 | 4 | 5,
        comment: comment.trim() || undefined,
      });

      setIsSubmitted(true);
      onRatingSubmitted?.(rating);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit rating");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="bg-green-900/20 border-green-700/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-2 text-green-400">
            <Check className="h-5 w-5" />
            <span className="font-medium">Thank you for your feedback!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-slate-300">
          How helpful was this recommendation?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div className="flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 transition-transform hover:scale-110"
              disabled={isSubmitting}
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-slate-600"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Rating Label */}
        {rating > 0 && (
          <p className="text-center text-sm text-slate-400">
            {rating === 1 && "Poor - Not helpful at all"}
            {rating === 2 && "Below Average - Needs improvement"}
            {rating === 3 && "Average - Somewhat helpful"}
            {rating === 4 && "Good - Helpful recommendation"}
            {rating === 5 && "Excellent - Very helpful!"}
          </p>
        )}

        {/* Optional Comment */}
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add an optional comment..."
          className="bg-slate-800/50 border-slate-700 text-white min-h-[60px] text-sm"
          disabled={isSubmitting}
        />

        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={rating === 0 || isSubmitting}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Feedback"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
