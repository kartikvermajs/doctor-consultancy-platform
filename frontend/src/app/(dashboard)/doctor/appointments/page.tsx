import DoctorAppointmentContent from '@/components/doctor/DoctorAppointmentContent'
import DoctorDashboardContent from '@/components/doctor/DoctorDashboardContent'
import Loader from '@/components/Loader'
import React, { Suspense } from 'react'

const page = () => {
  return (
   <Suspense fallback={<Loader/>}>
     <DoctorAppointmentContent/>
   </Suspense>
  )
}

export default page