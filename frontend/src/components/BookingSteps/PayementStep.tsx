// import { httpService } from "@/service/httpService";
// import { userAuthStore } from "@/store/authStore";
// import React, { useEffect, useRef, useState } from "react";
// import { Separator } from "../ui/separator";
// import { AnimatePresence, motion } from "framer-motion";
// import { CheckCircle, CreditCard, Loader2, Shield, XCircle } from "lucide-react";
// import { Progress } from "../ui/progress";
// import { Button } from "../ui/button";

// declare global {
//   interface Window {
//     Razorpay: any;
//   }
// }

// interface PaymentStepInterface {
//   selectedDate: Date | undefined;
//   selectedSlot: string;
//   consultationType: string;
//   doctorName: string;
//   slotDuration: number;
//   consultationFee: number;
//   isProcessing: boolean;
//   onBack: () => void;
//   onConfirm: () => void;
//   onPaymentSuccess?: (appointment: any) => void;
//   loading: boolean;
//   appointmentId?: string;
//   patientName?: string;
// }
// const PayementStep = ({
//   selectedDate,
//   selectedSlot,
//   consultationType,
//   doctorName,
//   slotDuration,
//   consultationFee,
//   isProcessing,
//   onBack,
//   onConfirm,
//   onPaymentSuccess,
//   loading,
//   appointmentId,
//   patientName,
// }: PaymentStepInterface) => {
//   const [paymentStatus, setPaymentStatus] = useState<
//     "idle" | "processing" | "success" | "failed"
//   >("idle");
//   const { user } = userAuthStore();
//   const [error, setError] = useState<string>("");
//   const [isPaymentLoading, setIsPaymentLoading] = useState<boolean>(false);
//   const platformFees = Math.round(consultationFee * 0.1);
//   const totalAmount = consultationFee + platformFees;
//   const [shouldAutoOpen,setShouldAutoOpen] = useState(true)
//   const modelCloseCountRef = useRef<number>(0)

//   //Load Razorpay script and auto-trigger payment
//   useEffect(() => {
//     if (appointmentId && patientName && !window.Razorpay) {
//       const script = document.createElement("script");
//       script.src = "https://checkout.razorpay.com/v1/checkout.js";
//       script.async = true;
//       document.body.appendChild(script);
//     }
//   }, [appointmentId, patientName]);

//   useEffect(() => {
//     if(appointmentId && patientName && paymentStatus === 'idle' && !isPaymentLoading && shouldAutoOpen){
//       const timer =setTimeout(() => {
//         handlePayment();
//       },500);
//       return () => clearTimeout(timer)
//     }
//   },[appointmentId,patientName,paymentStatus,isPaymentLoading,shouldAutoOpen])

//   const handlePayment = async () => {
//     if (!appointmentId || !patientName) {
//       onConfirm();
//       return;
//     }

//     try {
//       setIsPaymentLoading(true);
//       setError("");
//       setPaymentStatus("processing");

//       //create paymnet order
//       const orderResponse = await httpService.postWithAuth(
//         "/payment/create-order",
//         { appointmentId }
//       );

//       if (!orderResponse.success) {
//         throw new Error(
//           orderResponse.message || "Failed to create payment order"
//         );
//       }

//       const { orderId, amount, currency, key } = orderResponse.data;

//       //Configure Razorpay options
//       const options = {
//         key: key,
//         amount: amount * 100,
//         currency,
//         name: "Doctor Consultation Platform",
//         description: `Consultation with Dr. ${doctorName}`,
//         order_id: orderId,
//         handler: async (response: any) => {
//           try {
//             const verifyResponse = await httpService.postWithAuth(
//               "/payment/verify-payment",
//               {
//                 appointmentId,
//                 razorpay_order_id: response.razorpay_order_id,
//                 razorpay_payment_id: response.razorpay_payment_id,
//                 razorpay_signature: response.razorpay_signature,
//               }
//             );
//             if (verifyResponse.success) {
//               setPaymentStatus("success");
//               if (onPaymentSuccess) {
//                 onPaymentSuccess(verifyResponse.data);
//               } else {
//                 onConfirm();
//               }
//             } else {
//               throw new Error(
//                 verifyResponse.message || "Paymnet verificatio failed"
//               );
//             }
//           } catch (error: any) {
//             console.error("Payment verification failed", error);
//             setError(error.message || "paymnet failed");
//             setPaymentStatus("failed");
//           }
//         },
//         prefill: {
//           name: patientName,
//           email: user?.email,
//           contact: user?.phone,
//         },
//         notes: {
//           appointmentId,
//           doctorName,
//           patientName,
//         },
//         theme: {
//           color: "#3B82F6",
//         },
//         modal: {
//           ondismiss: () => {
//             setPaymentStatus("idle");
//             setError("");
//             modelCloseCountRef.current +=1;

//             if(modelCloseCountRef.current === 1){
//               setTimeout(() => {
//                 handlePayment();
//               },1000)
//             }else{
//               setShouldAutoOpen(false)
//             }
//           },
//         },
//       };

//       const razorPay = new window.Razorpay(options);
//       razorPay.open();
//     } catch (error: any) {
//       console.error("payment error", error);
//       setError(error.message || "paymnet failed");
//       setPaymentStatus("failed");
//     } finally {
//       setIsPaymentLoading(false);
//     }
//   };

//   const handlePaynow = () => {
//     if (appointmentId && patientName) {
//       modelCloseCountRef.current =0;
//       handlePayment();
//     } else {
//       onConfirm();
//     }
//   };

