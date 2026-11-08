// Язык интерфейса: русский (исходный) или английский.
// Весь интерфейс написан по-русски; в английском режиме тексты на экране переводятся по словарю
// автоматически — при каждой отрисовке (MutationObserver), включая окна, подсказки и уведомления.
// Составные строки («3 из 5 выполнено») переводятся по кусочкам: каждый русский фрагмент — отдельно.

const KEY = 'kosmic:v1';
const RU_LANGS = ['ru', 'uk', 'be', 'kk', 'uz', 'ky', 'tg'];

function readLang() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s?.settings?.lang) return s.settings.lang;
  } catch (_) { /* нет данных — определим по языку устройства */ }
  const nav = (navigator.language || 'ru').slice(0, 2).toLowerCase();
  return RU_LANGS.includes(nav) ? 'ru' : 'en';
}

export const LANG = readLang();
export const LOCALE = LANG === 'en' ? 'en-US' : 'ru-RU';
export const isEn = LANG === 'en';

// ---------- словарь RU → EN ----------
const EN = {
  // навигация и общее
  'Главная': 'Home', 'Тренировки': 'Workouts', 'Еда': 'Food', 'Цели': 'Goals', 'Привычки': 'Habits', 'Настройки': 'Settings', 'Сон': 'Sleep',
  'Все данные хранятся на этом устройстве.': 'All data is stored on this device.',
  'Разделы': 'Sections',
  'Kosmic — тренировки, еда, цели и привычки': 'Kosmic — workouts, food, goals and habits',
  'Сегодня': 'Today', 'Вчера': 'Yesterday', 'Завтра': 'Tomorrow', 'сегодня': 'today',
  'Удалить': 'Delete', 'Отмена': 'Cancel', 'Закрыть': 'Close', 'Сохранить': 'Save', 'Сохранено': 'Saved', 'Добавить': 'Add', 'Изменить': 'Edit',
  'Меньше': 'Less', 'Больше': 'More', 'Удалено': 'Deleted', 'Открыть': 'Open', 'Применить': 'Apply', 'Выйти': 'Log out',
  'Иконка': 'Icon', 'Цвет': 'Color', 'Единица': 'Unit', 'Тип': 'Type', 'Название': 'Name', 'Заметка': 'Note',
  'день': 'day', 'дня': 'days', 'дней': 'days', 'час': 'h', 'ч': 'h', 'мин': 'min', 'сек': 'sec', 'м': 'm', 'т': 't', 'л': 'L', 'кг': 'kg', 'мл': 'ml', 'г': 'g', 'КБ': 'KB',
  'из': 'of', 'от': 'from', 'до': 'until', 'цель': 'goal', 'Цель': 'Goal', 'Цель:': 'Goal:', 'цель:': 'goal:', 'ккал': 'kcal',
  'выполнено': 'done', 'Все': 'All', 'Мало': 'Few', 'Отдых': 'Rest', 'нет данных': 'no data', 'в среднем': 'on average', 'среднее': 'average',
  'Понедельник': 'Monday', 'Вторник': 'Tuesday', 'Среда': 'Wednesday', 'Четверг': 'Thursday', 'Пятница': 'Friday', 'Суббота': 'Saturday', 'Воскресенье': 'Sunday',
  'Пн': 'Mon', 'Вт': 'Tue', 'Ср': 'Wed', 'Чт': 'Thu', 'Пт': 'Fri', 'Сб': 'Sat', 'Вс': 'Sun',
  'Январь': 'January', 'Февраль': 'February', 'Март': 'March', 'Апрель': 'April', 'Май': 'May', 'Июнь': 'June', 'Июль': 'July', 'Август': 'August', 'Сентябрь': 'September', 'Октябрь': 'October', 'Ноябрь': 'November', 'Декабрь': 'December',
  'января': 'January', 'февраля': 'February', 'марта': 'March', 'апреля': 'April', 'мая': 'May', 'июня': 'June', 'июля': 'July', 'августа': 'August', 'сентября': 'September', 'октября': 'October', 'ноября': 'November', 'декабря': 'December',
  'Янв': 'Jan', 'Фев': 'Feb', 'Мар': 'Mar', 'Апр': 'Apr', 'Июн': 'Jun', 'Июл': 'Jul', 'Авг': 'Aug', 'Сен': 'Sep', 'Окт': 'Oct', 'Ноя': 'Nov', 'Дек': 'Dec',
  'янв': 'Jan', 'фев': 'Feb', 'мар': 'Mar', 'апр': 'Apr', 'май': 'May', 'июн': 'Jun', 'июл': 'Jul', 'авг': 'Aug', 'сен': 'Sep', 'окт': 'Oct', 'ноя': 'Nov', 'дек': 'Dec',
  'Для работы приложения включите JavaScript.': 'Please enable JavaScript to use the app.',

  // календари (heatmap) и статистика
  'ещё впереди': 'still ahead', 'Месяц': 'Month', 'Год': 'Year', 'Дни': 'Days', 'Назад': 'Back', 'Вперёд': 'Forward',
  'тренировка': 'workout', 'пропущена тренировка': 'missed workout', 'день отдыха': 'rest day', 'Пропуск': 'Missed', 'Тренировка': 'Workout',
  'тренировки': 'workouts', 'тренировок': 'workouts', 'сон': 'sleep', 'нет записей': 'no entries', 'в норме': 'on target',
  'Питание': 'Nutrition', 'В норме': 'On target', 'Много': 'Too much', 'Ничего': 'None', 'Половина': 'Half', 'Почти': 'Almost',
  'все выполнены': 'all done', 'выполнено': 'done', 'ккал из': 'kcal of',

  // гора на главной
  'Каждый шаг приближает к вершине': 'Every step brings you closer to the summit',
  'Дисциплина сильнее мотивации': 'Discipline beats motivation',
  'Маленькие шаги каждый день — большой результат': 'Small steps every day — big results',
  'Ты сильнее, чем думаешь': "You're stronger than you think",
  'Вершина любит упрямых': 'The summit loves the stubborn',
  'Не сравнивай себя с другими — сравнивай со вчерашним собой': "Don't compare yourself to others — compare yourself to who you were yesterday",
  'Сделай сегодня то, за что завтра скажешь спасибо': "Do something today your future self will thank you for",
  'Путь в тысячу шагов начинается с одного': 'A journey of a thousand steps begins with one',
  'Усталость пройдёт — гордость останется': 'The tiredness fades — the pride stays',
  'Не останавливайся, когда устал. Остановись, когда закончил': "Don't stop when you're tired. Stop when you're done",
  'Вершина покорена! 🏔️': 'Summit reached! 🏔️', '% пути': '% of the way',
  'Доброе утро': 'Good morning', 'Добрый день': 'Good afternoon', 'Добрый вечер': 'Good evening', 'Доброй ночи': 'Good night',

  // Премиум
  'в месяц': 'per month', 'первые 7 дней бесплатно': 'first 7 days free', 'в год': 'per year', '≈ 1,67 $ в месяц': '≈ $1.67 per month',
  'Навсегда': 'Lifetime', 'один раз': 'one-time', 'без подписки и продлений': 'no subscription, no renewals',
  'Введи промокод': 'Enter a promo code', 'Промокод не подошёл': "Promo code didn't work", 'Премиум включён по промокоду': 'Premium unlocked with promo code',
  'Свои упражнения': 'Custom exercises', 'добавляй любые упражнения в базу и в план': 'add any exercise to your library and plan',
  'Прогресс': 'Progress', 'календари за месяц и год, история тренировок и нагрузка на мышцы': 'monthly and yearly calendars, workout history and muscle load',
  'Будущие функции': 'Future features', 'всё новое, что появится в Премиуме': 'everything new that comes to Premium',
  'Поддержка Kosmic': 'Support Kosmic', 'приложение развивается благодаря тебе': 'the app grows thanks to you',
  'Премиум включён': 'Premium unlocked', 'Оплата ещё не подключена': 'Payments are not connected yet', 'Нет связи с сервером, попробуй позже': 'No connection to the server, try again later',
  'Подписка Премиум закончилась': 'Your Premium subscription has ended', 'Подписка закончилась': 'Subscription has ended', 'Ключ не подошёл': "Key didn't work", 'Введи ключ': 'Enter a key',
  '👑 Kosmic Премиум': '👑 Kosmic Premium', 'Kosmic Премиум': 'Kosmic Premium', 'активен': 'active', 'Ключ:': 'Key:', '· до': '· until', '· тестовый': '· test',
  '· промокод, бессрочно': '· promo code, no expiry',
  'Чтобы включить Премиум на другом устройстве, введи там этот же ключ.': 'To unlock Premium on another device, enter the same key there.',
  'Выйти из Премиума на этом устройстве': 'Sign out of Premium on this device',
  'в месяц · 7 дней бесплатно · свои упражнения, прогресс и будущие функции': 'per month · 7 days free · custom exercises, progress and future features',
  'Подробнее': 'Learn more', 'доступно в Премиуме': 'is available in Premium', 'Популярный': 'Popular',
  'Подписку можно отменить в любой момент по ссылке из письма': 'You can cancel any time using the link in your email',
  'уже купил?': 'already bought?', 'Ключ из письма': 'Key from your email', 'Активировать': 'Activate',
  'Оплата проходит на защищённой странице платёжного сервиса — данные карты в Kosmic не попадают. После оплаты ключ придёт на почту.':
    'Payment happens on the payment provider’s secure page — your card details never reach Kosmic. After paying, the key is sent to your email.',
  '🎟️ Есть промокод?': '🎟️ Have a promo code?', 'Промокод': 'Promo code',
  'Попробовать': 'Try', 'дней бесплатно': 'days free', 'Купить навсегда за': 'Buy lifetime for', 'Оформить за': 'Subscribe for',
  'Оплата скоро появится': 'Payments coming soon', '— в Премиуме': '— in Premium',
  'История и нагрузка на мышцы': 'History and muscle load',

  // еда
  'Овсянка': 'Oatmeal', 'Яйца (2 шт)': 'Eggs (2)', 'Куриная грудка 150 г': 'Chicken breast 150 g', 'Рис 200 г': 'Rice 200 g', 'Банан': 'Banana',
  'Творог 200 г': 'Cottage cheese 200 g', 'Салат': 'Salad', 'Протеин': 'Protein shake',
  'Вода': 'Water', 'Кофе': 'Coffee', 'Капучино': 'Cappuccino', 'Чай': 'Tea', 'Сок': 'Juice', 'Кола': 'Cola', 'Молоко': 'Milk', 'Энергетик': 'Energy drink',
  'Калории, БЖУ и напитки за день': 'Calories, macros and drinks for the day', 'Осталось': 'Left', 'Перебор': 'Over',
  'Белки': 'Protein', 'Жиры': 'Fat', 'Углев.': 'Carbs', 'Сколько я съел': 'What I ate', 'Напиток': 'Drink',
  'ккал · изменить': 'kcal · edit', 'Калории за 7 дней': 'Calories over 7 days', '🍽️ Еда ·': '🍽️ Food ·', '· Б': '· P', '· Ж': '· F', '· У': '· C',
  'Пока ничего не съедено': 'Nothing eaten yet', 'Нажми «Сколько я съел», чтобы добавить приём пищи.': 'Tap “What I ate” to add a meal.',
  'Быстро добавить снова': 'Quick add again', '🥤 Напитки ·': '🥤 Drinks ·', 'Напитков пока нет': 'No drinks yet', 'добавлено': 'added',
  'Быстрый выбор': 'Quick pick', 'Что съел': 'What I ate', 'Калории': 'Calories', 'Белки, г': 'Protein, g', 'Жиры, г': 'Fat, g', 'Углев., г': 'Carbs, g',
  'Приём пищи': 'Meal', 'Добавить напиток': 'Add a drink', 'Объём, мл': 'Volume, ml', 'Засчитать в норму воды': 'Count toward water goal',
  'Цели питания': 'Nutrition goals', 'Калории в день': 'Calories per day', 'Вода в день, мл': 'Water per day, ml', 'Цели обновлены': 'Goals updated',
  'Например: Паста с курицей': 'E.g. Chicken pasta', 'Например: Смузи': 'E.g. Smoothie', 'Напитки': 'Drinks', 'Перекус': 'Snack', 'Завтрак': 'Breakfast', 'Обед': 'Lunch', 'Ужин': 'Dinner',
  'Вода и напитки': 'Water and drinks', 'стакан воды': 'glass of water', '+250 мл воды': '+250 ml water', 'Цель питания': 'Nutrition goal',

  // цели
  'срок прошёл': 'overdue', 'срок — сегодня': 'due today', 'осталось': 'left',
  'Разовые цели — свайпни, чтобы выполнить. Большие — двигайся шаг за шагом.': 'One-time goals — swipe to complete. Big ones — move step by step.',
  'Новая цель': 'New goal', 'в процессе': 'in progress', 'средний прогресс': 'average progress', 'Активные ·': 'Active ·', 'Выполненные ·': 'Completed ·',
  'Добавь первую цель': 'Add your first goal', 'Здесь будут выполненные цели': 'Completed goals will appear here',
  'Например: «Пробежать 5 км» или «Накопить 100 000 ₽».': 'E.g. “Run 5 km” or “Save $1,000”.',
  'Выполняй цели — и собирай коллекцию побед.': 'Complete goals and build a collection of wins.',
  'разовая цель': 'one-time goal', 'Я прошёл…': 'I did…', '🏆 Готово!': '🏆 Done!', 'свайпни вправо, чтобы выполнить': 'swipe right to complete',
  'Вернуть в активные': 'Move back to active', 'Выполнено!': 'Done!', 'Цель выполнена!': 'Goal completed!', 'Цель достигнута!': 'Goal reached!',
  'Изменить цель': 'Edit goal', 'Тип цели': 'Goal type', '✅ Разовая': '✅ One-time', 'Сделал — свайпнул, и цель выполнена.': 'Did it — swipe, and the goal is done.',
  '📈 С прогрессом': '📈 With progress', 'Иду к цели постепенно и отмечаю, сколько прошёл.': 'Work toward it gradually and log how far you got.',
  'Цель (число)': 'Target (number)', 'Уже прошёл': 'Already done', 'Шаг кнопки «+»': '“+” button step', 'Срок (необязательно)': 'Deadline (optional)',
  'Создать цель': 'Create goal', 'Удалить цель': 'Delete goal', 'Напиши, какая цель': 'Write what the goal is', 'Цель создана': 'Goal created',
  'Удалить цель?': 'Delete goal?', 'будет удалена без возможности восстановления.': 'will be deleted permanently.', 'Цель удалена': 'Goal deleted',
  'Насколько я продвинулся': 'How far I got', 'Или всего прошёл': 'Or total so far', 'Сохранить «всего»': 'Save total', 'Прогресс обновлён': 'Progress updated',
  'Поставить цель': 'Set a goal', 'активных ·': 'active ·', 'Например: Пробежать 5 км': 'E.g. Run 5 km', 'Например: Пробежать марафон': 'E.g. Run a marathon',
  'км': 'km', 'шагов': 'steps', 'страниц': 'pages', 'раз': 'times',

  // привычки
  'Каждый день': 'Every day', 'Количество': 'Count', 'Таймер': 'Timer', 'Отмечай каждый день, считай повторы и засекай время': 'Check off daily, count reps and track time',
  'Новая привычка': 'New habit', 'Сегодня выполнено': 'Done today', '✅ Каждый день': '✅ Every day', '🔢 Количество': '🔢 Count', '⏱️ Таймеры': '⏱️ Timers',
  'Нет привычек этого типа': 'No habits of this type', 'Создай первую привычку': 'Create your first habit',
  'Например: «Пить воду», «10 000 шагов», «Без сладкого» с таймером, сколько ты держишься.': 'E.g. “Drink water”, “10,000 steps”, “No sugar” with a timer of how long you’ve held out.',
  'Держусь уже': 'Going strong for', 'Рекорд:': 'Record:', '· попыток:': '· attempts:', 'Начать заново': 'Start over', 'сегодня · цель': 'today · goal',
  '· сколько прошло': '· time since', '· секундомер': '· stopwatch', 'Норма на сегодня выполнена!': "Today's target reached!", 'Начать заново?': 'Start over?',
  'Таймер «': 'Timer “', '» обнулится. Текущий результат (': '” will reset. The current result (', ') сохранится как рекорд, если он лучше.': ') will be saved as a record if it’s better.',
  'Сбросить': 'Reset', 'Новая попытка! Ты справишься': "New attempt! You've got this", 'Цель по времени выполнена!': 'Time goal reached!',
  'Все привычки на сегодня выполнены!': 'All habits done for today!', 'Изменить привычку': 'Edit habit', 'Привычка': 'Habit',
  'Просто отмечаю: сделал или нет.': 'Just check it off: done or not.', 'Стаканы, страницы, шаги — с нормой на день.': 'Glasses, pages, steps — with a daily target.',
  '⏱️ Таймер': '⏱️ Timer', 'Сколько прошло времени или секундомер.': 'Time since something, or a stopwatch.', 'Норма в день': 'Daily target', 'Шаг «+»': '“+” step',
  'Сколько прошло': 'Time since', 'Секундомер': 'Stopwatch', 'С какого момента считать (например, когда бросил курить)': 'Count from (e.g. when you quit smoking)',
  'Цель в день, минут (например, медитация или чтение)': 'Daily goal, minutes (e.g. meditation or reading)', 'Создать привычку': 'Create habit', 'Удалить привычку': 'Delete habit',
  'Напиши название привычки': 'Write the habit name', 'Привычка создана': 'Habit created', 'Удалить привычку?': 'Delete habit?',
  'и вся её история будут удалены.': 'and all its history will be deleted.', 'Привычка удалена': 'Habit deleted', 'Отметить': 'Check', 'пока нет': 'none yet',
  'Например: Пить воду': 'E.g. Drink water', 'Продолжить': 'Resume', 'На паузе': 'Paused', 'стаканов': 'glasses', 'Пауза': 'Pause', 'Старт': 'Start', 'идёт': 'running', '· идёт': '· running',

  // главная
  '· цель': '· goal', 'Отметь, как ты спал': 'Log how you slept', 'Записать сон': 'Log sleep', 'Тренировка сегодня': "Today's workout",
  'На сегодня упражнений нет. Открой «Тренировки», выбери мышцы на теле и поставь упражнения в план.': 'No exercises today. Open “Workouts”, pick muscles on the body and add exercises to your plan.',
  '💧 Вода': '💧 Water', 'Поставить цель': 'Set a goal',

  // настройки
  'Профиль, оформление и резервные копии': 'Profile, appearance and backups', 'Как к тебе обращаться': 'What should we call you', 'Имя': 'Name', 'Тема': 'Theme',
  'Тёмная': 'Dark', 'Светлая': 'Light', '💾 Резервная копия': '💾 Backup',
  'Все данные хранятся только в этом браузере. Сохраняй копию в файл — так можно перенести данные на другое устройство (телефон ↔ ноутбук) или восстановить их.':
    'All data is stored only in this browser. Save a backup file to move your data to another device (phone ↔ laptop) or restore it.',
  'Загрузить': 'Load', 'Размер данных:': 'Data size:', 'КБ · упражнений в плане:': 'KB · exercises in plan:', '· целей:': '· goals:', '· привычек:': '· habits:',
  '📱 Установить на телефон': '📱 Install on your phone', 'iPhone:': 'iPhone:', 'Android:': 'Android:',
  'открой сайт в Safari → кнопка «Поделиться» → «На экран Домой».': 'open the site in Safari → “Share” → “Add to Home Screen”.',
  'в Chrome меню ⋮ → «Установить приложение».': 'in Chrome, menu ⋮ → “Install app”.', 'Компьютер:': 'Computer:',
  'в Chrome/Edge значок установки в адресной строке.': 'in Chrome/Edge, the install icon in the address bar.',
  'Опасная зона': 'Danger zone', 'Удалить все данные': 'Delete all data', 'Kosmic · версия 1.1 · данные: localStorage': 'Kosmic · version 1.1 · data: localStorage',
  '3D-модель тела: «Male body», автор Chin Eeyang (Sketchfab), лицензия CC BY 4.0. Голова, разметка мышц и стиль — Kosmic.':
    '3D body model: “Male body” by Chin Eeyang (Sketchfab), CC BY 4.0 license. Head, muscle map and styling — Kosmic.',
  'Загрузить копию?': 'Load backup?', 'Текущие данные на этом устройстве будут заменены данными из файла.': 'The current data on this device will be replaced with the data from the file.',
  'Данные восстановлены': 'Data restored', 'Не удалось прочитать файл': "Couldn't read the file", 'Выйти из Премиума?': 'Sign out of Premium?',
  'Подписка не отменится — ключ можно будет ввести снова. Отменить оплату можно по ссылке из письма.': "Your subscription won't be cancelled — you can enter the key again. To cancel payments, use the link in your email.",
  'Копия сохранена': 'Backup saved', 'Удалить всё?': 'Delete everything?',
  'Все тренировки, еда, цели и привычки будут удалены с этого устройства. Сначала лучше сохранить резервную копию.': 'All workouts, food, goals and habits will be deleted from this device. Better save a backup first.',
  'Удалить всё': 'Delete everything', 'Данные удалены': 'Data deleted', 'Язык': 'Language',

  // сон
  'Ужасно': 'Terrible', 'Плохо': 'Bad', 'Нормально': 'Okay', 'Хорошо': 'Good', 'Отлично': 'Great', '· среднее': '· average',
  'Сколько ты спишь и как отдыхаешь': 'How much you sleep and how you rest', 'Прошлой ночью': 'Last night', 'Позапрошлой ночью': 'The night before',
  'Ещё нет записей': 'No entries yet', 'Как спалось?': 'How did you sleep?', 'лучшая ночь': 'best night', 'ночей ≥': 'nights ≥', 'ночь': 'night', 'ночи': 'nights', 'ночей': 'nights',
  'подряд': 'in a row', 'обычно ложусь': 'usually in bed', 'обычно встаю': 'usually up', 'Неделя': 'Week', 'среднее за': 'average for', 'неделю': 'week', 'месяц': 'month', 'год': 'year',
  'ср.': 'avg.', '✨ В среднем ты спишь на': '✨ On average you sleep', 'больше цели — отлично!': 'more than your goal — great!', '💡 В среднем тебе не хватает': '💡 On average you’re short by',
  'до цели. Попробуй ложиться на': 'of your goal. Try going to bed', 'мин раньше.': 'min earlier.', '🗓️ История': '🗓️ History', 'ч · изменить': 'h · edit',
  'Записей пока нет': 'No entries yet', 'Отметь, во сколько лёг и встал, — и здесь появится статистика сна.': 'Log when you went to bed and woke up, and your sleep stats will appear here.',
  'Изменить запись': 'Edit entry', 'Как ты спал?': 'How did you sleep?', 'Утро какого дня': 'Morning of', '🌙 Лёг спать': '🌙 Went to bed', '☀️ Проснулся': '☀️ Woke up',
  'Качество сна': 'Sleep quality', 'Удалить запись': 'Delete entry', 'цель выполнена 🎉': 'goal reached 🎉', 'до цели': 'to goal', 'Сон:': 'Sleep:',
  'Удалить запись?': 'Delete entry?', 'Запись о сне за этот день будет удалена.': 'The sleep entry for this day will be deleted.', 'Цель сна': 'Sleep goal',
  'Сколько часов хочу спать': 'How many hours I want to sleep', 'Цель обновлена': 'Goal updated',

  // тренировки
  '3D недоступно': '3D unavailable',
  'За этот период нет отмеченных тренировок. Отмечай упражнения во вкладке «Неделя» — и здесь появится, какие мышцы ты тренировал больше всего.':
    'No logged workouts in this period. Check off exercises in the “Week” tab and you’ll see which muscles you trained most.',
  'Нагрузка на мышцы': 'Muscle load', 'за выбранный месяц или год · подходы': 'for the selected month or year · sets', 'Спереди': 'Front', 'Сзади': 'Back',
  'СПЕРЕДИ': 'FRONT', 'СЗАДИ': 'BACK', 'Загружаю 3D-модель…': 'Loading 3D model…', 'мало': 'little', 'больше всего': 'the most',
  'Выбирай мышцы, собирай упражнения и планируй неделю': 'Pick muscles, collect exercises and plan your week', 'Тело': 'Body', 'Мои': 'Mine', 'История': 'History',
  'вспомогательные': 'secondary', 'Сбоку': 'Side', 'Оба': 'Both', 'Крути пальцем · щипок — зум · двумя пальцами — двигать ·': 'Drag to rotate · pinch to zoom · two fingers to pan ·',
  '— цвета': '— colors', 'Нажми на мышцу · щипок или колесо — зум · свайп — другая сторона': 'Tap a muscle · pinch or scroll to zoom · swipe for the other side',
  'Выбери группу мышц': 'Choose a muscle group', 'Нажми на мышцу на теле — появятся упражнения, которые её качают.': 'Tap a muscle on the body to see exercises that train it.',
  'выбрано:': 'selected:', 'упр.': 'ex.', 'упражнение': 'exercise', 'упражнения': 'exercises', 'упражнений': 'exercises', '· нажми «+», чтобы добавить': '· tap “+” to add',
  'Тоже задействуют эту мышцу': 'Also work this muscle', 'Своё упражнение': 'Custom exercise', 'Легко': 'Easy', 'Средне': 'Medium', 'Сложно': 'Hard', 'Своё': 'Custom',
  'Нажми — покажу на теле, что качает': 'Tap to see on the body what it trains', 'Что качает': 'What it trains', 'В план': 'To plan', 'Уже в «Моих»': 'Already in “Mine”', 'В «Мои»': 'To “Mine”',
  'Пока пусто': 'Empty for now', 'Открой вкладку «Тело», выбери мышцу и добавь упражнения — они появятся здесь.': 'Open the “Body” tab, pick a muscle and add exercises — they’ll appear here.',
  'Выбрать на теле': 'Pick on the body', 'Собери тренировку': 'Build your workout', 'Нажми на календарь у упражнения, чтобы поставить его в нужный день и указать вес и подходы.':
    'Tap the calendar next to an exercise to schedule it on a day and set weight and sets.',
  'не в плане': 'not in plan', 'День отдыха': 'Rest day', 'подходов': 'sets', 'кг объём': 'kg volume', 'Ничего не запланировано': 'Nothing planned',
  'Добавь упражнения — и увидишь, что качаешь в этот день.': 'Add exercises to see what you train that day.', 'Добавить упражнение': 'Add exercise', '📊 Итог недели': '📊 Week summary',
  'общий тоннаж': 'total tonnage', 'Число — подходы на мышцу за неделю (вспомогательные мышцы считаются как ½).': 'Number = sets per muscle this week (secondary muscles count as ½).',
  'Здесь появится полная картина недели: какие мышцы и сколько ты качал.': 'Your full week will appear here: which muscles and how much you trained.',
  'подходы': 'sets', 'повторы': 'reps', 'Убрать упражнение?': 'Remove exercise?', 'Оно также удалится из плана на неделю.': 'It will also be removed from your weekly plan.',
  'Убрать': 'Remove', 'Убрано из списка': 'Removed from list', 'Добавлено в «Мои упражнения»': 'Added to “My exercises”', 'Тренировка выполнена!': 'Workout complete!',
  'Основная мышца': 'Primary muscle', 'Вспомогательные': 'Secondary', 'Оборудование': 'Equipment', 'На 3D-теле': 'On the 3D body', 'Добавить на': 'Add to',
  'Выбрать другие на теле': 'Pick others on the body', 'Сначала выбери упражнения': 'Pick exercises first', 'Во вкладке «Тело» нажми на мышцу и добавь упражнения в «Мои».':
    'In the “Body” tab, tap a muscle and add exercises to “Mine”.', 'Перейти к телу': 'Go to body', 'Изменить подход': 'Edit sets', 'В план тренировок': 'To workout plan',
  'В какие дни': 'Which days', 'Подходы': 'Sets', 'Повторы': 'Reps', 'Вес, кг': 'Weight, kg', 'Добавить в план': 'Add to plan', 'Удалить из дня': 'Remove from day',
  'Выбери хотя бы один день': 'Pick at least one day', 'Добавлено:': 'Added:', 'Группа мышц': 'Muscle group', 'Создать и добавить': 'Create and add', 'Введи название': 'Enter a name',
  'Упражнение создано': 'Exercise created',
  'Плюс': 'Plus', 'Минус': 'Minus', 'Приблизить': 'Zoom in', 'Отдалить': 'Zoom out', 'Сбросить вид': 'Reset view', 'вид': 'view', 'Цвета мышц': 'Muscle colors',
  'стакан': 'glass', 'Убрать стакан': 'Remove a glass', 'Добавить стакан': 'Add a glass', 'Добавить в день': 'Add to a day', 'в день': 'to a day', 'Выполнено': 'Done',
  'Выполнить': 'Complete', 'Старт/пауза': 'Start/pause', 'Схема мышц': 'Muscle map', 'Например: отдых 90 сек': 'E.g. rest 90 sec', 'Поиск упражнения…': 'Search exercises…',
  'Например: Прочитать 12 книг': 'E.g. Read 12 books', 'км, книг, ₽…': 'km, books, $…', 'книг': 'books', 'стак.': 'glasses', 'Например: Жим в Смите': 'E.g. Smith machine press', 'Мои упражнения': 'My exercises', 'Добавить в «Мои»': 'Add to “Mine”',

  // мышцы и оборудование
  'Грудь': 'Chest', 'Плечи': 'Shoulders', 'Бицепс': 'Biceps', 'Трицепс': 'Triceps', 'Предплечья': 'Forearms', 'Пресс': 'Abs', 'Косые мышцы': 'Obliques', 'Шея': 'Neck',
  'Трапеции': 'Traps', 'Спина (широчайшие)': 'Back (lats)', 'Поясница': 'Lower back', 'Ягодицы': 'Glutes', 'Квадрицепсы': 'Quads', 'Бицепс бедра': 'Hamstrings',
  'Приводящие': 'Adductors', 'Икры': 'Calves',
  'Штанга': 'Barbell', 'Гантели': 'Dumbbells', 'Свой вес': 'Bodyweight', 'Блок': 'Cable', 'Брусья': 'Dip bars', 'Турник': 'Pull-up bar', 'Ролик': 'Ab wheel', 'Блин': 'Plate',
  'Тренажёр': 'Machine', 'Скакалка': 'Jump rope',

  // упражнения: названия и подсказки
  'Жим штанги лёжа': 'Barbell bench press', 'Лопатки сведены, штангу опускай к низу груди, локти ~45°.': 'Shoulder blades squeezed, lower the bar to your lower chest, elbows ~45°.',
  'Жим гантелей на наклонной': 'Incline dumbbell press', 'Наклон скамьи 30°, акцент на верх груди.': 'Bench at 30°, focus on the upper chest.',
  'Отжимания': 'Push-ups', 'Корпус ровный, как планка. Грудь почти касается пола.': 'Body straight like a plank. Chest almost touches the floor.',
  'Разведение гантелей лёжа': 'Dumbbell flyes', 'Руки слегка согнуты, растягивай грудь внизу.': 'Arms slightly bent, stretch the chest at the bottom.',
  'Сведение рук в кроссовере': 'Cable crossover', 'Своди руки перед собой, задержись на секунду.': 'Bring your hands together in front, hold for a second.',
  'Отжимания на брусьях (грудь)': 'Chest dips', 'Наклонись вперёд — так работает больше грудь.': 'Lean forward — this works the chest more.',
  'Армейский жим стоя': 'Standing overhead press', 'Ягодицы и пресс напряжены, не прогибайся в пояснице.': 'Glutes and abs tight, don’t arch your lower back.',
  'Жим гантелей сидя': 'Seated dumbbell press', 'Опускай гантели до уровня ушей.': 'Lower the dumbbells to ear level.',
  'Махи гантелями в стороны': 'Lateral raises', 'Поднимай до уровня плеч, локти чуть выше кистей.': 'Raise to shoulder height, elbows slightly above wrists.',
  'Обратные разведения в наклоне': 'Bent-over reverse flyes', 'Для задней дельты. Спина ровная, без рывков.': 'For the rear delts. Back straight, no jerking.',
  'Жим Арнольда': 'Arnold press', 'Разворачивай ладони во время подъёма.': 'Rotate your palms as you press up.',
  'Тяга каната к лицу': 'Face pull', 'Тяни к переносице, разводи концы каната.': 'Pull toward the bridge of your nose, spread the rope ends.',
  'Подъём штанги на бицепс': 'Barbell curl', 'Локти прижаты к корпусу, без раскачки.': 'Elbows tucked to your sides, no swinging.',
  'Молотки с гантелями': 'Hammer curls', 'Нейтральный хват, ладони смотрят друг на друга.': 'Neutral grip, palms facing each other.',
  'Сгибания на скамье Скотта': 'Preacher curl', 'Полностью разгибай руку внизу.': 'Fully extend your arm at the bottom.',
  'Концентрированный подъём': 'Concentration curl', 'Локоть упирается в бедро, медленно опускай.': 'Elbow braced on your thigh, lower slowly.',
  'Подтягивания обратным хватом': 'Chin-ups', 'Ладони к себе, подбородок выше перекладины.': 'Palms facing you, chin above the bar.',
  'Французский жим лёжа': 'Skull crushers', 'Двигаются только предплечья, локти неподвижны.': 'Only the forearms move, elbows stay still.',
  'Разгибания на блоке': 'Cable pushdown', 'Локти прижаты, разгибай руки до конца.': 'Elbows tucked, fully extend your arms.',
  'Жим узким хватом': 'Close-grip bench press', 'Хват на ширине плеч, локти вдоль корпуса.': 'Shoulder-width grip, elbows along your sides.',
  'Отжимания на брусьях (трицепс)': 'Triceps dips', 'Корпус вертикально — нагрузка уходит в трицепс.': 'Torso upright — the load goes to the triceps.',
  'Разгибание гантели из-за головы': 'Overhead dumbbell extension', 'Локти смотрят вверх, не разводи их.': 'Elbows point up, don’t flare them.',
  'Обратные отжимания от скамьи': 'Bench dips', 'Опускайся до угла 90° в локтях.': 'Lower until your elbows are at 90°.',
  'Сгибания запястий': 'Wrist curls', 'Предплечья лежат на скамье, работают только кисти.': 'Forearms rest on the bench, only the wrists move.',
  'Обратные сгибания запястий': 'Reverse wrist curls', 'Хват сверху, небольшой вес.': 'Overhand grip, light weight.',
  'Прогулка фермера': "Farmer's walk", 'Тяжёлые гантели, прямая спина, короткие шаги.': 'Heavy dumbbells, straight back, short steps.',
  'Вис на турнике': 'Dead hang', 'Повторы = секунды виса.': 'Reps = seconds of hanging.',
  'Скручивания': 'Crunches', 'Отрывай лопатки, поясница прижата к полу.': 'Lift your shoulder blades, lower back pressed to the floor.',
  'Планка': 'Plank', 'Повторы = секунды. Таз не провисает.': 'Reps = seconds. Don’t let your hips sag.',
  'Подъём ног в висе': 'Hanging leg raise', 'Без раскачки, подкручивай таз вверх.': 'No swinging, curl your pelvis up.',
  'Велосипед': 'Bicycle crunches', 'Локоть тянется к противоположному колену.': 'Elbow reaches toward the opposite knee.',
  'Ролик для пресса': 'Ab wheel rollout', 'Не прогибай поясницу, начинай с колен.': 'Don’t arch your lower back, start from your knees.',
  'Русские скручивания': 'Russian twists', 'Поворачивай корпус, а не только руки.': 'Rotate your torso, not just your arms.',
  'Боковая планка': 'Side plank', 'Повторы = секунды на каждую сторону.': 'Reps = seconds per side.',
  'Наклоны с гантелью': 'Dumbbell side bends', 'Наклоняйся строго в сторону.': 'Bend strictly to the side.',
  'Дровосек в блоке': 'Cable woodchopper', 'Движение по диагонали за счёт корпуса.': 'Diagonal movement driven by your torso.',
  'Сгибание шеи с блином лёжа': 'Lying plate neck flexion', 'Лёжа на спине, блин на лбу через полотенце. Подбородок к груди плавно, без рывков.':
    'Lying on your back, plate on your forehead over a towel. Bring chin to chest smoothly, no jerking.',
  'Разгибание шеи лёжа на животе': 'Prone neck extension', 'Блин на затылке через полотенце, медленно поднимай голову назад.': 'Plate on the back of your head over a towel, slowly lift your head back.',
  'Наклоны шеи в стороны с сопротивлением': 'Resisted neck side bends', 'Упирайся ладонью в висок и медленно наклоняй голову вбок.': 'Press your palm against your temple and slowly tilt your head sideways.',
  'Шраги со штангой': 'Barbell shrugs', 'Поднимай плечи к ушам, без вращений.': 'Raise your shoulders to your ears, no rolling.',
  'Шраги с гантелями': 'Dumbbell shrugs', 'Задержка в верхней точке 1 секунда.': 'Hold at the top for 1 second.',
  'Тяга штанги к подбородку': 'Upright row', 'Хват шире плеч — меньше нагрузка на плечевой сустав.': 'Grip wider than shoulders — less stress on the shoulder joint.',
  'Подтягивания': 'Pull-ups', 'Тяни локти вниз, грудь к перекладине.': 'Drive your elbows down, chest to the bar.',
  'Тяга верхнего блока': 'Lat pulldown', 'Тяни к верху груди, не откидывайся сильно.': 'Pull to your upper chest, don’t lean back too far.',
  'Тяга штанги в наклоне': 'Bent-over barbell row', 'Спина ровная, тяни к низу живота.': 'Back straight, pull toward your lower belly.',
  'Тяга гантели одной рукой': 'One-arm dumbbell row', 'Упор коленом в скамью, локоть вдоль корпуса.': 'Knee on the bench, elbow along your side.',
  'Тяга горизонтального блока': 'Seated cable row', 'Своди лопатки в конце движения.': 'Squeeze your shoulder blades at the end.',
  'Пуловер с гантелью': 'Dumbbell pullover', 'Руки почти прямые, растягивай спину.': 'Arms almost straight, stretch your back.',
  'Становая тяга': 'Deadlift', 'Гриф у голеней, спина нейтральная, толкай пол ногами.': 'Bar close to your shins, neutral back, push the floor with your legs.',
  'Гиперэкстензия': 'Back extension', 'Не переразгибайся в верхней точке.': 'Don’t overextend at the top.',
  'Наклон за счёт таза назад, колени слегка согнуты.': 'Hinge by pushing your hips back, knees slightly bent.',
  'Супермен': 'Superman', 'Лёжа на животе, поднимай руки и ноги одновременно.': 'Lying on your stomach, lift your arms and legs at the same time.',
  'Ягодичный мост со штангой': 'Barbell hip thrust', 'Подбородок к груди, сжимай ягодицы наверху.': 'Chin to chest, squeeze your glutes at the top.',
  'Болгарские выпады': 'Bulgarian split squat', 'Задняя нога на скамье, корпус чуть вперёд.': 'Rear foot on the bench, torso slightly forward.',
  'Отведение ноги в кроссовере': 'Cable kickback', 'Отводи ногу назад, без прогиба в пояснице.': 'Kick your leg back without arching your lower back.',
  'Ягодичный мостик': 'Glute bridge', 'Пятки ближе к тазу, пауза наверху.': 'Heels close to your hips, pause at the top.',
  'Приседания со штангой': 'Barbell squat', 'Колени по линии носков, спина ровная, глубина до параллели.': 'Knees in line with toes, back straight, squat to parallel.',
  'Жим ногами': 'Leg press', 'Не отрывай поясницу, не выпрямляй колени до щелчка.': 'Keep your lower back down, don’t lock out your knees.',
  'Выпады с гантелями': 'Dumbbell lunges', 'Колено не выходит за носок, шаг широкий.': 'Knee stays behind your toes, take a long step.',
  'Разгибания ног в тренажёре': 'Leg extension', 'Задержка в верхней точке, медленно вниз.': 'Hold at the top, lower slowly.',
  'Фронтальные приседания': 'Front squat', 'Локти высоко, корпус вертикально.': 'Elbows high, torso upright.',
  'Гоблет-присед': 'Goblet squat', 'Гантель у груди, садись между коленей.': 'Dumbbell at your chest, sit down between your knees.',
  'Румынская тяга': 'Romanian deadlift', 'Отводи таз назад, гриф скользит по бёдрам.': 'Push your hips back, the bar slides along your thighs.',
  'Сгибание ног лёжа': 'Lying leg curl', 'Таз прижат к скамье.': 'Hips pressed into the bench.',
  'Сгибание ног сидя': 'Seated leg curl', 'Медленная негативная фаза.': 'Slow lowering phase.',
  'Нордические сгибания': 'Nordic curls', 'Медленно опускайся вперёд, страхуй руками.': 'Lower forward slowly, catch yourself with your hands.',
  'Сведение ног в тренажёре': 'Hip adduction machine', 'Своди бёдра медленно, без рывков, задержись в конце.': 'Squeeze your thighs together slowly, no jerking, hold at the end.',
  'Сумо-приседания с гантелью': 'Dumbbell sumo squat', 'Широкая постановка ног, носки наружу, колени по линии носков.': 'Wide stance, toes out, knees in line with toes.',
  'Боковые выпады': 'Side lunges', 'Шаг в сторону, вес на пятку, вторая нога прямая.': 'Step to the side, weight on your heel, other leg straight.',
  'Подъёмы на носки стоя': 'Standing calf raise', 'Полная амплитуда, пауза вверху.': 'Full range of motion, pause at the top.',
  'Подъёмы на носки сидя': 'Seated calf raise', 'Нагружает камбаловидную мышцу.': 'Targets the soleus.',
  'Носки в жиме ногами': 'Leg press calf raise', 'Толкай платформу только носками.': 'Push the platform with your toes only.',
  'Повторы = секунды прыжков.': 'Reps = seconds of jumping.',
};

