


























































import { httpService } from "@/service/httpService";
import { userAuthStore } from "@/store/authStore";
import React, { useEffect, useRef, useState } from "react";
import { Separator } from "../ui/separator";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle,
  CreditCard,
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

  const handlePayment = async () => {
    if (!appointmentId || !patientName) {
      onConfirm();
      return;
    }

    try {
      if (!window.Razorpay) {
        throw new Error("Razorpay SDK not loaded");
      }

      setIsPaymentLoading(true);
      setPaymentStatus("processing");
      setError("");

      const orderResponse = await httpService.postWithAuth(
        "/payment/create-order",
        { appointmentId },
      );

      if (!orderResponse.success) {
        throw new Error(orderResponse.message || "Order creation failed");
      }

      const { orderId, amount, currency, key } = orderResponse.data;

      const options = {
        key,
        amount, 
        currency,
        name: "Doctor Consultation Platform",
        description: `Consultation with Dr. ${doctorName}`,
        order_id: orderId,

        handler: async (response: any) => {
          try {
            const verifyResponse = await httpService.postWithAuth(
              "/payment/verify-payment",
              {
                appointmentId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            );

            if (!verifyResponse.success) {
              throw new Error(
                verifyResponse.message || "Payment verification failed",
              );
            }

            setPaymentStatus("success");

            onPaymentSuccess
              ? onPaymentSuccess(verifyResponse.data)
              : onConfirm();
          } catch (err: any) {
            setError(err.message || "Payment verification failed");
            setPaymentStatus("failed");
          }
        },

        prefill: {
          name: patientName,
          email: user?.email,
          contact: user?.phone,
        },

        notes: {
          appointmentId,
          doctorName,
          patientName,
        },

        theme: {
          color: "#16a34a",
        },

        modal: {
          ondismiss: () => {
            setPaymentStatus("idle");
            setIsPaymentLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      setError(err.message || "Payment failed");
      setPaymentStatus("failed");
    } finally {
      setIsPaymentLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h3 className="text-2xl font-bold">Payment & Confirmation</h3>

      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="font-semibold mb-4">Booking Summary</h4>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Date & Time</span>
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
          <motion.div className="text-center py-8">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-green-600" />
            <p className="mt-4">Processing payment…</p>
            <Progress value={50} />
          </motion.div>
        )}

        {paymentStatus === "success" && (
          <motion.div className="text-center py-8">
            <CheckCircle className="w-14 h-14 mx-auto text-green-600" />
            <p className="mt-4 font-semibold text-green-700">
              Payment Successful
            </p>
          </motion.div>
        )}

        {paymentStatus === "failed" && (
          <motion.div className="text-center py-8">
            <XCircle className="w-14 h-14 mx-auto text-red-600" />
            <p className="mt-4 text-red-600">{error}</p>
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
        <div className="space-y-6">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm border border-blue-200">
            <p className="font-semibold mb-2">Test Mode Credentials:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Fastest Method:</strong> Select <strong>Netbanking</strong> (choose any bank like SBI/HDFC) in the popup. It works instantly with 1 click! (Note: UPI only shows QR codes on desktop now).</li>
              <li><strong>If using Card:</strong> Use Domestic Visa: <strong>4100 2800 0000 1007</strong> or RuPay: <strong>6527 6589 0000 1005</strong></li>
              <li><span className="font-semibold text-red-600">CRITICAL:</span> You MUST uncheck the <strong>"Save card securely"</strong> option before paying, otherwise Razorpay will fail with a tokenization error.</li>
              <li><strong>Success Steps:</strong> Expiry: Any future date | CVV: Any 3 digits | <strong>OTP: Enter 1234 and click Submit/Success!</strong></li>
            </ul>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>

            <Button
              onClick={handlePayment}
              disabled={loading || isPaymentLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay ₹{totalAmount}
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 bg-green-50 p-4 rounded-lg">
        <Shield className="text-green-600" />
        <span>256-bit SSL secured payment</span>
      </div>
    </div>
  );
};

export default PayementStep;
