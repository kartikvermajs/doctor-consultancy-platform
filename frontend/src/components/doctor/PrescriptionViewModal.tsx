// "use client";

// import React, { useState } from "react";
// import { Appointment, useAppointmentStore } from "@/store/appointmentStore";
// import { UploadButton } from "@/lib/uploadthing";
// import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
// import { Check, Copy, FileText, Trash2, X, Plus } from "lucide-react";
// import { Button } from "../ui/button";

// interface PrescriptionViewModalProps {
//   appointment: Appointment;
//   userType: "doctor" | "patient";
//   trigger: React.ReactNode;
// }

// const PrescriptionViewModal = ({
//   appointment,
//   userType,
//   trigger,
// }: PrescriptionViewModalProps) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [copied, setCopied] = useState(false);

//   const { uploadDocuments, deleteDocument } = useAppointmentStore();

//   const openModal = () => setIsOpen(true);
//   const closeModal = () => setIsOpen(false);

//   const formatDate = (date: string) =>
//     new Date(date).toLocaleDateString("en-US", {
//       year: "numeric",
//       month: "short",
//       day: "numeric",
//     });

//   const copyToClipboard = async (text?: string) => {
//     if (!text) return;
//     await navigator.clipboard.writeText(text);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2000);
//   };

//   const otherUser =
//     userType === "doctor" ? appointment.patientId : appointment.doctorId;

//   const documents = appointment.documents ?? [];

//   return (
//     <>
//       <span onClick={openModal} className="cursor-pointer">
//         {trigger}
//       </span>

//       {isOpen && (
//         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
//           <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
//             {/* ---------- HEADER ---------- */}
//             <CardHeader className="flex flex-row justify-between items-center">
//               <div className="flex items-center gap-2">
//                 <FileText className="w-5 h-5 text-green-600" />
//                 <CardTitle>Prescription & Reports</CardTitle>
//               </div>

//               <div className="flex gap-2">
//                 {appointment.prescriptionText && (
//                   <Button
//                     variant="outline"
//                     size="sm"
//                     onClick={() =>
//                       copyToClipboard(appointment.prescriptionText)
//                     }
//                   >
//                     {copied ? (
//                       <>
//                         <Check className="w-4 h-4 mr-1" />
//                         Copied
//                       </>
//                     ) : (
//                       <>
//                         <Copy className="w-4 h-4 mr-1" />
//                         Copy
//                       </>
//                     )}
//                   </Button>
//                 )}

//                 <Button variant="ghost" size="sm" onClick={closeModal}>
//                   <X className="w-4 h-4" />
//                 </Button>
//               </div>
//             </CardHeader>

//             {/* ---------- CONTENT ---------- */}
//             <CardContent className="space-y-6">
//               {/* Meta */}
//               <div className="flex justify-between">
//                 <div>
//                   <p className="font-semibold">{otherUser?.name}</p>
//                   <p className="text-sm text-gray-600">
//                     {userType === "patient"
//                       ? otherUser?.specialization
//                       : `Age: ${otherUser?.age}`}
//                   </p>
//                 </div>
//                 <div className="text-right text-sm text-gray-600">
//                   <p>{formatDate(appointment.slotStartIso)}</p>
//                   <p>{appointment.consultationType}</p>
//                 </div>
//               </div>

//               {/* Prescription text */}
//               {appointment.prescriptionText && (
//                 <div className="border border-green-200 bg-green-50 p-4 rounded">
//                   <h3 className="font-semibold mb-2">Prescription</h3>
//                   <pre className="bg-white p-3 rounded border text-sm whitespace-pre-wrap font-mono">
//                     {appointment.prescriptionText}
//                   </pre>
//                 </div>
//               )}

//               {/* Notes */}
//               {appointment.notes && (
//                 <div className="border bg-gray-50 p-4 rounded">
//                   <h3 className="font-semibold mb-2">Notes</h3>
//                   <p className="text-sm whitespace-pre-wrap">
//                     {appointment.notes}
//                   </p>
//                 </div>
//               )}

