import {
  deleteWithAuth,
  getWithAuth,
  postWithAuth,
  putWithAuth,
} from "@/service/httpService";
import { create } from "zustand";

export interface AppointmentDocument {
  url: string;
  key: string;
  type: "lab-report" | "prescription" | "other";
}

export interface Appointment {
  _id: string;
  doctorId: any;
  patientId: any;
  slotStartIso: string;
  slotEndIso: string;
  consultationType: string;
  status: string;

  symptoms?: string;
  prescriptionText?: string;
  notes?: string;

  documents?: AppointmentDocument[];

  zegoRoomId?: string;

  createdAt: string;
}

interface AppointmentFilters {
  status?: string | string[];
  from?: string;
  to?: string;
  date?: string;
  sortBy?: "date" | "createdAt" | "status";
  sortOrder?: "asc" | "desc";
}

interface BookingData {
  doctorId: string;
  slotStartIso: string;
  slotEndIso: string;
  consultationType?: string;
  symptoms: string;
  date: string;
  consultationFees: number;
  platformFees: number;
  totalAmount: number;
}

interface AppointmentState {
  /* ---------- STATE ---------- */
  appointments: Appointment[];
  bookedSlots: string[];
  currentAppointment: Appointment | null;
  loading: boolean;
  error: string | null;

  /* ---------- LOCAL ACTIONS ---------- */
  clearError: () => void;
  setCurrentAppointment: (appointment: Appointment) => void;

  /* ---------- API ACTIONS ---------- */
  fetchAppointments: (
    role: "doctor" | "patient",
    tab?: string,
    filters?: AppointmentFilters,
  ) => Promise<void>;

  fetchBookedSlots: (doctorId: string, date: string) => Promise<void>;

  fetchAppointmentById: (appointmentId: string) => Promise<Appointment | null>;

  bookAppointment: (data: BookingData) => Promise<any>;

  joinConsultation: (appointmentId: string) => Promise<any>;

  endConsultation: (
    appointmentId: string,
    prescription?: string,
    notes?: string,
  ) => Promise<void>;

  updateAppointmentStatus: (
    appointmentId: string,
    status: string,
  ) => Promise<void>;

  /* ---------- DOCUMENT ACTIONS (NEW + REQUIRED) ---------- */
  uploadDocuments: (
    appointmentId: string,
    files: AppointmentDocument[],
  ) => Promise<void>;

  deleteDocument: (appointmentId: string, key: string) => Promise<void>;
}

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  appointments: [],
  bookedSlots: [],
  currentAppointment: null,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  setCurrentAppointment: (appointment) =>
    set({ currentAppointment: appointment }),

  fetchAppointments: async (role, tab = "", filters = {}) => {
    set({ loading: true, error: null });
    try {
      const endPoint =
        role === "doctor" ? "/appointment/doctor" : "/appointment/patient";
      const queryParams = new URLSearchParams();
      if (tab === "upcoming") {
        queryParams.append("status", "Scheduled");
        queryParams.append("status", "In Progress");
      } else if (tab === "past") {
        queryParams.append("status", "Completed");
        queryParams.append("status", "Cancelled");
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          value !== "" &&
          key !== "status"
        ) {
          if (Array.isArray(value)) {
            value.forEach((v) => queryParams.append(key, v.toString()));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
      const response = await getWithAuth(
        `${endPoint}?${queryParams.toString()}`,
      );
      set({ appointments: response.data || [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchAppointmentById: async (appointmentId) => {
    set({ loading: true, error: null });
    try {
      const response = await getWithAuth(`/appointment/${appointmentId}`);
      set({ currentAppointment: response?.data?.appointment });
      return response?.data?.appointment;
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchBookedSlots: async (doctorId, date) => {
    set({ loading: true, error: null });
    try {
      const response = await getWithAuth(
        `/appointment/booked-slots/${doctorId}/${date}`,
      );
      set({ bookedSlots: response?.data });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  bookAppointment: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await postWithAuth("/appointment/book", data);
      set((state) => ({
        appointments: [response.data, ...state.appointments],
      }));
      return response.data;
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  uploadDocuments: async (
    appointmentId: string,
    files: AppointmentDocument[],
  ) => {
    const res = await postWithAuth(
      `/api/appointments/${appointmentId}/documents`,
      { documents: files },
    );

    set((state) => ({
      appointments: state.appointments.map((a) =>
        a._id === appointmentId ? { ...a, documents: res.data } : a,
      ),
      currentAppointment:
        state.currentAppointment?._id === appointmentId
          ? {
              ...state.currentAppointment,
              documents: res.data,
            }
          : state.currentAppointment,
    }));
  },

  deleteDocument: async (appointmentId: string, key: string) => {
    const res = await deleteWithAuth(
      `/api/appointments/${appointmentId}/documents/${key}`,
    );

    set((state) => ({
      appointments: state.appointments.map((a) =>
        a._id === appointmentId ? { ...a, documents: res.data } : a,
      ),
      currentAppointment:
        state.currentAppointment?._id === appointmentId
          ? {
              ...state.currentAppointment,
              documents: res.data,
            }
          : state.currentAppointment,
    }));
  },

  joinConsultation: async (appointmentId) => {
    set({ loading: true, error: null });
    try {
      const response = await getWithAuth(`/appointment/join/${appointmentId}`);
      set((state) => ({
        appointments: state.appointments.map((apt) =>
          apt._id === appointmentId
            ? { ...apt, status: "In Progress" as const }
            : apt,
        ),
        currentAppointment:
          state.currentAppointment?._id === appointmentId
            ? { ...state.currentAppointment, status: "In Progress" as const }
            : state.currentAppointment,
      }));

      return response.data;
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
  endConsultation: async (appointmentId, prescription, notes) => {
    set({ loading: true, error: null });
    try {
      const response = await putWithAuth(`/appointment/end/${appointmentId}`, {
        prescriptionText: prescription,
        notes,
      });
      set((state) => ({
        appointments: state.appointments.map((apt) =>
          apt._id === appointmentId
            ? { ...apt, status: "Completed" as const }
            : apt,
        ),
        currentAppointment:
          state.currentAppointment?._id === appointmentId
            ? { ...state.currentAppointment, status: "Completed" as const }
            : state.currentAppointment,
      }));

      return response.data;
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
  updateAppointmentStatus: async (appointmentId, status) => {
    set({ loading: true, error: null });
    try {
      const response = await putWithAuth(
        `/appointment/status/${appointmentId}`,
        { status },
      );
      set((state) => ({
        appointments: state.appointments.map((apt) =>
          apt._id === appointmentId ? { ...apt, status: status as any } : apt,
        ),
        currentAppointment:
          state.currentAppointment?._id === appointmentId
            ? { ...state.currentAppointment, status: status as any }
            : state.currentAppointment,
      }));

      return response.data;
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
}));
