"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star } from "lucide-react";
import { Doctor } from "@/lib/types";
import { getWithAuth } from "@/service/httpService";

interface Review {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  patientId: {
    name: string;
    profileImage?: string;
    age?: number;
  } | null;
}

interface Props {
  doctor: Doctor | null;
  open: boolean;
  onClose: () => void;
}

/* ── Helpers ── */
const StarRating = ({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "lg";
}) => {
  const px = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = rating >= s;
        const partial = !filled && rating > s - 1;
        return (
          <span key={s} className="relative inline-block">
            {/* empty star */}
            <Star className={`${px} text-gray-200`} fill="currentColor" />
            {/* overlay */}
            {(filled || partial) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: filled ? "100%" : `${(rating - (s - 1)) * 100}%` }}
              >
                <Star className={`${px} text-orange-400`} fill="currentColor" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/* ── Component ── */
const DoctorReviewModal: React.FC<Props> = ({ doctor, open, onClose }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !doctor) return;
    setLoading(true);
    getWithAuth(`/review/doctor/${doctor._id}`)
      .then((res) => setReviews(res.data ?? []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [open, doctor]);

  if (!doctor) return null;

  // Use prop values if available (from doctor list), else compute from fetched reviews
  const displayRating =
    doctor.avgRating != null
      ? doctor.avgRating
      : reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0;
  const displayCount =
    doctor.totalReviews != null && doctor.totalReviews > 0
      ? doctor.totalReviews
      : reviews.length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-full p-0 overflow-hidden rounded-2xl">
        {/* ── Header ── */}
        <div className="bg-gradient-to-br from-green-50 to-white px-6 pt-6 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 ring-2 ring-green-100">
                <AvatarImage src={doctor.profileImage} alt={doctor.name} />
                <AvatarFallback className="bg-gradient-to-br from-green-100 to-green-200 text-green-700 text-2xl font-bold">
                  {doctor.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-bold text-gray-900 leading-tight">
                  {doctor.name}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-0.5">
                  {doctor.specialization}{doctor.experience ? ` · ${doctor.experience} yrs exp` : ""}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <StarRating rating={displayRating} size="lg" />
                  <span className="text-lg font-bold text-gray-800">
                    {displayRating > 0 ? displayRating.toFixed(1) : "—"}
                  </span>
                  <Badge
                    variant="secondary"
                    className="bg-green-50 text-green-700 text-xs"
                  >
                    {displayCount} {displayCount === 1 ? "review" : "reviews"}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        <Separator />

        {/* ── Review List ── */}
        <ScrollArea className="max-h-[400px] px-6 py-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                      <div className="h-3 bg-gray-200 rounded w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No reviews yet</p>
              <p className="text-sm mt-1">Be the first to leave a review!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review._id} className="group">
                  <div className="flex gap-3">
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarImage src={review.patientId?.profileImage} />
                      <AvatarFallback className="bg-green-50 text-green-700 text-sm font-semibold">
                        {review.patientId?.name?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-tight">
                            {review.patientId?.name ?? "Anonymous"}
                            {review.patientId?.age && (
                              <span className="text-gray-400 font-normal text-xs ml-1.5">
                                · {review.patientId.age} yrs
                              </span>
                            )}
                          </p>
                          <StarRating rating={review.rating} />
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>

                      {review.comment && (
                        <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                          "{review.comment}"
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator className="mt-4" />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default DoctorReviewModal;
