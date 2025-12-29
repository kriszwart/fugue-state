'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from './LoadingSpinner'

interface AuthGuardProps {
  children: React.ReactNode
  redirectTo?: string
  requireInitialization?: boolean
}

export default function AuthGuard({ 
  children, 
  redirectTo = '/auth/login',
  requireInitialization = false 
}: AuthGuardProps) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth', {
          credentials: 'include'
        })
        const data = await response.json()

        if (data.user) {
          setIsAuthenticated(true)
          
          // Check initialization if required
          if (requireInitialization) {
            const initResponse = await fetch('/api/initialization/status', {
              credentials: 'include'
            })
            const initData = await initResponse.json()

            if (initData.needsInitialization) {
              setIsInitialized(false)
              // Check if user has entered their name first
              const userName = typeof window !== 'undefined' ? localStorage.getItem('fuguestate_username') : null
              if (!userName) {
                // Redirect to name input page first
                router.push('/studio')
              } else {
                // Name exists, go to initialization (muse selection)
                router.push('/initialization')
              }
              return
            } else {
              setIsInitialized(true)
            }
          } else {
            setIsInitialized(true) // Not required, so consider it "initialized" for this check
          }
        } else {
          setIsAuthenticated(false)
          router.push(redirectTo)
        }
      } catch (error) {
        setIsAuthenticated(false)
        router.push(redirectTo)
      }
    }

    checkAuth()
  }, [router, redirectTo, requireInitialization])

  if (isAuthenticated === null || (requireInitialization && isInitialized === null)) {
    return (
      <LoadingSpinner
        fullScreen
        message="Checking authentication status..."
      />
    )
  }

  if (!isAuthenticated || (requireInitialization && !isInitialized)) {
    return null
  }

  return <>{children}</>
}

