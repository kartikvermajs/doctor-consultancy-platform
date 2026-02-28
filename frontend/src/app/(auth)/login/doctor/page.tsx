import AuthForm from "@/components/auth/AuthForm";

export const metadata = {
  title: 'Doctor Login - CuraVault+',
  description: 'Healthcare provider sign in to CuraVault+ platform. Manage your practice and consultations.',
};


export default function DoctorLoginPage() {
  return  <AuthForm type='login' userRole='doctor'/>
}