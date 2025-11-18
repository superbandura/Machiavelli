import { useState } from 'react'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp, collection, query, limit, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Link, useNavigate } from 'react-router-dom'
import Separator from '@/components/decorative/Separator'

const topFactionEmblems = [
  { name: 'Venecia', path: '/factions/venecia.png' },
  { name: 'Florencia', path: '/factions/florencia.png' },
  { name: 'Milán', path: '/factions/milan.png' },
  { name: 'Nápoles', path: '/factions/napoles.png' },
  { name: 'Papado', path: '/factions/papado.png' },
]

const bottomFactionEmblems = [
  { name: 'Francia', path: '/factions/francia.png' },
  { name: 'Génova', path: '/factions/genova.png' },
  { name: 'Aragón', path: '/factions/aragon.png' },
  { name: 'Austria', path: '/factions/austria.png' },
  { name: 'Otomanos', path: '/factions/otomanos.png' },
]

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Update display name
      if (displayName) {
        await updateProfile(userCredential.user, {
          displayName: displayName,
        })
      }

      // Verificar si es el primer usuario (para asignar rol de admin)
      const usersRef = collection(db, 'users')
      const firstUserQuery = query(usersRef, limit(1))
      const existingUsers = await getDocs(firstUserQuery)
      const isFirstUser = existingUsers.empty

      // El primer usuario es admin, los demás son usuarios normales
      const role = isFirstUser ? 'admin' : 'user'

      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: displayName || null,
        role: role,
        createdAt: serverTimestamp(),
      })

      console.log(`Usuario registrado con rol: ${role}${isFirstUser ? ' (primer usuario - admin)' : ''}`)

      // Esperar a que authStore se actualice con el rol desde Firestore
      // Esto evita una race condition donde el Lobby se renderiza antes de que el rol esté cargado
      await new Promise(resolve => setTimeout(resolve, 1000))

      navigate('/lobby')
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('email-already-in-use')) {
          setError('Este email ya está registrado')
        } else {
          setError('Error al crear la cuenta. Por favor intenta de nuevo.')
        }
      }
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
              Crear Cuenta
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
                    htmlFor="displayName"
                    className="block text-sm font-semibold font-serif text-[#1d1408] mb-1"
                  >
                    Nombre de usuario
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="block w-full px-3 py-2 bg-parchment-50 border-2 border-[#6b5d42] rounded-lg text-[#1d1408] placeholder-[#6b5d42] font-serif focus:outline-none focus:ring-2 focus:ring-[#6b5d42] focus:border-transparent transition-all"
                    placeholder="Lorenzo de Medici"
                  />
                </div>

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

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-semibold font-serif text-[#1d1408] mb-1"
                  >
                    Confirmar Contraseña
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-sm font-serif text-[#2c2416]">
                  ¿Ya tienes cuenta?{' '}
                  <Link
                    to="/login"
                    className="text-[#1d1408] hover:text-[#2c2416] font-semibold underline decoration-[#1d1408] transition-colors"
                  >
                    Iniciar Sesión
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