//               {/* Documents preview */}
//               {documents.length > 0 && (
//                 <div>
//                   <h3 className="font-semibold mb-2">Attached Documents</h3>

//                   <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
//                     {documents.map((doc) => (
//                       <div
//                         key={doc.key}
//                         className="relative border rounded p-2 group"
//                       >
//                         <a
//                           href={doc.url}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                         >
//                           {doc.url.endsWith(".pdf") ? (
//                             <div className="flex flex-col items-center justify-center h-24">
//                               <FileText className="w-8 h-8 text-red-600" />
//                               <span className="text-xs mt-1">PDF</span>
//                             </div>
//                           ) : (
//                             <img
//                               src={doc.url}
//                               alt="document"
//                               className="w-full h-24 object-cover rounded"
//                             />
//                           )}
//                         </a>

//                         {/* Delete – doctor only */}
//                         {userType === "doctor" && (
//                           <Button
//                             size="icon"
//                             variant="destructive"
//                             className="absolute top-1 right-1 opacity-0 group-hover:opacity-100"
//                             onClick={() =>
//                               deleteDocument(appointment._id, doc.key)
//                             }
//                           >
//                             <Trash2 className="w-4 h-4" />
//                           </Button>
//                         )}
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {/* Add documents later – doctor only */}
//               {userType === "doctor" && (
//                 <div className="border-t pt-4">
//                   <h3 className="font-semibold mb-2 flex items-center gap-2">
//                     <Plus className="w-4 h-4" />
//                     Add More Documents
//                   </h3>

//                   <UploadButton
//                     endpoint="medicalDocuments"
//                     headers={{
//                       Authorization: `Bearer ${localStorage.getItem("token")}`,
//                     }}
//                     appearance={{
//                       button:
//                         "w-full flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50",
//                       allowedContent: "hidden",
//                     }}
//                     content={{
//                       button: (
//                         <>
//                           <Plus className="w-4 h-4 mr-2" />
//                           Upload documents
//                         </>
//                       ),
//                     }}
//                     onClientUploadComplete={(res) => {
//                       if (!res?.length) return;

//                       uploadDocuments(
//                         appointment._id,
//                         res.map((f) => ({
//                           url: f.url,
//                           key: f.key,
//                           type: "other",
//                         })),
//                       );
//                     }}
//                     onUploadError={(error) => {
//                       console.error("Upload failed", error);
//                       alert("Upload failed");
//                     }}
//                   />
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </div>
//       )}
//     </>
//   );
// };

// export default PrescriptionViewModal;

"use client";

import React, { useState } from "react";
import { Appointment, useAppointmentStore } from "@/store/appointmentStore";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Check,
  Copy,
  FileText,
  Trash2,
  X,
  Plus,
  Loader2,
  Upload,
} from "lucide-react";
import { Button } from "../ui/button";
import { postFormWithAuth } from "@/service/httpService";

interface PrescriptionViewModalProps {
  appointment: Appointment;
  userType: "doctor" | "patient";
  trigger: React.ReactNode;
}

