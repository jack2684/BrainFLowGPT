'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from './AuthContext'

interface AuthButtonProps {
  mode: 'sign-in' | 'sign-up'
}

// Move Modal component outside of AuthButton
const AuthModal = ({
  mode,
  showModal,
  setShowModal,
  email,
  setEmail,
  password,
  setPassword,
  handleSubmit
}: {
  mode: 'sign-in' | 'sign-up'
  showModal: boolean
  setShowModal: (show: boolean) => void
  email: string
  setEmail: (email: string) => void
  password: string
  setPassword: (password: string) => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
}) => (
  <div className="fixed inset-0 z-[9999] overflow-y-auto">
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-xl shadow-lg p-6 md:p-8">
        <div className="absolute right-4 top-4">
          <button
            onClick={() => setShowModal(false)}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            {mode === 'sign-up' ? 'Create an account' : 'Welcome back'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm
                  placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 text-black dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm
                  placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 text-black dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
            </div>
            <div className="flex flex-col gap-4">
              <button
                type="submit"
                className="w-full px-4 py-2.5 text-sm font-medium text-white dark:text-black bg-black dark:bg-white
                  rounded-md hover:bg-black/80 dark:hover:bg-white/80 focus:outline-none focus:ring-2
                  focus:ring-offset-2 focus:ring-black dark:focus:ring-white transition-colors"
              >
                {mode === 'sign-up' ? 'Create Account' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
)

export function AuthButton({ mode }: AuthButtonProps) {
  const { user, signIn, signUp, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showModal, setShowModal] = useState(false)

  if (!signUp || !signIn || !signOut) {
    console.error('Auth functions not properly initialized:', { signUp, signIn, signOut })
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (mode === 'sign-up') {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
      setShowModal(false)
    } catch (error) {
      console.error('Auth error:', error)
    }
  }

  if (user) {
    return (
      <button
        onClick={() => signOut()}
        className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-500 rounded-md hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
      >
        Sign Out
      </button>
    )
  }

  const buttonStyles = mode === 'sign-up'
    ? "px-4 py-2 text-sm font-medium text-white bg-black dark:bg-white dark:text-black rounded-md hover:bg-black/80 dark:hover:bg-white/80 transition-colors"
    : "px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors";

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={buttonStyles}
      >
        {mode === 'sign-up' ? 'Sign Up' : 'Sign In'}
      </button>

      {showModal && createPortal(
        <AuthModal
          mode={mode}
          showModal={showModal}
          setShowModal={setShowModal}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          handleSubmit={handleSubmit}
        />,
        document.body
      )}
    </>
  )
}
