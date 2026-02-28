import { Doctor, DoctorFilters } from "@/lib/types";
import { getWithAuth } from "@/service/httpService";
import { create } from "zustand";

interface DoctorState {
  doctors: Doctor[];
  currentDoctor: Doctor | null;
  dashboard: any;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };

  //Action
  clearError: () => void;
  setCurrentDoctor: (doctor: Doctor) => void;

  //Api Action
  fetchDoctors: (filters: DoctorFilters) => Promise<void>;
  fetchDoctorById: (id: string) => Promise<void>;
  fetchDashboard: (period?:string) => Promise<void>
}

export const useDoctorStore = create<DoctorState>((set, get) => ({
  doctors: [],
  currentDoctor: null,
  dashboard: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
  clearError: () => set({ error: null }),

  setCurrentDoctor: (doctor) => set({ currentDoctor: doctor }),
  fetchDoctors: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          queryParams.append(key, value.toString());
        }
      });
      const response = await getWithAuth(
        `/doctor/list?${queryParams.toString()}`
      );

      set({
        doctors: response.data,
        pagination: {
          page: response.meta?.page || 1,
          limit: response.meta?.limit || 20,
          total: response.meta?.total || 0,
        },
      });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false, error: null });
    }
  },

  fetchDoctorById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await getWithAuth(`/doctor/${id}`);
      set({ currentDoctor: response.data });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false, error: null });
    }
  },


    fetchDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const response = await getWithAuth('/doctor/dashboard');
      set({ dashboard: response.data });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false, error: null });
    }
  },

  
}));
