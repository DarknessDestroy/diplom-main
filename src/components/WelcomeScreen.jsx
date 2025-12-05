export function WelcomeScreen({ onStart }) {
  return (
    <div className="text-center max-w-lg">
      <h2 className="text-2xl font-bold mb-4">Добро пожаловать!</h2>
      <p className="mb-4">
        Здесь вы сможете управлять дронами, строить маршруты и отслеживать их состояние.
      </p>
      <button
        onClick={onStart}
        className="bg-blue-500 px-4 py-2 rounded text-white hover:bg-blue-600"
      >
        Начать работу!
      </button>
    </div>
  );
}