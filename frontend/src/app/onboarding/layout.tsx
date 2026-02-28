'use client'
import { userAuthStore } from '@/store/authStore'
import { redirect } from 'next/navigation';
import React, { useEffect } from 'react'

const layout = ({children}:{children:React.ReactNode}) => {
    const {isAuthenticated} = userAuthStore();

    useEffect(() => {
        if(!isAuthenticated){
            redirect('/login/patient')
        }
    },[isAuthenticated])

    if(!isAuthenticated) return null;
  return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>
        <header className='bg-white border-b px-6 py-4'>
            <div className='max-w-4xl mx-auto'>
                <div className='text-2xl font-bold text-green-900'>
                CuraVault+
                </div>
            </div>
        </header>
        <main className='flex-1 flex items-center justify-center p-6'>
            {children}
        </main>
    </div>
  )
}

export default layout