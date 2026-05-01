"use client";

import { Appointment, useAppointmentStore } from "@/store/appointmentStore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { getWithAuth } from "@/service/httpService";

interface AppointmentCallInterface {
  appointment: Appointment;
  currentUser: {
    id: string;
    name: string;
    role: "doctor" | "patient";
  };
  onCallEnd: (doctorEnded?: boolean) => void;
  joinConsultation: (appointmentId: string) => Promise<any>;
}

const POLL_INTERVAL_MS = 5000;

const AppointmentCall = ({
  appointment,
  currentUser,
  onCallEnd,
  joinConsultation,
}: AppointmentCallInterface) => {
  const zpRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializationRef = useRef(false);
  const isComponentMountedRef = useRef(true);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ejectedRef = useRef(false);

  const { endConsultation } = useAppointmentStore();

  const [ejectedByDoctor, setEjectedByDoctor] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const destroyZego = useCallback(() => {
    if (zpRef.current) {
      try {
        zpRef.current.destroy();
      } catch {
      } finally {
        zpRef.current = null;
      }
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const ejectPatient = useCallback(() => {
    if (ejectedRef.current) return;
    ejectedRef.current = true;
    stopPolling();
    destroyZego();
    setEjectedByDoctor(true);
    setTimeout(() => {
      if (isComponentMountedRef.current) {
        onCallEnd(true);
      }
    }, 3000);
  }, [stopPolling, destroyZego, onCallEnd]);

  const startPatientPolling = useCallback(() => {
    if (currentUser.role !== "patient") return;

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await getWithAuth(`/appointment/${appointment._id}`);
        const apt = res?.data?.appointment;
        if (!apt) return;
        if (apt.doctorEnded === true || apt.status === "Completed") {
          ejectPatient();
        }
      } catch {
      }
    }, POLL_INTERVAL_MS);
  }, [currentUser.role, appointment._id, ejectPatient]);

  const handleDoctorEndCall = useCallback(async () => {
    stopPolling();
    destroyZego();
    try {
      await endConsultation(appointment._id, "", "");
    } catch {
    }
    onCallEnd(false);
  }, [stopPolling, destroyZego, endConsultation, appointment._id, onCallEnd]);

  const memoizedJoinConsultation = useCallback(
    async (appointmentId: string) => {
      return await joinConsultation(appointmentId);
    },
    [joinConsultation],
  );

  const initializeCall = useCallback(
    async (container: HTMLDivElement) => {
      if (
        initializationRef.current ||
        zpRef.current ||
        !isComponentMountedRef.current
      ) {
        return;
      }

      if (!container || !container.isConnected) return;

      try {
        initializationRef.current = true;
        const appId = process.env.NEXT_PUBLIC_ZEGOCLOUD_APP_ID;
        const serverSecret = process.env.NEXT_PUBLIC_ZEGOCLOUD_SERVER_SECRET;

        if (!appId || !serverSecret)
          throw new Error("Zegocloud credentials not configured");

        const numericAppId = Number.parseInt(appId);
        if (isNaN(numericAppId)) throw new Error("Invalid Zegocloud App ID");

        try {
          const joinResult = await memoizedJoinConsultation(appointment._id);
          if (joinResult?.code === "SESSION_ENDED_BY_DOCTOR") {
            ejectPatient();
            return;
          }
        } catch (err: any) {
          if (err?.message === "SESSION_ENDED_BY_DOCTOR") {
            ejectPatient();
            return;
          }
          console.warn("Failed to update appointment join status", err);
        }

        if (!appointment.zegoRoomId)
          throw new Error("Zego room ID is missing for this appointment");

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          numericAppId,
          serverSecret,
          appointment.zegoRoomId,
          currentUser.id,
          currentUser.name,
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        const isVideoCall = appointment.consultationType === "Video Consultation";

        zp.joinRoom({
          container,
          scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
          turnOnMicrophoneWhenJoining: true,
          showMyMicrophoneToggleButton: true,
          turnOnCameraWhenJoining: isVideoCall,
          showMyCameraToggleButton: isVideoCall,
          showScreenSharingButton: true,
          showTextChat: true,
          showUserList: true,
          showRemoveUserButton: currentUser.role === "doctor",
          showPinButton: false,
          showAudioVideoSettingsButton: true,
          showTurnOffRemoteCameraButton: true,
          showTurnOffRemoteMicrophoneButton: true,
          maxUsers: 2,
          layout: "Auto",
          showLayoutButton: false,

          onJoinRoom: () => {
            startPatientPolling();
          },

          onLeaveRoom: () => {
            if (currentUser.role === "patient") {
              stopPolling();
              destroyZego();
              onCallEnd(false);
            }
          },

          onReturnToHomeScreenClicked: () => {
            if (currentUser.role === "doctor") {
              handleDoctorEndCall();
            } else {
              stopPolling();
              destroyZego();
              onCallEnd(false);
            }
          },

          onUserLeave: (users: any[]) => {
            console.log("Users left:", users);
          },
          onUserJoin: (users: any[]) => {
            console.log("Users joined:", users);
          },

          showLeavingView: currentUser.role !== "doctor",
        });
      } catch (error) {
        console.error("Call initialization failed", error);
        initializationRef.current = false;
        if (isComponentMountedRef.current) {
          zpRef.current = null;
          onCallEnd(false);
        }
      }
    },
    [
      appointment._id,
      appointment.zegoRoomId,
      appointment.consultationType,
      currentUser.id,
      currentUser.name,
      currentUser.role,
      memoizedJoinConsultation,
      onCallEnd,
      startPatientPolling,
      stopPolling,
      destroyZego,
      handleDoctorEndCall,
      ejectPatient,
    ],
  );

  useEffect(() => {
    isComponentMountedRef.current = true;

    if (
      containerRef.current &&
      !initializationRef.current &&
      currentUser.id &&
      currentUser.name
    ) {
      initializeCall(containerRef.current);
    }

    return () => {
      isComponentMountedRef.current = false;
      stopPolling();
      destroyZego();
    };
  }, [currentUser.id, currentUser.name, initializeCall, stopPolling, destroyZego]);

  const isVideoCall = appointment.consultationType === "Video Consultation";

  if (ejectedByDoctor) {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center">
        <div className="text-center space-y-4 p-8 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Session Ended</h2>
          <p className="text-gray-600">
            The doctor has ended this consultation session. You will be redirected
            to your dashboard shortly.
          </p>
          <div className="w-8 h-8 border-4 border-red-400 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gradient-to-br from-green-50 to-indigo-100 flex flex-col">
      {/* Header bar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">
            {isVideoCall ? "Video Consultation" : "Voice Consultation"}
          </h1>
          <p className="text-sm text-gray-600">
            {currentUser.role === "doctor"
              ? `Patient: ${appointment.patientId?.name ?? ""}`
              : `Dr. ${appointment.doctorId?.name ?? ""}`}
          </p>
        </div>

        {currentUser.role === "doctor" && (
          <button
            onClick={() => setConfirmEnd(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
            End Session
          </button>
        )}
      </div>

      {/* Confirmation overlay */}
      {confirmEnd && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">End Consultation?</h3>
                <p className="text-sm text-gray-600">This will permanently close the session. The patient will not be able to rejoin.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmEnd(false)}
                className="flex-1 border border-gray-200 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setConfirmEnd(false); handleDoctorEndCall(); }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        <div
          ref={containerRef}
          id="appointment-call-container"
          className="w-full h-full bg-gray-900"
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
};

export default AppointmentCall;
