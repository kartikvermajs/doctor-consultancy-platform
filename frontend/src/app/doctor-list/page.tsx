import Loader from '@/components/Loader'
import DoctorListPage from '@/components/patient/DoctorListPage'
import React, { Suspense } from 'react'

const page = () => {
  return (
   <Suspense fallback={<Loader/>}>
     <DoctorListPage/>
   </Suspense>
  )
}

export default page