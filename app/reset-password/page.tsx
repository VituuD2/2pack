'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useNotification } from '@/components/NotificationContext'
import React from 'react'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showNotification } = useNotification()

  const code = searchParams.get('code')

  useEffect(() => {
    if (code) {
      const exchangeCodeForSession = async () => {
        const { error } = await supabase.auth.exchangeCodeForSession(code as string)
        if (error) {
          showNotification('Invalid or expired password reset link.', 'error')
          router.push('/login')
        }
      }
      exchangeCodeForSession()
    } else {
      router.push('/login')
    }
  }, [code, router, showNotification])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      showNotification('Passwords do not match', 'error')
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      showNotification(error.message, 'error')
    } else {
      showNotification('Password updated successfully', 'success')
      router.push('/')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Reset Password</h1>
        <form onSubmit={handleResetPassword} className="space-y-6">
          <div>
            <label className="block mb-2 text-sm font-medium">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button type="submit" className="w-full py-2 px-4 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Reset Password
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
