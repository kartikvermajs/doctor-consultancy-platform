import Loader from '@/components/Loader'
import PatientDashboardContent from '@/components/patient/PatientDashboardContent'
import React, { Suspense } from 'react'

const page = () => {
  return (
      <Suspense fallback={<Loader/>}>
     <PatientDashboardContent/>
   </Suspense>
  )
}

export default page