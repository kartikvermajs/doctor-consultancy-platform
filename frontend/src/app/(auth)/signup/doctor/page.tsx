import AuthForm from "@/components/auth/AuthForm";

export const metadata = {
  title: 'Join CuraVault+ as Healthcare Provider',
  description: 'Register as a healthcare provider on CuraVault+ to offer online consultations.',
};


export default function DoctorSignUpPage() {
  return  <AuthForm type='signup' userRole='doctor'/>
}