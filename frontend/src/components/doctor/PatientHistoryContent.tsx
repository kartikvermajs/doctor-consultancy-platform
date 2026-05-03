"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppointmentStore } from "@/store/appointmentStore";
import { userAuthStore } from "@/store/authStore";
import { ArrowLeft, Search, Calendar, FileText, Pill } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import Header from "@/components/landing/Header";

interface Props {
  patientId: string;
}

const PatientHistoryContent: React.FC<Props> = ({ patientId }) => {
  const router = useRouter();
  const { user } = userAuthStore();
  const { appointments, fetchAppointments, loading, searchPatientPrescriptions } = useAppointmentStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [aiResults, setAiResults] = useState<any[] | null>(null);

  const searchCache = useRef<Record<string, any[]>>({});

  useEffect(() => {
    // If appointments are empty (e.g., page hard refresh), fetch them.
    // We assume the store fetches all appointments for this doctor.
    if (user?.type === "doctor" && appointments.length === 0) {
      fetchAppointments("doctor");
    }
  }, [user, appointments.length, fetchAppointments]);

  const patientHistory = useMemo(() => {
    return appointments
      .filter((apt) => apt.patientId?._id === patientId && apt.status === "Completed")
      .sort((a, b) => new Date(b.slotStartIso).getTime() - new Date(a.slotStartIso).getTime());
  }, [appointments, patientId]);

  const filteredHistory = useMemo(() => {
    if (!searchQuery) return patientHistory;
    if (aiResults) return aiResults;

    const lowerQuery = searchQuery.toLowerCase();
    return patientHistory.filter(
      (apt) =>
        apt.prescriptionText?.toLowerCase().includes(lowerQuery) ||
        apt.notes?.toLowerCase().includes(lowerQuery) ||
        apt.symptoms?.toLowerCase().includes(lowerQuery)
    );
  }, [patientHistory, searchQuery, aiResults]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setAiResults(null);
      setIsSearching(false);
      return;
    }

    const trimmedQuery = searchQuery.trim();
    if (searchCache.current[trimmedQuery]) {
      setAiResults(searchCache.current[trimmedQuery]);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchPatientPrescriptions(patientId, trimmedQuery);
        searchCache.current[trimmedQuery] = results;

        if (searchQuery.trim() === trimmedQuery) {
          setAiResults(results);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (searchQuery.trim() === trimmedQuery) {
          setIsSearching(false);
        }
      }
    }, 400); 

    return () => clearTimeout(timeoutId);
  }, [searchQuery, patientId, searchPatientPrescriptions]);

  const patientInfo = patientHistory.length > 0 ? patientHistory[0].patientId : null;

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const parseMedicines = (text: string) => {
    if (!text) return [];

    return text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
  };

  return (
    <>
      <Header showDashboardNav />

      <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">

        {loading && !patientInfo ? (
          <div className="mb-8">
            <div className="flex items-center gap-4 animate-pulse">
              <div className="w-16 h-16 bg-gray-200 rounded-full" />
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-48" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
            </div>
          </div>
        ) : patientInfo ? (
          <div className="mb-8 flex items-center gap-4">
            <Avatar className="w-16 h-16 ring-4 ring-white shadow-sm">
              <AvatarImage src={patientInfo.profileImage} />
              <AvatarFallback className="bg-green-100 text-green-700 text-xl font-medium">
                {patientInfo.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{patientInfo.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {patientInfo.age ? `${patientInfo.age} yrs • ` : ""}
                {patientInfo.email}
              </p>
            </div>
          </div>
        ) : null}

        {/* Semantic Search Bar */}
        <div className="mb-10 flex items-center gap-4 max-w-3xl mx-auto">

          <button
            onClick={() => router.push("/doctor/appointments?tab=past")}
            className="p-3 bg-white rounded-full border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all text-gray-600 hover:text-gray-900 shrink-0"
            title="Back to Appointments"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          <Input
            type="text"
            placeholder="Search prescriptions, symptoms, medicines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-24 py-6 rounded-full border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md focus:shadow-md focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-base"
          />
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
               <span className="text-[10px] font-medium tracking-wider text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 uppercase">
                 AI Search
               </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 px-1">Prescription History</h2>

          {(loading && patientHistory.length === 0) || isSearching ? (
            <div className="space-y-4">
               {[1, 2, 3].map((i) => (
                 <Card key={i} className="animate-pulse">
                   <CardContent className="p-6">
                     <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
                     <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                     <div className="h-4 bg-gray-200 rounded w-3/4" />
                   </CardContent>
                 </Card>
               ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No prescriptions found</h3>
              <p className="text-gray-500 mt-1 max-w-sm mx-auto text-sm">
                {searchQuery 
                  ? "We couldn't find anything matching your search. Try adjusting your keywords." 
                  : "This patient doesn't have any past prescriptions on record yet."}
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-gray-100 ml-4 md:ml-6 space-y-8 pb-10">
              {filteredHistory.map((apt) => (
                <div key={apt._id} className="relative pl-6 md:pl-8 group">

                  <div className="absolute w-4 h-4 bg-white border-2 border-green-500 rounded-full -left-[9px] top-5 group-hover:scale-125 group-hover:bg-green-50 transition-all shadow-sm" />

                  <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden bg-white/90 backdrop-blur-sm">
                    <CardContent className="p-0">

                      <div className="bg-gray-50/80 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center text-sm font-medium text-gray-700">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {formatDate(apt.slotStartIso)}
                        </div>
                        {apt.consultationType && (
                           <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">
                             {apt.consultationType}
                           </span>
                        )}
                      </div>

                      <div className="p-5 md:p-6 space-y-5">

                        {(apt.symptoms || apt.notes) && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Diagnosis & Notes</h4>
                            <p className="text-sm text-gray-700 leading-relaxed bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                              {apt.notes || apt.symptoms}
                            </p>
                          </div>
                        )}

                        {apt.prescriptionText && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                              <Pill className="w-3.5 h-3.5 mr-1" /> Prescribed Medicines
                            </h4>
                            <ul className="space-y-2 mt-2">
                              {parseMedicines(apt.prescriptionText).map((med, idx) => (
                                <li key={idx} className="flex items-start text-sm text-gray-800 bg-white border border-gray-100 shadow-sm rounded-lg p-3">
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 mr-3 shrink-0" />
                                  <span className="leading-relaxed">{med}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {!apt.prescriptionText && !apt.symptoms && !apt.notes && (
                           <p className="text-sm text-gray-400 italic">No detailed records available for this session.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      </div>
    </>
  );
};

export default PatientHistoryContent;
