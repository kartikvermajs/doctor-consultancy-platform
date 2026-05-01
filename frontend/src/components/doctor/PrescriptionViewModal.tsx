"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Appointment, useAppointmentStore } from "@/store/appointmentStore";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Check,
  Copy,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { postFormWithAuth, deleteWithAuth, postWithAuth } from "@/service/httpService";
import { useUploadThing } from "@/lib/uploadthing";

const isPdf = (mimetype?: string, url?: string): boolean => {
  if (mimetype) return mimetype === "application/pdf";
  
  return url?.includes("/raw/upload/") ?? false;
};

const buildDownloadUrl = (url: string): string => {
  if (url.includes("cloudinary.com")) {
    return url.replace("/upload/", "/upload/fl_attachment/");
  }
  
  return url;
};

const getFilename = (url: string, key?: string): string => {
  try {
    const raw = key ?? decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "document");
    
    return raw.replace(/^\d+-/, "");
  } catch {
    return "document";
  }
};

interface PrescriptionViewModalProps {
  appointment: Appointment;
  userType: "doctor" | "patient";
  trigger: React.ReactNode;
  _forceOpen?: boolean;
  onForceClose?: () => void;
}

interface LightboxDoc {
  url: string;
  key: string;
  mimetype?: string;
}

const Lightbox = ({
  doc,
  onClose,
}: {
  doc: LightboxDoc;
  onClose: () => void;
}) => {
  const isDocPdf = isPdf(doc.mimetype, doc.url);
  const filename = getFilename(doc.url, doc.key);

  
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {}
      <div
        className="flex items-center justify-between px-6 py-3 bg-black/60 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-white text-sm font-medium truncate max-w-xs">
          {filename}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={buildDownloadUrl(doc.url)}
            download={filename}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="outline"
              className="border-white/30 text-white bg-white/10 hover:bg-white/20"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </a>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden p-4"
        onClick={onClose}
      >
        {isDocPdf ? (
          <iframe
            src={doc.url}
            title={filename}
            className="w-full max-w-4xl h-full rounded-lg border border-white/10 bg-white"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          
          <img
            src={doc.url}
            alt={filename}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </div>
  );
};

const DocCard = ({
  doc,
  userType,
  deleting,
  onPreview,
  onDelete,
}: {
  doc: { url: string; key: string; mimetype?: string; type: string };
  userType: "doctor" | "patient";
  deleting: boolean;
  onPreview: () => void;
  onDelete: () => void;
}) => {
  const docIsPdf = isPdf(doc.mimetype, doc.url);
  const filename = getFilename(doc.url, doc.key);
  const downloadUrl = buildDownloadUrl(doc.url);

  return (
    <div className="group relative flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200">
      {}
      <div
        className="relative h-32 bg-gray-50 flex items-center justify-center cursor-pointer overflow-hidden"
        onClick={onPreview}
        title="Click to preview"
      >
        {docIsPdf ? (
          <div className="flex flex-col items-center gap-2 text-red-500">
            <FileText className="w-10 h-10" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              PDF
            </span>
          </div>
        ) : (
          
          <img
            src={doc.url}
            alt={filename}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        )}

        {}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Eye className="w-7 h-7 text-white drop-shadow" />
        </div>
      </div>

      {}
      <div className="px-3 py-2 flex-1 min-w-0">
        <p className="text-xs text-gray-600 truncate" title={filename}>
          {filename}
        </p>
      </div>

      {}
      <div className="px-3 pb-3 flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-7 gap-1"
          onClick={onPreview}
        >
          <Eye className="w-3 h-3" />
          Preview
        </Button>

        <a
          href={downloadUrl}
          download={filename}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1"
        >
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs h-7 gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Download className="w-3 h-3" />
            Download
          </Button>
        </a>

        {}
        {userType === "doctor" && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
            onClick={onDelete}
            disabled={deleting}
            title="Delete document"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

const PrescriptionViewModal = ({
  appointment,
  userType,
  trigger,
  _forceOpen,
  onForceClose,
}: PrescriptionViewModalProps) => {
  const [isOpen, setIsOpen] = useState(_forceOpen ?? false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (_forceOpen !== undefined) setIsOpen(_forceOpen);
  }, [_forceOpen]);

  const handleClose = () => {
    setIsOpen(false);
    onForceClose?.();
  };

  
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [pdfUploadProgress, setPdfUploadProgress] = useState<Record<string, number>>({});

  
  const [lightboxDoc, setLightboxDoc] = useState<LightboxDoc | null>(null);

  const { fetchAppointmentById } = useAppointmentStore();

  
  const { startUpload: startPdfUpload, isUploading: utUploading } = useUploadThing(
    "prescriptionPdf",
    {
      headers: () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        return { Authorization: `Bearer ${token ?? ""}` };
      },
      onUploadProgress: (p) => {
        setPdfUploadProgress((prev) => ({ ...prev, progress: p }));
      },
    }
  );

  const documents = appointment.documents ?? [];
  const otherUser =
    userType === "doctor" ? appointment.patientId : appointment.doctorId;

  

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

  const removePdfFile = (index: number) =>
    setPdfFiles((prev) => prev.filter((_, i) => i !== index));

  const removeImageFile = (index: number) =>
    setImageFiles((prev) => prev.filter((_, i) => i !== index));

  const closeLightbox = useCallback(() => setLightboxDoc(null), []);

  
  const submitPdfUpload = async () => {
    if (!pdfFiles.length) return;
    setUploadingPdf(true);
    try {
      const results = await startPdfUpload(pdfFiles);
      if (!results?.length) throw new Error("UploadThing returned no results");

      
      await Promise.all(
        results.map((file) =>
          postWithAuth(`/appointments/${appointment._id}/documents/register`, {
            url: file.url,
            key: file.key,
            name: file.name,
            mimetype: "application/pdf",
          })
        )
      );

      setPdfFiles([]);
      setPdfUploadProgress({});
      await fetchAppointmentById(appointment._id);
    } catch (err) {
      console.error("PDF upload failed:", err);
      alert("PDF upload failed. Please try again.");
    } finally {
      setUploadingPdf(false);
    }
  };

  
  const submitImageUpload = async () => {
    if (!imageFiles.length) return;
    const form = new FormData();
    imageFiles.forEach((file) => form.append("documents", file));
    setUploadingImage(true);
    try {
      await postFormWithAuth(`/appointments/${appointment._id}/documents`, form);
      setImageFiles([]);
      await fetchAppointmentById(appointment._id);
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Image upload failed. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  

  const confirmDelete = async (key: string) => {
    const ok = confirm("Delete this document permanently?");
    if (!ok) return;

    setDeletingKey(key);
    try {
      await deleteWithAuth(`/appointments/${appointment._id}/documents/${key}`);
      await fetchAppointmentById(appointment._id);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed. Please try again.");
    } finally {
      setDeletingKey(null);
    }
  };

  

  const localPdfPreviews = pdfFiles.map((file) => ({ file }));

  const localImagePreviews = imageFiles.map((file) => ({
    file,
    preview: URL.createObjectURL(file),
  }));

  

  return (
    <>
      {}
      <span onClick={() => setIsOpen(true)} className="cursor-pointer">
        {trigger}
      </span>

      {}
      {lightboxDoc && <Lightbox doc={lightboxDoc} onClose={closeLightbox} />}

      {}
      {isOpen && (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
          <Card className="w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl border-0">
            {}
            <CardHeader className="flex flex-row justify-between items-center border-b bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Prescription &amp; Documents
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDate(appointment.slotStartIso)} ·{" "}
                    {appointment.consultationType}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {appointment.prescriptionText && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(appointment.prescriptionText)
                    }
                    className="gap-1"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Rx
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-semibold text-gray-900">
                    {otherUser?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {userType === "patient"
                      ? otherUser?.specialization
                      : `Age: ${otherUser?.age ?? "—"}`}
                  </p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>{formatDate(appointment.slotStartIso)}</p>
                  <p>{appointment.consultationType}</p>
                </div>
              </div>

              {}
              {appointment.prescriptionText && (
                <div className="border border-green-200 bg-green-50 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-100/70 border-b border-green-200">
                    <FileText className="w-4 h-4 text-green-700" />
                    <h3 className="font-semibold text-green-900 text-sm">
                      Prescription
                    </h3>
                  </div>
                  <pre className="p-4 text-sm whitespace-pre-wrap font-mono text-gray-800 bg-white/60">
                    {appointment.prescriptionText}
                  </pre>
                </div>
              )}

              {}
              {appointment.notes && (
                <div className="border border-gray-200 bg-gray-50 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-700 text-sm">
                      Doctor&apos;s Notes
                    </h3>
                  </div>
                  <p className="p-4 text-sm whitespace-pre-wrap text-gray-700">
                    {appointment.notes}
                  </p>
                </div>
              )}

              {}
              {documents.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      Attached Documents
                      <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {documents.length}
                      </span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {documents.map((doc) => (
                      <DocCard
                        key={doc.key}
                        doc={doc}
                        userType={userType}
                        deleting={deletingKey === doc.key}
                        onPreview={() =>
                          setLightboxDoc({
                            url: doc.url,
                            key: doc.key,
                            mimetype: doc.mimetype,
                          })
                        }
                        onDelete={() => confirmDelete(doc.key)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {}
              {documents.length === 0 && !appointment.prescriptionText && !appointment.notes && (
                <div className="text-center py-10 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No prescription or documents yet.</p>
                </div>
              )}

              {}
              {userType === "doctor" && (
                <div className="border-t pt-5 space-y-6">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Documents
                  </h3>

                  {}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">PDFs</span>
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        via UploadThing
                      </span>
                    </div>

                    <label className="border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-xl p-5 flex flex-col items-center justify-center text-sm text-gray-500 cursor-pointer transition-colors duration-200 bg-blue-50/30 hover:bg-blue-50/60">
                      <FileText className="w-6 h-6 mb-2 text-blue-500" />
                      <span className="font-medium">Click to select PDF files</span>
                      <span className="text-xs text-gray-400 mt-1">PDF · Max 16 MB per file · Up to 5 files</span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={(e) => setPdfFiles(Array.from(e.target.files || []))}
                        disabled={uploadingPdf || utUploading}
                      />
                    </label>

                    {}
                    {localPdfPreviews.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {localPdfPreviews.map(({ file }, i) => (
                          <div
                            key={i}
                            className="relative border border-blue-200 rounded-xl overflow-hidden bg-white shadow-sm"
                          >
                            <div className="h-20 bg-blue-50 flex flex-col items-center justify-center gap-1">
                              <FileText className="w-7 h-7 text-blue-500" />
                              <span className="text-xs text-blue-600 font-medium">PDF</span>
                            </div>
                            <div className="px-2 py-1">
                              <p className="text-xs text-gray-500 truncate">{file.name}</p>
                              <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                            </div>
                            <button
                              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors"
                              onClick={() => removePdfFile(i)}
                              disabled={uploadingPdf}
                              type="button"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {}
                    {(uploadingPdf || utUploading) && (
                      <div className="w-full bg-blue-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${(pdfUploadProgress as any).progress ?? 30}%` }}
                        />
                      </div>
                    )}

                    {pdfFiles.length > 0 && (
                      <Button
                        onClick={submitPdfUpload}
                        disabled={uploadingPdf || utUploading}
                        className="bg-blue-600 hover:bg-blue-700 gap-2"
                      >
                        {uploadingPdf || utUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading PDF{pdfFiles.length > 1 ? "s" : ""}…
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload {pdfFiles.length} PDF{pdfFiles.length > 1 ? "s" : ""}
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Images</span>
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                        via Cloudinary
                      </span>
                    </div>

                    <label className="border-2 border-dashed border-gray-200 hover:border-green-400 rounded-xl p-5 flex flex-col items-center justify-center text-sm text-gray-500 cursor-pointer transition-colors duration-200 bg-gray-50 hover:bg-green-50/30">
                      <ImageIcon className="w-6 h-6 mb-2 text-green-500" />
                      <span className="font-medium">Click to select images</span>
                      <span className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP · Max 10 MB per file</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
                        disabled={uploadingImage}
                      />
                    </label>

                    {}
                    {localImagePreviews.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {localImagePreviews.map(({ file, preview }, i) => (
                          <div
                            key={i}
                            className="relative border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm"
                          >
                            <div className="h-24 bg-gray-50">
                              {}
                              <img
                                src={preview}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="px-2 py-1">
                              <p className="text-xs text-gray-500 truncate">{file.name}</p>
                            </div>
                            <button
                              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors"
                              onClick={() => removeImageFile(i)}
                              disabled={uploadingImage}
                              type="button"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {imageFiles.length > 0 && (
                      <Button
                        onClick={submitImageUpload}
                        disabled={uploadingImage}
                        className="bg-green-600 hover:bg-green-700 gap-2"
                      >
                        {uploadingImage ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading image{imageFiles.length > 1 ? "s" : ""}…
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Upload {imageFiles.length} image{imageFiles.length > 1 ? "s" : ""}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
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
