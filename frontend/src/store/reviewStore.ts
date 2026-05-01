import { create } from "zustand";
import { getWithAuth, postWithAuth } from "@/service/httpService";

export interface Review {
  _id: string;
  appointmentId: string;
  doctorId: string;
  patientId: {
    _id: string;
    name: string;
    profileImage?: string;
    email?: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
}

interface ReviewState {
  /* Cache: appointmentId → { reviewed, review } */
  reviewCache: Record<string, { reviewed: boolean; review: Review | null }>;
  submitting: boolean;
  error: string | null;

  checkReview: (appointmentId: string) => Promise<{ reviewed: boolean; review: Review | null }>;
  submitReview: (
    appointmentId: string,
    doctorId: string,
    rating: number,
    comment: string
  ) => Promise<{ success: boolean; alreadyReviewed?: boolean; message?: string }>;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviewCache: {},
  submitting: false,
  error: null,

  checkReview: async (appointmentId) => {
    const cached = get().reviewCache[appointmentId];
    if (cached !== undefined) return cached;

    try {
      const res = await getWithAuth(`/review/appointment/${appointmentId}`);
      const result = { reviewed: res.data.reviewed, review: res.data.review };
      set((state) => ({
        reviewCache: { ...state.reviewCache, [appointmentId]: result },
      }));
      return result;
    } catch {
      return { reviewed: false, review: null };
    }
  },

  submitReview: async (appointmentId, doctorId, rating, comment) => {
    set({ submitting: true, error: null });
    try {
      const res = await postWithAuth("/review", {
        appointmentId,
        doctorId,
        rating,
        comment,
      });

      if (res.data?.alreadyReviewed) {
        return { success: false, alreadyReviewed: true, message: res.message };
      }

      /* Update cache */
      set((state) => ({
        reviewCache: {
          ...state.reviewCache,
          [appointmentId]: { reviewed: true, review: res.data },
        },
      }));

      return { success: true };
    } catch (error: any) {
      const msg = error?.message || "Failed to submit review";
      set({ error: msg });
      return { success: false, message: msg };
    } finally {
      set({ submitting: false });
    }
  },
}));
