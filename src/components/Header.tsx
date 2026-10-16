export default function Header() {
  const now = new Date().toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit'
  })

  return (
    <header className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-xl">
      <div className="max-w-full mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">🌍 ALERTA360</h1>
          <p className="text-red-100 text-xs sm:text-sm mt-1">Alertas de Desastres en Tiempo Real</p>
        </div>
        <div className="text-right text-xs sm:text-sm text-red-100">
          <p>{now}</p>
        </div>
      </div>
    </header>
  )
}
