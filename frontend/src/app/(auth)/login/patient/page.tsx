import AuthForm from "@/components/auth/AuthForm";

export const metadata = {
  title: 'Patient Login - CuraVault+',
  description: 'Sign in to your CuraVault+ account to access healthcare consultations.',
};

export default function PatientLoginPage() {
  return  <AuthForm type='login' userRole='patient'/>
}