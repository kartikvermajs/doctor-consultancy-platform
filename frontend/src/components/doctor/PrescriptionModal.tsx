"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { FileText, Save, X } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

interface PrescriptionModalProps {
  isOpen: boolean;
  patientName: string;
  loading?: boolean;

  onClose: () => void;
  onSave: (prescription: string, notes: string) => Promise<void>;
}

const PrescriptionModal = ({
  isOpen,
  patientName,
  onClose,
  onSave,
  loading,
}: PrescriptionModalProps) => {
  const [prescription, setPrescription] = useState("");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSave = async () => {
    await onSave(prescription, notes);
    setPrescription("");
    setNotes("");
  };

  const handleClose = () => {
    setPrescription("");
    setNotes("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            <CardTitle>Complete Consultation</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-900">
              Confirm Consultation Completion
            </h3>
            <p className="text-sm text-green-700">
              Are you sure you want to complete the consultation with{" "}
              <strong>{patientName}</strong>?
            </p>
          </div>

          {/* Prescription */}
          <div className="space-y-2">
            <Label>Prescription *</Label>
            <Textarea
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              rows={6}
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!prescription.trim() || loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save & Complete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrescriptionModal;