const PrescriptionViewModal = ({
  appointment,
  userType,
  trigger,
}: PrescriptionViewModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  /* upload state */
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const { fetchAppointmentById } = useAppointmentStore();

  const documents = appointment.documents ?? [];
  const otherUser =
    userType === "doctor" ? appointment.patientId : appointment.doctorId;

  /* ---------------- helpers ---------------- */

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const copyToClipboard = async (text?: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const removeLocalFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /* ---------------- upload ---------------- */

  const submitUpload = async () => {
    if (!files.length) return;

    console.group("[UPLOAD]");
    console.log("Starting upload");
    console.log("Files selected:", files.length);

    const form = new FormData();
    files.forEach((file) => form.append("documents", file));

    setUploading(true);
    try {
      console.log(
        "Sending request to:",
        `/appointments/${appointment._id}/documents`,
      );

      await postFormWithAuth(
        `/appointments/${appointment._id}/documents`,
        form,
      );

      console.log("Upload completed successfully");
      console.log("Refreshing appointment data");

      setFiles([]);
      await fetchAppointmentById(appointment._id);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      console.groupEnd();
    }
  };

  /* ---------------- delete ---------------- */

  const confirmDelete = async (key: string) => {
    const ok = confirm("Delete this document permanently?");
    if (!ok) return;

    setDeletingKey(key);
    try {
      await postFormWithAuth(
        `/appointments/${appointment._id}/documents/${key}`,
        new FormData(),
      );
      await fetchAppointmentById(appointment._id);
    } finally {
      setDeletingKey(null);
    }
  };

  /* ---------------- previews ---------------- */

  const previews = files.map((file) => ({
    file,
    preview: file.type === "application/pdf" ? null : URL.createObjectURL(file),
  }));

  /* ---------------- render ---------------- */

  return (
    <>
      <span onClick={() => setIsOpen(true)} className="cursor-pointer">
        {trigger}
      </span>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                <CardTitle>Prescription & Reports</CardTitle>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Meta */}
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{otherUser?.name}</p>
                  <p className="text-sm text-gray-600">
                    {userType === "patient"
                      ? otherUser?.specialization
                      : `Age: ${otherUser?.age}`}
                  </p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>{formatDate(appointment.slotStartIso)}</p>
                  <p>{appointment.consultationType}</p>
                </div>
              </div>

              {/* Prescription */}
              {appointment.prescriptionText && (
                <div className="border border-green-200 bg-green-50 p-4 rounded">
                  <h3 className="font-semibold mb-2">Prescription</h3>
                  <pre className="bg-white p-3 rounded border text-sm whitespace-pre-wrap font-mono">
                    {appointment.prescriptionText}
                  </pre>
                </div>
              )}

              {/* Notes */}
              {appointment.notes && (
                <div className="border bg-gray-50 p-4 rounded">
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm whitespace-pre-wrap">
                    {appointment.notes}
                  </p>
                </div>
              )}

              {/* Existing documents */}
              {documents.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Attached Documents</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {documents.map((doc) => (
                      <a
                        key={doc.key}
                        href={doc.url}
                        target="_blank"
                        className="border rounded p-2 hover:bg-gray-50 transition"
                      >
                        {doc.url.endsWith(".pdf") ? (
                          <div className="flex flex-col items-center h-24 justify-center">
                            <FileText className="w-8 h-8 text-red-600" />
                            <span className="text-xs mt-1">PDF</span>
                          </div>
                        ) : (
                          <img
                            src={doc.url}
                            className="w-full h-24 object-cover rounded"
                          />
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload section */}
              {userType === "doctor" && (
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add documents
                  </h3>

                  {/* Dropzone */}
                  <label className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-sm text-gray-600 cursor-pointer hover:border-green-500 transition">
                    <Upload className="w-6 h-6 mb-2 text-green-600" />
                    <span>Click to select images or PDFs</span>
                    <span className="text-xs text-gray-400 mt-1">
                      Max 10 MB per file
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) =>
                        setFiles(Array.from(e.target.files || []))
                      }
                      disabled={uploading}
                    />
                  </label>

                  {/* Previews */}
                  {previews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {previews.map(({ file, preview }, i) => (
                        <div key={i} className="relative border rounded p-2">
                          {preview ? (
                            <img
                              src={preview}
                              className="h-24 w-full object-cover rounded"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-24">
                              <FileText />
                              <span className="text-xs">{file.name}</span>
                            </div>
                          )}

                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-1 right-1"
                            onClick={() => removeLocalFile(i)}
                            disabled={uploading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submit */}
                  {files.length > 0 && (
                    <Button
                      onClick={submitUpload}
                      disabled={uploading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Documents
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default PrescriptionViewModal;