//   return (
//     <div className="space-y-8">
//       <div>
//         <h3 className="text-2xl font-bold text-gray-900 mb-6">
//           Payment & Confimation
//         </h3>
//         <div className="bg-gray-50 rounded-lg p-6 mb-8">
//           <h4 className="font-semibold text-gray-900 mb-4">Booking Summary</h4>
//           <div className="space-y-3">
//             <div className="flex justify-between">
//               <span className="text-gray-600">Date & Time</span>
//               <span className="font-medium">
//                 {selectedDate?.toLocaleDateString()} at {selectedSlot}
//               </span>
//             </div>

//             <div className="flex justify-between">
//               <span className="text-gray-600">Consultation Type</span>
//               <span className="font-medium">{consultationType}</span>
//             </div>

//             <div className="flex justify-between">
//               <span className="text-gray-600">Doctor</span>
//               <span className="font-medium">{doctorName}</span>
//             </div>

//             <div className="flex justify-between">
//               <span className="text-gray-600">Duration</span>
//               <span className="font-medium">{slotDuration} minutes</span>
//             </div>

//             <Separator />

//             <div className="flex justify-between">
//               <span className="text-gray-600">Consultation Fee</span>
//               <span className="font-medium">₹{consultationFee}</span>
//             </div>

//             <div className="flex justify-between">
//               <span className="text-gray-600">Platform Fee</span>
//               <span className="font-medium">₹{platformFees}</span>
//             </div>

//             <Separator />

//             <div className="flex justify-between text-lg">
//               <span className="font-semibold">Total Amount</span>
//               <span className="font-bold text-green-600">₹{totalAmount}</span>
//             </div>
//           </div>
//         </div>

//         <AnimatePresence mode="wait">
//           {paymentStatus === "processing" && (
//             <motion.div
//               key="processing"
//               initial={{ opacity: 0, scale: 0.95 }}
//               animate={{ opacity: 1, scale: 1 }}
//               exit={{ opacity: 0, scale: 0.95 }}
//               className="text-center py-12"
//             >
//               <Loader2 className="w-12 h-12 mx-auto mb-4 text-green-600 animate-spin" />
//               <h4 className="text-lg font-semibold text-gray-900 mb-2">
//                 Processing Payment...
//               </h4>
//               <p className="text-gray-600 mb-4">
//                 Please complete the paymnet in the Razorpay window
//               </p>
//               <Progress value={50} className="w-full" />
//             </motion.div>
//           )}

//           {paymentStatus === "success" && (
//             <motion.div
//               key="success"
//               initial={{ opacity: 0, scale: 0.95 }}
//               animate={{ opacity: 1, scale: 1 }}
//               exit={{ opacity: 0, scale: 0.95 }}
//               className="text-center py-12"
//             >
//               <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
//               <h4 className="text-lg font-semibold text-green-800 mb-2">
//                 Payment Successfully!
//               </h4>
//               <p className="text-gray-600 mb-4">
//                 Your appointment has been confirmed
//               </p>
//             </motion.div>
//           )}

//           {paymentStatus === "failed" && (
//             <motion.div
//               key="failed"
//               initial={{ opacity: 0, scale: 0.95 }}
//               animate={{ opacity: 1, scale: 1 }}
//               exit={{ opacity: 0, scale: 0.95 }}
//               className="text-center py-12"
//             >
//               <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
//               <h4 className="text-lg font-semibold text-red-800 mb-2">
//                 Payment failed!
//               </h4>
//               <p className="text-gray-600 mb-4">{error}</p>
//               <Button
//                 onClick={() => {
//                   setPaymentStatus("idle");
//                   setError("");
//                 }}
//                 variant="outline"
//                 className="text-red-600 border-red-600 hover:bg-red-50"
//               >
//                 Try Again
//               </Button>
//             </motion.div>
//           )}
//         </AnimatePresence>

//         <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg mb-8">
//           <Shield className="w-6 h-6 text-green-600" />
//           <div>
//             <p className="font-medium text-green-800">Secure Payment</p>
//             <p>Your payment is protected by 256-bit SSL encryption</p>
//           </div>
//         </div>
//       </div>

//       {paymentStatus === "idle" && (
//         <div className="flex justify-between gap-2">
//           <Button variant="outline" onClick={onBack} className="px-8 py-3">
//             Back
//           </Button>
//           <Button
//             onClick={handlePaynow}
//             disabled={loading || isPaymentLoading}
//             className="px-8 py-3 bg-green-600 hover:bg-green-700 text-lg font-semibold"
//           >
//             {loading ? (
//               <>
//                 <Loader2 className="w-5 h-5 mr-2 animate-spin" />
//                 <span className="text-sm md:text-lg">
//                   Creating Appointment...
//                 </span>
//               </>
//             ) : isPaymentLoading ? (
//               <>
//                 <Loader2 className="w-5 h-5 mr-2 animate-spin" />
//                 <span className="text-sm md:text-lg">Processing...</span>
//               </>
//             ) : appointmentId && patientName ? (
//               <>
//                 <Loader2 className="w-5 h-5 mr-2 animate-spin" />
//                 <span className="text-sm md:text-lg">
//                   Opening Payment...
//                 </span>
//               </>
//             ) : (
//               <>
//                 <CreditCard className="w-5 h-5 mr-2 " />
//                 <span className="text-sm md:text-lg">
//                   Pay ₹{totalAmount} & Book
//                 </span>
//               </>
//             )}
//           </Button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default PayementStep;

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

  // Load Razorpay SDK once
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
        amount, // ✅ ALREADY IN PAISE — DO NOT MULTIPLY
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
      )}

      <div className="flex items-center gap-3 bg-green-50 p-4 rounded-lg">
        <Shield className="text-green-600" />
        <span>256-bit SSL secured payment</span>
      </div>
    </div>
  );
};

export default PayementStep;
