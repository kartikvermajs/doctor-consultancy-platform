"use client";

import { useState } from "react";
import { FileText, Trash2, Upload, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { postFormWithAuth } from "@/service/httpService";

interface Props {
  appointmentId: string;
  onSuccess: () => void;
}

export default function DeferredUploadDocuments({
  appointmentId,
  onSuccess,
}: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const previews = files.map((file) => ({
    file,
    preview: file.type === "application/pdf" ? null : URL.createObjectURL(file),
  }));

  const removeFile = (index: number) =>
    setFiles((f) => f.filter((_, i) => i !== index));

  const submit = async () => {
    if (!files.length) return;

    const form = new FormData();
    files.forEach((file) => form.append("documents", file));

    setUploading(true);
    try {
      await postFormWithAuth(`/appointments/${appointmentId}/documents`, form);

      setFiles([]);
      onSuccess();
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        multiple
        accept="image/*,.pdf"
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {previews.map(({ file, preview }, i) => (
          <div key={i} className="relative border rounded p-2">
            {preview ? (
              <img src={preview} className="h-24 w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center h-24 justify-center">
                <FileText />
                <span className="text-xs">{file.name}</span>
              </div>
            )}

            <Button
              size="icon"
              variant="destructive"
              className="absolute top-1 right-1"
              onClick={() => removeFile(i)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {files.length > 0 && (
        <Button onClick={submit} disabled={uploading}>
          {uploading ? (
            <>
              <Loader2 className="animate-spin w-4 h-4 mr-2" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Submit Documents
            </>
          )}
        </Button>
      )}
    </div>
  );
}
