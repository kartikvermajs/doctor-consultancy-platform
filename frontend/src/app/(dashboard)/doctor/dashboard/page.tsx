import DoctorDashboardContent from '@/components/doctor/DoctorDashboardContent'
import Loader from '@/components/Loader'
import React, { Suspense } from 'react'

const page = () => {
  return (
   <Suspense fallback={<Loader/>}>
     <DoctorDashboardContent/>
   </Suspense>
  )
}

export default page