import ProfilePage from "@/components/ProfilePage/ProfilePage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patient Profile | CuraVault+",
  description: "View and manage your doctor profile in CuraVault+ platform.",
};

export default function Page() {
  return  <ProfilePage userType='patient'/>
}