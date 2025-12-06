export function WelcomeScreen({ onStart }) {
  return (
    <div className="text-center max-w-lg bg-gray-800 p-8 rounded-lg border border-gray-700 shadow-xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">Название в разработке</h2>
        <p className="text-gray-300">Веб-приложение для управления беспилотными летательными аппаратами</p>
      </div>
      
      
      
      <button
        onClick={onStart}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
      >
        Начать работу
      </button>
    </div>
  );
}