import { Appointment } from "@/store/appointmentStore";
import React, { useCallback, useEffect, useRef } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

interface AppointmentCallInterface {
  appointment: Appointment;
  currentUser: {
    id: string;
    name: string;
    role: "doctor" | "patient";
  };
  onCallEnd: () => void;
  joinConsultation: (appointmentId: string) => Promise<void>;
}
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

  const memoizedJoinConsultation = useCallback(
    async (appointmentId: string) => {
      await joinConsultation(appointmentId);
    },
    [joinConsultation],
  );

  const intializeCall = useCallback(
    async (container: HTMLDivElement) => {
      if (
        initializationRef.current ||
        zpRef.current ||
        !isComponentMountedRef.current
      ) {
        return;
      }

      if (!container || !container.isConnected) {
        return;
      }

      try {
        initializationRef.current = true;
        const appId = process.env.NEXT_PUBLIC_ZEGOCLOUD_APP_ID;
        const serverSecret = process.env.NEXT_PUBLIC_ZEGOCLOUD_SERVER_SECRET;

        if (!appId || !serverSecret) {
          throw new Error("Zegocloud credentials not configured");
        }

        const numericAppId = Number.parseInt(appId);

        if (isNaN(numericAppId)) {
          throw new Error("Invalid Zegocloud App Id");
        }

        try {
          await memoizedJoinConsultation(appointment?._id);
        } catch (error) {
          console.warn("failed to update appointment", error);
        }
        if (!appointment.zegoRoomId) {
          throw new Error("Zego room ID is missing for this appointment");
        }
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          numericAppId,
          serverSecret,
          appointment.zegoRoomId,
          currentUser.id,
          currentUser.name,
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        const isVideoCall =
          appointment.consultationType === "Video Consultation";

        zp.joinRoom({
          container,
          scenario: {
            mode: ZegoUIKitPrebuilt.OneONoneCall,
          },
          turnOnMicrophoneWhenJoining: true,
          showMyMicrophoneToggleButton: true,
          turnOnCameraWhenJoining: isVideoCall,
          showMyCameraToggleButton: isVideoCall,
          showScreenSharingButton: true,
          showTextChat: true,
          showUserList: true,
          showRemoveUserButton: true,
          showPinButton: false,
          showAudioVideoSettingsButton: true,
          showTurnOffRemoteCameraButton: true,
          showTurnOffRemoteMicrophoneButton: true,
          maxUsers: 2,
          layout: "Auto",
          showLayoutButton: false,
          onJoinRoom: () => {
            if (isComponentMountedRef.current) {
              console.log(
                `Joined ${appointment.consultationType} : ${appointment.zegoRoomId}`,
              );
            }
          },
          onLeaveRoom: () => {
            if (isComponentMountedRef.current) {
              if (zpRef.current) {
                try {
                  zpRef.current.mutePublishStreamAudio(true);
                  zpRef.current.mutePublishStreamVideo(true);
                } catch (error) {
                  console.warn("Error turning off camera/mircophone");
                }
              }
            }
          },
          onUserJoin: (users: any[]) => {
            if (isComponentMountedRef.current) {
              console.log("Users Joined", users);
            }
          },
          onUserLeave: (users: any[]) => {
            if (isComponentMountedRef.current) {
              console.log("Users left", users);
            }
          },

          showLeavingView: true,

          onReturnToHomeScreenClicked: () => {
            if (zpRef.current) {
              try {
                zpRef.current.mutePublishStreamAudio(true);
                zpRef.current.mutePublishStreamVideo(true);
              } catch (error) {
                console.warn("Error turning off camera/mircophone");
              }
            }
            onCallEnd();
          },
        });
      } catch (error) {
        console.error("Call Initilization failed", error);
        initializationRef.current = false;
        if (isComponentMountedRef.current) {
          zpRef.current = null;
          onCallEnd();
        }
      }
    },
    [
      appointment?._id,
      appointment.zegoRoomId,
      appointment.consultationType,
      currentUser.id,
      currentUser.name,
      memoizedJoinConsultation,
      onCallEnd,
    ],
  );

  useEffect(() => {
    if (
      containerRef.current &&
      !initializationRef.current &&
      currentUser.id &&
      currentUser.name &&
      isComponentMountedRef.current
    ) {
      intializeCall(containerRef.current);
    }
    return () => {
      if (zpRef.current) {
        try {
          zpRef.current.destroy();
        } catch (error) {
          console.warn("Error during cleaup", error);
        } finally {
          zpRef.current = null;
        }
      }
    };
  }, [currentUser.id, currentUser.name, intializeCall]);

  const isVideoCall = appointment.consultationType === "Video Consultation";

  return (
    <div className="h-screen w-full bg-gradient-to-br from-green-50 to-indigo-100 flex flex-col">
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {isVideoCall ? "Video Consultation" : "Voice Consultation"}
          </h1>

          <p className="text-sm text-gray-600">
            {currentUser.role === "doctor"
              ? `Patient: ${appointment.patientId.name}`
              : `Dr: ${appointment.doctorId.name}`}
          </p>
        </div>
      </div>
      <div className="flex-1">
        <div
          ref={containerRef}
          id="appointment-call-container"
          className="w-full h-full bg-gray-900"
          style={{ height: "100%" }}
        ></div>
      </div>
    </div>
  );
};

export default AppointmentCall;