// ---------- перевод ----------
const CYR = /[А-Яа-яЁё]/;
const exact = new Map(Object.entries(EN));
// фрагменты: длинные первые, только целыми словами
const frags = Object.keys(EN).sort((a, b) => b.length - a.length);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const FRAG_RE = new RegExp(`(?<![А-Яа-яЁё])(${frags.map(esc).join('|')})(?![А-Яа-яЁё])`, 'g');

export function tr(s) {
  if (!isEn || !s || !CYR.test(s)) return s;
  const t = s.trim();
  const hit = exact.get(t);
  if (hit !== undefined) return s.replace(t, hit);
  return s.replace(FRAG_RE, (m) => EN[m] ?? m);
}

const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA']);
function translateNode(node) {
  if (node.nodeType === 3) {
    if (CYR.test(node.data) && !SKIP.has(node.parentNode?.nodeName) && !node.parentNode?.closest?.('[data-no-tr]')) {
      const v = tr(node.data);
      if (v !== node.data) node.data = v;
    }
    return;
  }
  if (node.nodeType !== 1 || SKIP.has(node.nodeName)) return;
  if (node.closest('[data-no-tr]')) return;
  for (const a of ATTRS) {
    const v = node.getAttribute(a);
    if (v && CYR.test(v)) { const t = tr(v); if (t !== v) node.setAttribute(a, t); } // только если изменилось — иначе бесконечный цикл наблюдателя
  }
  if (node.nodeName === 'INPUT' && (node.type === 'button' || node.type === 'submit') && CYR.test(node.value)) { const t = tr(node.value); if (t !== node.value) node.value = t; }
  const w = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n = w.nextNode();
  while (n) { if (n !== node) translateNode(n); n = w.nextNode(); }
}

// Запуск: переводит то, что уже на странице, и всё, что появится потом.
export function startI18n() {
  document.documentElement.lang = LANG;
  if (!isEn) return;
  document.title = tr(document.title);
  translateNode(document.body);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') translateNode(m.target);
      else m.addedNodes.forEach(translateNode);
      if (m.type === 'attributes') translateNode(m.target);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

// Для отладки: русские тексты, оставшиеся на экране (в консоли: (await import('./js/i18n.js')).leftovers()).
export function leftovers() {
  const out = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n = w.nextNode();
  while (n) { if (CYR.test(n.data) && !n.parentNode.closest('[data-no-tr]')) out.add(n.data.trim()); n = w.nextNode(); }
  document.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach((el) => ATTRS.forEach((a) => { const v = el.getAttribute(a); if (v && CYR.test(v)) out.add(`@${a}: ${v}`); }));
  return [...out];
}
