































































"use client";

import React, { useEffect, useMemo, useState } from "react";
import Header from "../landing/Header";
import FloatingChatWidget from "../shared/FloatingChatWidget";
import { userAuthStore } from "@/store/authStore";
import { Appointment, useAppointmentStore } from "@/store/appointmentStore";
import { Card, CardContent } from "../ui/card";
import Link from "next/link";
import { Button } from "../ui/button";
import {
  Calendar,
  Clock,
  FileText,
  MapPin,
  Phone,
  Star,
  Video,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { getStatusColor } from "@/lib/constant";
import PrescriptionViewModal from "../doctor/PrescriptionViewModal";
import ReviewModal from "./ReviewModal";
import DoctorReviewModal from "./DoctorReviewModal";
import { Doctor } from "@/lib/types";

type Tab = "upcoming" | "past";

const PatientDashboardContent = () => {
  const { user } = userAuthStore();
  const { appointments, fetchAppointments, loading } = useAppointmentStore();

  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [reviewDoctor, setReviewDoctor] = useState<Partial<Doctor> | null>(null);

  
  useEffect(() => {
    if (user?.type === "patient") {
      fetchAppointments("patient");
    }
  }, [user, fetchAppointments]);

  
  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return appointments.filter((apt) => {
      const start = new Date(apt.slotStartIso);
      return (
        (start >= now || apt.status === "In Progress") &&
        (apt.status === "Scheduled" || apt.status === "In Progress")
      );
    });
  }, [appointments]);

  const pastAppointments = useMemo(() => {
    const now = new Date();
    return appointments.filter((apt) => {
      const start = new Date(apt.slotStartIso);
      return (
        start < now || apt.status === "Completed" || apt.status === "Cancelled"
      );
    });
  }, [appointments]);

  
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
    return ["Scheduled", "In Progress"].includes(appointment.status);
  };

  if (!user) return null;

  
  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Clickable avatar */}
          <button
            onClick={() =>
              setReviewDoctor({
                _id: appointment.doctorId?._id,
                name: appointment.doctorId?.name,
                profileImage: appointment.doctorId?.profileImage,
                specialization: appointment.doctorId?.specialization,
                avgRating: null,
                totalReviews: 0,
              } as Partial<Doctor>)
            }
            className="shrink-0 focus:outline-none"
            title="View reviews"
          >
            <Avatar className="w-20 h-20 hover:ring-2 hover:ring-green-400 transition-all cursor-pointer">
              <AvatarImage src={appointment.doctorId?.profileImage} />
              <AvatarFallback className="bg-green-100 text-green-600 text-lg">
                {appointment.doctorId?.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </button>

          <div className="flex-1 space-y-4">
            <div className="flex justify-between">
              <div>
                <button
                  onClick={() =>
                    setReviewDoctor({
                      _id: appointment.doctorId?._id,
                      name: appointment.doctorId?.name,
                      profileImage: appointment.doctorId?.profileImage,
                      specialization: appointment.doctorId?.specialization,
                      avgRating: null,
                      totalReviews: 0,
                    } as Partial<Doctor>)
                  }
                  className="text-lg font-semibold hover:text-green-600 transition-colors text-left"
                >
                  {appointment.doctorId?.name}
                </button>
                <p className="text-sm text-gray-600">
                  {appointment.doctorId?.specialization}
                </p>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-3 h-3" />
                  {appointment.doctorId?.hospitalInfo?.name}
                </div>
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
                    Join Call
                  </Button>
                </Link>
              )}
              {appointment.status === "Completed" &&
                (appointment.prescriptionText ||
                  (appointment.documents?.length ?? 0) > 0) && (
                  <PrescriptionViewModal
                    appointment={appointment}
                    userType="patient"
                    trigger={
                      <Button size="sm" variant="outline">
                        <FileText className="w-4 h-4 mr-2" />
                        View Prescription
                      </Button>
                    }
                  />
                )}
              {}
              {appointment.status === "Completed" && (
                <ReviewModal
                  appointment={appointment}
                  trigger={
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 gap-1"
                    >
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      Rate Doctor
                    </Button>
                  }
                />
              )}
            </div>


          </div>
        </div>
      </CardContent>
    </Card>
  );

  
  const EmptyState = ({ tab }: { tab: Tab }) => {
    const config = {
      upcoming: {
        icon: Clock,
        title: "No Upcoming Appointments",
        description: "You have no upcoming appointments scheduled.",
        showBook: true,
      },
      past: {
        icon: FileText,
        title: "No Past Appointments",
        description: "Your completed consultations will appear here.",
        showBook: false,
      },
    } as const;

    const state = config[tab];
    const Icon = state.icon;

    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{state.title}</h3>
          <p className="text-gray-600 mb-6">{state.description}</p>

          {state.showBook && (
            <Link href="/doctor-list">
              <Button>
                <Calendar className="w-4 h-4 mr-2" />
                Book Your First Appointment
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  };

  
  return (
    <>
      <Header showDashboardNav />

      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="container mx-auto px-4 py-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              if (v === "upcoming" || v === "past") setActiveTab(v);
            }}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">
                Upcoming ({upcomingAppointments.length})
              </TabsTrigger>
              <TabsTrigger value="past">
                Past ({pastAppointments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {loading ? null : upcomingAppointments.length ? (
                upcomingAppointments.map((apt) => (
                  <AppointmentCard key={apt._id} appointment={apt} />
                ))
              ) : (
                <EmptyState tab="upcoming" />
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {loading ? null : pastAppointments.length ? (
                pastAppointments.map((apt) => (
                  <AppointmentCard key={apt._id} appointment={apt} />
                ))
              ) : (
                <EmptyState tab="past" />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <FloatingChatWidget />

      {/* ── Doctor review modal ── */}
      <DoctorReviewModal
        doctor={reviewDoctor as Doctor | null}
        open={!!reviewDoctor}
        onClose={() => setReviewDoctor(null)}
      />
    </>
  );
};

export default PatientDashboardContent;
