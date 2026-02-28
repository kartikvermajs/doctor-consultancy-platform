"use client";

import React, { useEffect, useState } from "react";
import Header from "../landing/Header";
import { userAuthStore } from "@/store/authStore";
import { Appointment, useAppointmentStore } from "@/store/appointmentStore";
import { Card, CardContent } from "../ui/card";
import Link from "next/link";
import { Button } from "../ui/button";
import {
  Calendar,
  Clock,
  Phone,
  Star,
  Stethoscope,
  Video,
  XCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { emptyStates, getStatusColor } from "@/lib/constant";
import PrescriptionViewModal from "./PrescriptionViewModal";

const DoctorAppointmentContent = () => {
  const { user } = userAuthStore();
  const { appointments, fetchAppointments, loading, updateAppointmentStatus } =
    useAppointmentStore();

  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [tabCounts, setTabCounts] = useState({ upcoming: 0, past: 0 });

  /* ---------------- fetch appointments ---------------- */
  useEffect(() => {
    if (user?.type === "doctor") {
      fetchAppointments("doctor", activeTab);
    }
  }, [user, activeTab, fetchAppointments]);

  /* ---------------- tab counts ---------------- */
  useEffect(() => {
    const now = new Date();

    const upcoming = appointments.filter((apt) => {
      const start = new Date(apt.slotStartIso);
      return (
        (start >= now || apt.status === "In Progress") &&
        ["Scheduled", "In Progress"].includes(apt.status)
      );
    });

    const past = appointments.filter((apt) => {
      const start = new Date(apt.slotStartIso);
      return (
        start < now || apt.status === "Completed" || apt.status === "Cancelled"
      );
    });

    setTabCounts({
      upcoming: upcoming.length,
      past: past.length,
    });
  }, [appointments]);

  /* ---------------- helpers ---------------- */
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const isToday = (date: string) =>
    new Date(date).toDateString() === new Date().toDateString();

  const canJoinCall = (appointment: Appointment) => {
    const start = new Date(appointment.slotStartIso);
    const diff = (start.getTime() - Date.now()) / (1000 * 60);

    return (
      isToday(appointment.slotStartIso) &&
      diff <= 15 &&
      diff >= -120 &&
      ["Scheduled", "In Progress"].includes(appointment.status)
    );
  };

  const canMarkCancelled = (appointment: Appointment) =>
    appointment.status === "Scheduled" &&
    new Date() > new Date(appointment.slotStartIso);

  const handleMarkCancelled = async (id: string) => {
    if (
      !confirm("Are you sure you want to mark this appointment as cancelled?")
    )
      return;

    await updateAppointmentStatus(id, "Cancelled");
    fetchAppointments("doctor", activeTab);
  };

  if (!user) return null;

  type Tab = "upcoming" | "past";

  const EMPTY_STATE_KEY_MAP: Record<Tab, keyof typeof emptyStates> = {
    upcoming: "upcoming",
    past: "completed",
  };

  /* ---------------- appointment card ---------------- */
  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <Avatar className="w-20 h-20">
            <AvatarImage src={appointment.patientId?.profileImage} />
            <AvatarFallback className="bg-green-100 text-green-600 text-lg">
              {appointment.patientId?.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-4">
            <div className="flex justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {appointment.patientId?.name}
                </h3>
                <p className="text-sm text-gray-600">
                  Age: {appointment.patientId?.age}
                </p>
                <p className="text-sm text-gray-600">
                  {appointment.patientId?.email}
                </p>
              </div>

              <div className="text-right">
                <Badge className={getStatusColor(appointment.status)}>
                  {appointment.status}
                </Badge>
                {isToday(appointment.slotStartIso) && (
                  <div className="text-xs text-green-600 font-semibold mt-1">
                    TODAY
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(appointment.slotStartIso)}
              </div>

              <div className="flex items-center gap-2">
                {appointment.consultationType === "Video Consultation" ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
                {appointment.consultationType}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {canJoinCall(appointment) && (
                <Link href={`/call/${appointment._id}`}>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    <Video className="w-4 h-4 mr-2" />
                    Start Consultation
                  </Button>
                </Link>
              )}

              {canMarkCancelled(appointment) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600"
                  onClick={() => handleMarkCancelled(appointment._id)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Mark Cancelled
                </Button>
              )}

              {appointment.status === "Completed" &&
                (appointment.prescriptionText ||
                  (appointment.documents?.length ?? 0) > 0) && (
                  <PrescriptionViewModal
                    appointment={appointment}
                    userType="doctor"
                    trigger={
                      <Button size="sm" variant="outline">
                        <Stethoscope className="w-4 h-4 mr-2" />
                        View Report
                      </Button>
                    }
                  />
                )}
            </div>

            {appointment.status === "Completed" && (
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  /* ---------------- empty state ---------------- */
  const EmptyState = ({ tab }: { tab: Tab }) => {
    const state = emptyStates[EMPTY_STATE_KEY_MAP[tab]];
    const Icon = state.icon;

    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{state.title}</h3>
          <p className="text-gray-600">{state.description}</p>
        </CardContent>
      </Card>
    );
  };

  /* ---------------- render ---------------- */
  return (
    <>
      <Header showDashboardNav />

      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="container mx-auto px-4 py-6">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              if (value === "upcoming" || value === "past") {
                setActiveTab(value);
              }
            }}
          >
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="upcoming">
                Upcoming ({tabCounts.upcoming})
              </TabsTrigger>
              <TabsTrigger value="past">Past ({tabCounts.past})</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {loading ? null : appointments.length ? (
                appointments.map((apt) => (
                  <AppointmentCard key={apt._id} appointment={apt} />
                ))
              ) : (
                <EmptyState tab="upcoming" />
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {loading ? null : appointments.length ? (
                appointments.map((apt) => (
                  <AppointmentCard key={apt._id} appointment={apt} />
                ))
              ) : (
                <EmptyState tab="past" />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default DoctorAppointmentContent;
