import React, { Suspense } from 'react';
import PatientHistoryContent from '@/components/doctor/PatientHistoryContent';
import Loader from '@/components/Loader';

const Page = async ({ params }: { params: Promise<{ patientId: string }> }) => {
  const { patientId } = await params;

  return (
    <Suspense fallback={<Loader />}>
      <PatientHistoryContent patientId={patientId} />
    </Suspense>
  );
};

export default Page;
