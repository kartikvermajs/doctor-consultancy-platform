"use client";

import React, { useEffect, useState } from "react";
import { Star, MessageSquare, CheckCircle, Loader2, X } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useReviewStore } from "@/store/reviewStore";
import { Appointment } from "@/store/appointmentStore";

interface ReviewModalProps {
  appointment: Appointment;
  trigger: React.ReactNode;
}

const StarRating = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => {
  const [hovered, setHovered] = useState(0);

  const labels = ["Terrible", "Poor", "Okay", "Good", "Excellent"];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-1 transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className={`w-9 h-9 transition-colors duration-150 ${
                star <= (hovered || value)
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-gray-100 text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
      {(hovered || value) > 0 && (
        <span className="text-sm font-medium text-gray-600">
          {labels[(hovered || value) - 1]}
        </span>
      )}
    </div>
  );
};

const ReviewModal = ({ appointment, trigger }: ReviewModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const { checkReview, submitReview, submitting } = useReviewStore();

  const doctorName = appointment.doctorId?.name ?? "Doctor";

  useEffect(() => {
    if (!isOpen) return;
    setChecking(true);
    checkReview(appointment._id).then(({ reviewed, review }) => {
      setAlreadyReviewed(reviewed);
      setExistingReview(review);
      if (reviewed && review) {
        setRating(review.rating);
        setComment(review.comment || "");
      }
      setChecking(false);
    });
  }, [isOpen, appointment._id, checkReview]);

  const handleSubmit = async () => {
    if (rating === 0) return;
    const result = await submitReview(
      appointment._id,
      appointment.doctorId?._id ?? appointment.doctorId,
      rating,
      comment
    );
    if (result.success) {
      setSubmitted(true);
    } else if (result.alreadyReviewed) {
      setAlreadyReviewed(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (!alreadyReviewed) {
      setRating(0);
      setComment("");
      setSubmitted(false);
    }
  };

  return (
    <>
      <span onClick={() => setIsOpen(true)} className="cursor-pointer">
        {trigger}
      </span>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-0">

            <CardHeader className="flex flex-row justify-between items-start border-b bg-gradient-to-r from-yellow-50 to-amber-50 rounded-t-xl pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-xl">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Rate Your Doctor</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Dr. {doctorName}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">

              {checking && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              )}

              {!checking && alreadyReviewed && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">
                      You&apos;ve already reviewed this appointment
                    </span>
                  </div>

                  {existingReview && (
                    <div className="space-y-3">
                      <div className="flex justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-8 h-8 ${
                              s <= existingReview.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-gray-100 text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      {existingReview.comment && (
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <p className="text-sm text-gray-700 italic">
                            &ldquo;{existingReview.comment}&rdquo;
                          </p>
                        </div>
                      )}
                      <p className="text-center text-xs text-gray-400">
                        Submitted on{" "}
                        {new Date(existingReview.createdAt).toLocaleDateString(
                          "en-US",
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleClose}
                  >
                    Close
                  </Button>
                </div>
              )}

              {!checking && !alreadyReviewed && submitted && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Thank you for your review!
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Your feedback helps other patients find the right doctor.
                    </p>
                  </div>
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-7 h-7 ${
                          s <= rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-gray-100 text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleClose}
                  >
                    Done
                  </Button>
                </div>
              )}

              {!checking && !alreadyReviewed && !submitted && (
                <div className="space-y-5">

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <Avatar className="w-10 h-10">
                      <AvatarImage
                        src={appointment.doctorId?.profileImage}
                      />
                      <AvatarFallback className="bg-green-100 text-green-700 font-semibold">
                        {doctorName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">
                        Dr. {doctorName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {appointment.doctorId?.specialization}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 text-center">
                      How was your experience?
                    </label>
                    <StarRating value={rating} onChange={setRating} />
                    {rating === 0 && (
                      <p className="text-center text-xs text-gray-400">
                        Click a star to rate
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-1 text-sm font-medium text-gray-700">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Comments{" "}
                      <span className="text-gray-400 font-normal">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      placeholder="Share your experience with other patients…"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
                    />
                    <p className="text-right text-xs text-gray-400">
                      {comment.length}/1000
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleClose}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold gap-2"
                      onClick={handleSubmit}
                      disabled={rating === 0 || submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        <>
                          <Star className="w-4 h-4 fill-white" />
                          Submit Review
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default ReviewModal;
