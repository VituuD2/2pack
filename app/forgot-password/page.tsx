'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useNotification } from '@/components/NotificationContext'
import React from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSent, setIsSent] = useState(false)
  const { showNotification } = useNotification()

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      showNotification(error.message, 'error')
    } else {
      setIsSent(true)
      showNotification('Password reset link sent to your email', 'success')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Forgot Password</h1>
        {isSent ? (
          <p className="text-center">Please check your email for a link to reset your password.</p>
        ) : (
          <form onSubmit={handlePasswordReset} className="space-y-6">
            <div>
              <label className="block mb-2 text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button type="submit" className="w-full py-2 px-4 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Send Reset Link
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
