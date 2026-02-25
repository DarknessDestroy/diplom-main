import { useState } from 'react';

/**
 * Welcome Screen — управление шаблонами маршрутов патрулирования.
 * Шаблон = заранее построенный маршрут (название + точки на карте).
 * @param {{
 *   onStart: (templateId?: string) => void;
 *   templates: { id: string; name: string; path: [number, number][] }[];
 *   onStartCreateTemplate: () => void;
 *   onEditTemplateRoute: (id: string) => void;
 *   onDeleteTemplate: (id: string) => void;
 * }} props
 */
export function WelcomeScreen({
  onStart,
  templates,
  onStartCreateTemplate,
  onEditTemplateRoute,
  onDeleteTemplate
}) {
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleDelete = (id) => {
    onDeleteTemplate(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Шаблоны маршрутов патрулирования</h2>
          <p className="text-gray-400 text-sm mt-1">
            Создайте маршрут по карте, сохраните его как шаблон и используйте для дронов.
          </p>
        </div>

        <div className="px-6 py-4 flex flex-wrap gap-3 justify-between items-center bg-gray-800/50">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onStartCreateTemplate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              + Создать шаблон
            </button>
            <button
              type="button"
              onClick={() => onStart()}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Начать работу
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <h3 className="text-lg font-semibold text-white mb-3">Сохранённые шаблоны ({templates.length})</h3>
          {templates.length === 0 ? (
            <p className="text-gray-500 py-6 text-center">
              Нет шаблонов. Нажмите «Создать шаблон», чтобы нарисовать маршрут на карте и сохранить его.
            </p>
          ) : (
            <ul className="space-y-2">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 px-4 bg-gray-700/50 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{t.name}</p>
                    <p className="text-sm text-gray-400">
                      {(t.path && t.path.length) || 0} точек маршрута
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEditTemplateRoute(t.id)}
                      className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium"
                      title="Редактировать маршрут на карте"
                    >
                      Редактировать маршрут
                    </button>
                    <button
                      type="button"
                      onClick={() => onStart(t.id)}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                      title="Начать работу и применить шаблон к дрону"
                    >
                      Использовать
                    </button>
                    {deleteConfirmId === t.id ? (
                      <span className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                        >
                          Да
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 bg-gray-500 hover:bg-gray-400 text-white rounded text-sm"
                        >
                          Нет
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(t.id)}
                        className="px-3 py-1.5 bg-red-900/70 hover:bg-red-800 text-red-200 rounded-lg text-sm font-medium"
                        title="Удалить"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
