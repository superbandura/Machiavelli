import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Link, useNavigate } from 'react-router-dom'
import Separator from '@/components/decorative/Separator'

/**
 * Emblemas de facciones mostrados en la parte superior del login
 */
const topFactionEmblems = [
  { name: 'Venecia', path: '/factions/venecia.png' },
  { name: 'Florencia', path: '/factions/florencia.png' },
  { name: 'Milán', path: '/factions/milan.png' },
  { name: 'Nápoles', path: '/factions/napoles.png' },
  { name: 'Papado', path: '/factions/papado.png' },
]

/**
 * Emblemas de facciones mostrados en la parte inferior del login
 */
const bottomFactionEmblems = [
  { name: 'Francia', path: '/factions/francia.png' },
  { name: 'Génova', path: '/factions/genova.png' },
  { name: 'Aragón', path: '/factions/aragon.png' },
  { name: 'Austria', path: '/factions/austria.png' },
  { name: 'Otomanos', path: '/factions/otomanos.png' },
]

/**
 * Página de login con autenticación Firebase
 *
 * Permite a los usuarios iniciar sesión con email y contraseña usando Firebase Auth.
 *
 * **Características:**
 * - Autenticación con Firebase (`signInWithEmailAndPassword`)
 * - Navegación automática al lobby tras login exitoso
 * - Delay de 1s para esperar carga de rol desde Firestore (evita race condition)
 * - Validación de credenciales con mensajes de error
 * - Diseño temático renacentista con emblemas de facciones
 * - Links a registro y recuperación de contraseña
 * - Separadores ornamentales y tipografía de época
 *
 * **Flujo:**
 * 1. Usuario introduce email y contraseña
 * 2. Submit → `signInWithEmailAndPassword()`
 * 3. Espera 1s para que authStore cargue rol desde Firestore
 * 4. Navega a `/lobby`
 * 5. Si error → muestra mensaje "Credenciales inválidas"
 *
 * **Decoración:**
 * - 10 emblemas de facciones (5 arriba, 5 abajo)
 * - Título "Machiavelli" con fuente display
 * - Subtítulo latino: "Melius est amari quam timeri"
 * - Borde ornamental con shadow-ornate
 *
 * @component
 * @example
 * // Ruta en App.tsx
 * <Route path="/login" element={<Login />} />
 */
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)

      // Esperar a que authStore se actualice con el rol desde Firestore
      // Esto evita una race condition donde el Lobby se renderiza antes de que el rol esté cargado
      await new Promise(resolve => setTimeout(resolve, 1000))

      navigate('/lobby')
    } catch (err) {
      setError('Credenciales inválidas. Por favor intenta de nuevo.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4e4c1] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-8">
        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-7xl font-display text-[#1d1408] drop-shadow-lg mb-2">
            Machiavelli
          </h1>
          <p className="text-xl font-serif text-[#2c2416] italic">
            "Melius est amari quam timeri"
          </p>
        </div>

        {/* Emblemas superiores */}
        <div className="flex justify-center items-center gap-6 mb-8">
          {topFactionEmblems.map((faction) => (
            <div key={faction.name}>
              <img
                src={faction.path}
                alt={faction.name}
                className="w-20 h-20 object-contain filter drop-shadow-lg"
              />
            </div>
          ))}
        </div>

        <Separator variant="gold" withFlourish />

        {/* Formulario con borde ornamental */}
        <div className="border-4 border-[#6b5d42] rounded-lg shadow-ornate">
          <div className="bg-parchment-100 py-6 rounded-lg">
            <h2 className="text-center text-2xl font-heading text-[#1d1408] mb-4 px-12">
              Iniciar Sesión
            </h2>

            <form className="space-y-4 px-12" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-burgundy-300/10 border-2 border-[#6b5d42] text-[#1d1408] px-4 py-3 rounded-lg font-serif">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold font-serif text-[#1d1408] mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-3 py-2 bg-parchment-50 border-2 border-[#6b5d42] rounded-lg text-[#1d1408] placeholder-[#6b5d42] font-serif focus:outline-none focus:ring-2 focus:ring-[#6b5d42] focus:border-transparent transition-all"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold font-serif text-[#1d1408] mb-1"
                  >
                    Contraseña
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-3 py-2 bg-parchment-50 border-2 border-[#6b5d42] rounded-lg text-[#1d1408] placeholder-[#6b5d42] font-serif focus:outline-none focus:ring-2 focus:ring-[#6b5d42] focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border-2 border-[#6b5d42] rounded-lg shadow-ornate text-base font-bold font-heading text-white bg-[#6b5d42] hover:bg-[#544a35] hover:shadow-glow-gold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6b5d42] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-sm font-serif text-[#2c2416]">
                  ¿No tienes cuenta?{' '}
                  <Link
                    to="/register"
                    className="text-[#1d1408] hover:text-[#2c2416] font-semibold underline decoration-[#1d1408] transition-colors"
                  >
                    Registrarse
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>

        <Separator variant="gold" withFlourish />

        {/* Emblemas inferiores */}
        <div className="flex justify-center items-center gap-6 mt-8">
          {bottomFactionEmblems.map((faction) => (
            <div key={faction.name}>
              <img
                src={faction.path}
                alt={faction.name}
                className="w-20 h-20 object-contain filter drop-shadow-lg"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
