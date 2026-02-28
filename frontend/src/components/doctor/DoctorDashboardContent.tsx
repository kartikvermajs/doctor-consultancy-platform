"use client";
import React, { useEffect, useState } from "react";
import Header from "../landing/Header";
import { useSearchParams } from "next/navigation";
import { userAuthStore } from "@/store/authStore";
import { useDoctorStore } from "@/store/doctorStore";
import { Appointment, useAppointmentStore } from "@/store/appointmentStore";
import {
  Activity,
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  MapPin,
  Phone,
  Plus,
  Star,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import PrescriptionModal from "./PrescriptionModal";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Link from "next/link";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { getStatusColor } from "@/lib/constant";

const DoctorDashboardContent = () => {
  const searchParams = useSearchParams();
  const { user } = userAuthStore();
  const {
    dashboard: dashboardData,
    fetchDashboard,
    loading,
  } = useDoctorStore();

  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [completingAppointmentId, setCompletingAppointmentId] = useState<
    string | null
  >(null);
  const [modalLoading, setModalLoading] = useState(false);
  const { endConsultation, fetchAppointmentById, currentAppointment } =
    useAppointmentStore();

  useEffect(() => {
    if (user?.type === "doctor") {
      fetchDashboard(user?.type);
    }
  }, [user, fetchDashboard]);

  useEffect(() => {
    const completedCallId = searchParams.get("completedCall");
    if (completedCallId) {
      setCompletingAppointmentId(completedCallId);
      fetchAppointmentById(completedCallId);
      setShowPrescriptionModal(true);
    }
  }, [searchParams, fetchAppointmentById]);

  const handleSavePrescription = async (
    prescription: string,
    notes: string,
  ) => {
    if (!completingAppointmentId) return;
    setModalLoading(true);
    try {
      await endConsultation(completingAppointmentId, prescription, notes);
      setShowPrescriptionModal(false);
      setCompletingAppointmentId(null);

      if (user?.type) {
        fetchDashboard(user.type);
      }

      const url = new URL(window.location.href);
      url.searchParams.delete("completedCall");
      window.history.replaceState({}, "", url.pathname);
    } catch (error) {
      console.error("failed to complete consultation", error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowPrescriptionModal(false);
    setCompletingAppointmentId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("completedCall");
    window.history.replaceState({}, "", url.pathname);
  };

  const formateDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const canJoinCall = (appointment: any) => {
    const appointmentTime = new Date(appointment.slotStartIso);
    const now = new Date();
    const diffMintues =
      (appointmentTime.getTime() - now.getTime()) / (1000 * 60);

    return (
      diffMintues <= 15 && //not earliar than 15 min before start
      diffMintues >= -120 && //not later than 2 hours after start
      (appointment.status === "Scheduled" ||
        appointment.status === "In Progress")
    );
  };

  if (loading || !dashboardData) {
    return (
      <>
        <Header showDashboardNav={true} />
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-indigo-50 pt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-8">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gray-300 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-8 bg-gray-300 rounded w-64"></div>
                  <div className="h-4 bg-gray-300 rounded w-48"></div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-300 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const patientName = currentAppointment?.patientId?.name;

  const statsCards = [
    {
      title: "Total Patients",
      value: dashboardData?.stats?.totalPatients?.toString() || "0",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50",
      change: "+12%",
      changeColor: "text-green-600",
    },
    {
      title: "Today's Appointments",
      value: dashboardData?.stats?.todayAppointments?.toString() || "0",
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-green-50",
      change: "+8%",
      changeColor: "text-green-600",
    },
    {
      title: "Total Revenue",
      value: `₹${dashboardData?.stats?.totalRevenue?.toLocaleString() || "0"}`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      change: "+25%",
      changeColor: "text-green-600",
    },
    {
      title: "Completed",
      value: dashboardData?.stats?.completedAppointments?.toString() || "0",
      icon: Activity,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      change: "+18%",
      changeColor: "text-green-600",
    },
  ];

  console.log(dashboardData);
  return (
    <>
      <Header showDashboardNav={true} />

      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-indigo-50 pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 ">
                <Avatar className="w-20 h-20 ring-4 ring-green-100">
                  <AvatarImage
                    src={dashboardData?.user?.profileImage}
                    alt={dashboardData?.user?.name}
                  />
                  <AvatarFallback>
                    {dashboardData?.user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h1 className="text-md md:text-3xl font-bold text-gray-900">
                    Good evening, {dashboardData?.user?.name}
                  </h1>
                  <p className="text-gray-600 text-xs md:text-lg">
                    {dashboardData?.user?.specialization}
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {dashboardData?.user?.hospitalInfo?.name},{" "}
                        {dashboardData?.user?.hospitalInfo?.city}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 fill-orange-400 text-yellow-400" />
                      <span className="text-sm font-semibold text-gray-700">
                        {dashboardData?.stats?.averageRating}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden md:flex items-center space-x-3">
                <Link href="/doctor/profile">
                  <Button className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800">
                    <Plus className="w-4 h-4 mr-2" />
                    Update Availability
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4  gap-6 mb-8">
            {statsCards.map((stat, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        {stat.title}
                      </p>

                      <p className="text-3xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
                        <span
                          className={`text-sm font-medium ${stat.changeColor}`}
                        >
                          {stat.change} from last year
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-14 h-14 ${stat.bgColor} rounded-xl flex items-center justify-center`}
                    >
                      <stat.icon className={`w-7 h-7 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-green-500" />
                  <span>Today's Schedule</span>
                  <Badge variant="secondary" className="ml-2">
                    {dashboardData?.todayAppointments?.length} appointments
                  </Badge>
                </CardTitle>
                <Link href="/doctor/appointments">
                  <Button variant="ghost" size="sm">
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="space-y-4">
                {dashboardData?.todayAppointments?.length > 0 ? (
                  dashboardData?.todayAppointments?.map(
                    (appointment: Appointment) => (
                      <div
                        key={appointment?._id}
                        className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                          <Clock className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900">
                              {appointment?.patientId?.name}
                            </h4>
                            <div className="text-sm font-medium text-green-600 ">
                              {formateDate(appointment.slotStartIso)}
                            </div>
                          </div>

                          <p className="text-sm text-gray-600 line-clamp-1">
                            Age: {appointment?.patientId?.age}
                          </p>

                          <p className="text-sm text-gray-600 line-clamp-1">
                            {appointment?.symptoms?.substring(0, 80) ||
                              "No symptoms provided"}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <Badge
                              className={getStatusColor(appointment.status)}
                            >
                              {appointment.status}
                            </Badge>
                            <div className="flex items-center space-x-1">
                              {appointment.consultationType ===
                              "Video Consultation" ? (
                                <Video className="w-4 h-4 text-green-600" />
                              ) : (
                                <Phone className="w-4 h-4 text-green-600" />
                              )}
                              <span className="text-sm text-gray-500">
                                ₹{appointment.doctorId?.fees}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {canJoinCall(appointment) && (
                            <Link href={`/call/${appointment._id}`}>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Video className="w-4 h-4 mr-2" />
                                Start
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ),
                  )
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No appointment today
                    </h3>
                    <p className="text-gray-600">Enjoy your free day!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-green-500" />
                    <span>Upcoming</span>
                  </CardTitle>
                  <Link href="/doctor/appointments">
                    <Button variant="ghost" size="sm">
                      View All <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardHeader>

                <CardContent className="space-y-4">
                  {dashboardData?.upcomingAppointments?.length > 0 ? (
                    dashboardData?.upcomingAppointments?.map(
                      (appointment: Appointment) => (
                        <div
                          key={appointment?._id}
                          className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage
                              src={appointment.patientId.profileImage}
                            />
                            <AvatarFallback className="bg-green-100 text-green-600 text-sm">
                              {appointment.patientId?.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm truncate">
                              {appointment?.patientId?.name}
                            </h4>
                            <div className="text-sm font-medium text-green-600 ">
                              {formateDate(appointment.slotStartIso)}
                            </div>
                            <div className="flex items-center space-x-1 mt-1">
                              {appointment.consultationType ===
                              "Video Consultation" ? (
                                <Video className="w-4 h-4 text-green-600" />
                              ) : (
                                <Phone className="w-4 h-4 text-green-600" />
                              )}
                              <span className="text-sm text-gray-500">
                                ₹{appointment.doctorId?.fees}
                              </span>
                            </div>
                          </div>
                        </div>
                      ),
                    )
                  ) : (
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-sm text-gray-500">
                        No upcoming appointments
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span>Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Patient Satisfaction
                    </span>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">
                        {dashboardData?.performance?.pateintSatisfaction} / 5
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Completion Rate
                    </span>
                    <span className="font-semibold text-green-600">
                      {dashboardData?.performance?.completionRate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Response Time</span>
                    <span className="font-semibold text-green-600">
                      {dashboardData?.performance?.responseTime}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <PrescriptionModal
        isOpen={showPrescriptionModal}
        onClose={handleCloseModal}
        onSave={handleSavePrescription}
        patientName={patientName}
      />
    </>
  );
};

export default DoctorDashboardContent;
