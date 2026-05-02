import React, { Suspense } from 'react';
import PatientHistoryContent from '@/components/doctor/PatientHistoryContent';
import Loader from '@/components/Loader';

const Page = ({ params }: { params: { patientId: string } }) => {
  return (
    <Suspense fallback={<Loader />}>
      <PatientHistoryContent patientId={params.patientId} />
    </Suspense>
  );
};

export default Page;
