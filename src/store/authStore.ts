import { create } from 'zustand'
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { User, AuthState, UserRole } from '@/types'

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  logout: () => Promise<void>
  initialize: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  error: null,

  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  logout: async () => {
    try {
      await auth.signOut()
      set({ user: null, error: null })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  initialize: () => {
    onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Load user role from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid)
          const userDoc = await getDoc(userDocRef)

          let role: UserRole = 'user' // Default role

          if (userDoc.exists()) {
            role = userDoc.data().role || 'user'
          }

          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role,
          }
          set({ user, loading: false })
        } catch (error) {
          console.error('Error loading user role:', error)
          // Fallback: create user without role loaded
          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: 'user',
          }
          set({ user, loading: false })
        }
      } else {
        set({ user: null, loading: false })
      }
    })
  },
}))
