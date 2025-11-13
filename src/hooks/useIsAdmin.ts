import { useAuthStore } from '@/store/authStore'

/**
 * Hook para verificar si el usuario actual es administrador
 * @returns true si el usuario tiene role 'admin', false en caso contrario
 */
export function useIsAdmin(): boolean {
  const user = useAuthStore((state) => state.user)
  return user?.role === 'admin'
}
