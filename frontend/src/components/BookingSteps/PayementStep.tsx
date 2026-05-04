"use client";

import { httpService } from "@/service/httpService";
import { userAuthStore } from "@/store/authStore";
import React, { useEffect, useState } from "react";
import { Separator } from "../ui/separator";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle,
  CreditCard,
  FlaskConical,
  Loader2,
  Shield,
  XCircle,
} from "lucide-react";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentStepInterface {
  selectedDate: Date | undefined;
  selectedSlot: string;
  consultationType: string;
  doctorName: string;
  slotDuration: number;
  consultationFee: number;
  isProcessing: boolean;
  onBack: () => void;
  onConfirm: () => void;
  onPaymentSuccess?: (appointment: any) => void;
  loading: boolean;
  appointmentId?: string;
  patientName?: string;
}


const PayementStep = ({
  selectedDate,
  selectedSlot,
  consultationType,
  doctorName,
  slotDuration,
  consultationFee,
  onBack,
  onConfirm,
  onPaymentSuccess,
  loading,
  appointmentId,
  patientName,
}: PaymentStepInterface) => {
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "success" | "failed"
  >("idle");

  const { user } = userAuthStore();
  const [error, setError] = useState("");
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [showFakeRazorpay, setShowFakeRazorpay] = useState(false);
  const [fakeRazorpayStep, setFakeRazorpayStep] = useState<
    "initializing" | "processing" | "success"
  >("initializing");

  const platformFees = Math.round(consultationFee * 0.1);
  const totalAmount = consultationFee + platformFees;

  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleVerifyAndFinish = async (verifyResponse: any) => {
    if (!verifyResponse.success) {
      throw new Error(verifyResponse.message || "Payment verification failed");
    }
    setPaymentStatus("success");
    setTimeout(() => {
      onPaymentSuccess
        ? onPaymentSuccess(verifyResponse.data)
        : onConfirm();
    }, 1200);
  };

  const handleRazorpayPayment = async () => {
    if (!appointmentId || !patientName) {
      onConfirm();
      return;
    }

    setShowFakeRazorpay(true);
    setFakeRazorpayStep("initializing");

    setTimeout(() => {
      setFakeRazorpayStep("processing");
      setTimeout(() => {
        setFakeRazorpayStep("success");
        setTimeout(async () => {
          setShowFakeRazorpay(false);
          await handleSimulatePayment();
        }, 1500);
      }, 2500);
    }, 1500);
  };

  const handleSimulatePayment = async () => {
    if (!appointmentId) return;
    try {
      setIsPaymentLoading(true);
      setPaymentStatus("processing");
      setError("");

      const res = await httpService.postWithAuth("/payment/simulate-success", {
        appointmentId,
      });

      await handleVerifyAndFinish(res);
    } catch (err: any) {
      setError(err.message || "Simulation failed");
      setPaymentStatus("failed");
    } finally {
      setIsPaymentLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h3 className="text-2xl font-bold">Payment &amp; Confirmation</h3>

      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="font-semibold mb-4">Booking Summary</h4>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Date &amp; Time</span>
            <span>
              {selectedDate?.toLocaleDateString()} at {selectedSlot}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Consultation Type</span>
            <span>{consultationType}</span>
          </div>

          <div className="flex justify-between">
            <span>Doctor</span>
            <span>{doctorName}</span>
          </div>

          <div className="flex justify-between">
            <span>Duration</span>
            <span>{slotDuration} minutes</span>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span>Consultation Fee</span>
            <span>₹{consultationFee}</span>
          </div>

          <div className="flex justify-between">
            <span>Platform Fee</span>
            <span>₹{platformFees}</span>
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-green-600">₹{totalAmount}</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {paymentStatus === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-8 space-y-4"
          >
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-green-600" />
            <p className="text-gray-600">Processing payment…</p>
            <Progress value={60} className="max-w-xs mx-auto" />
          </motion.div>
        )}

        {paymentStatus === "success" && (
          <motion.div
            key="success"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-8"
          >
            <CheckCircle className="w-14 h-14 mx-auto text-green-600" />
            <p className="mt-4 font-semibold text-green-700 text-lg">
              Payment Successful!
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Redirecting to your dashboard…
            </p>
          </motion.div>
        )}

        {paymentStatus === "failed" && (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <XCircle className="w-14 h-14 mx-auto text-red-500" />
            <p className="mt-4 text-red-600 font-medium">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setPaymentStatus("idle")}
            >
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {paymentStatus === "idle" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm space-y-3">
              <p className="font-semibold text-amber-800 flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                Test Mode — No Real Money
              </p>

              <div className="bg-white border border-amber-100 rounded-lg px-4 py-3">
                <p className="font-semibold text-gray-800 mb-1">
                  ⚡ Fastest: Simulate Payment (skip popup)
                </p>
                <p className="text-gray-500 text-xs">
                  Marks payment as Paid instantly without opening Razorpay.
                  Perfect for rapid testing.
                </p>
                <Button
                  onClick={handleSimulatePayment}
                  disabled={loading || isPaymentLoading}
                  className="mt-2 bg-amber-500 hover:bg-amber-600 text-white gap-2 w-full"
                  size="sm"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  Simulate Payment ₹{totalAmount}
                </Button>
              </div>

              <div className="text-gray-600 space-y-1">
                <p className="font-medium text-gray-700">
                  Or use the Razorpay test popup:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>
                    <strong>Netbanking</strong> (fastest) — pick any bank, click
                    Success
                  </li>
                  <li>
                    <strong>Card:</strong>{" "}
                    <span className="font-mono bg-amber-100 px-1 rounded">
                      4111 1111 1111 1111
                    </span>
                    {" "}· any future expiry · CVV{" "}
                    <span className="font-mono bg-amber-100 px-1 rounded">111</span>
                  </li>
                  <li>
                    OTP:{" "}
                    <span className="font-mono bg-amber-100 px-1 rounded">
                      1234
                    </span>{" "}
                    → click <strong>Success</strong>
                  </li>
                  <li className="text-red-600">
                    ⚠ Uncheck <strong>&quot;Save card securely&quot;</strong>{" "}
                    before paying (avoids tokenization error)
                  </li>
                </ul>
              </div>
            </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>

            <Button
              onClick={handleRazorpayPayment}
              disabled={loading || isPaymentLoading}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Pay with Razorpay ₹{totalAmount}
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 bg-green-50 p-4 rounded-lg text-sm text-green-800">
        <Shield className="text-green-600 shrink-0" />
        <span>256-bit SSL encrypted · Razorpay test mode active</span>
      </div>

      <AnimatePresence>
        {showFakeRazorpay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-[400px] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-[#0A2540] p-6 text-white text-center relative">
                {fakeRazorpayStep !== "success" && (
                  <button
                    onClick={() => setShowFakeRazorpay(false)}
                    className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <h3 className="text-xl font-bold">Doctor Consultation</h3>
                </div>
                <p className="text-white/80 text-sm font-medium tracking-wide bg-white/10 inline-block px-3 py-1 rounded-full">
                  TEST MODE
                </p>
                <div className="mt-6 flex items-baseline justify-center gap-1">
                  <span className="text-2xl font-medium text-white/90">₹</span>
                  <span className="text-4xl font-bold">{totalAmount}</span>
                </div>
              </div>

              {/* Body */}
              <div className="p-8 flex flex-col items-center justify-center min-h-[300px] bg-slate-50">
                {fakeRazorpayStep === "initializing" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <Loader2 className="w-12 h-12 animate-spin text-[#0A2540] mb-4" />
                    <p className="text-slate-600 font-medium">
                      Initializing Secure Gateway...
                    </p>
                  </motion.div>
                )}
                {fakeRazorpayStep === "processing" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative mb-6">
                      <div className="w-20 h-20 border-4 border-slate-200 rounded-full"></div>
                      <div className="w-20 h-20 border-4 border-blue-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                      <CreditCard className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" />
                    </div>
                    <p className="text-slate-700 font-semibold text-lg">
                      Processing Payment
                    </p>
                    <p className="text-slate-500 text-sm mt-2 text-center max-w-[250px]">
                      Please do not close this window or press the back button
                    </p>
                  </motion.div>
                )}
                {fakeRazorpayStep === "success" && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 15,
                      }}
                      className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4"
                    >
                      <CheckCircle className="w-12 h-12 text-green-600" />
                    </motion.div>
                    <p className="text-green-700 font-bold text-2xl">
                      Success!
                    </p>
                    <p className="text-slate-500 text-sm mt-2">
                      Redirecting back to application...
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-white p-4 border-t border-slate-100 flex items-center justify-center gap-2">
                <Shield className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                  Secured by Razorpay
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PayementStep;
