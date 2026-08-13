/**
 * Minimal translation helper for API-generated, user-facing content.
 *
 * Workouts are built on the server (day names, warmup/cooldown checklists,
 * set metadata, rest-day messages), so those strings have to be localized here
 * rather than in the React app.
 */

export const SUPPORTED_LOCALES = ['en', 'ru', 'lv', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

/** English language names, used when instructing the AI which language to use. */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  ru: 'Russian',
  lv: 'Latvian',
  es: 'Spanish',
};

type Dictionary = Record<string, string>;

const en: Dictionary = {
  'day.0': 'Sunday',
  'day.1': 'Monday',
  'day.2': 'Tuesday',
  'day.3': 'Wednesday',
  'day.4': 'Thursday',
  'day.5': 'Friday',
  'day.6': 'Saturday',

  'warmup.name': 'Warmup',
  'warmup.1.text': 'Walking in place — 1 min',
  'warmup.1.desc': 'Brisk steps, raise your knees.',
  'warmup.2.text': 'Arm circles — 10 each direction',
  'warmup.2.desc': 'Straight arms, maximum range.',
  'warmup.3.text': 'Elbow circles — 10 each',
  'warmup.3.desc': 'Arms forward, rotate forearms.',
  'warmup.4.text': 'Torso bends — 5 each direction',
  'warmup.4.desc': 'Standing straight, lean forward, back, sides.',
  'warmup.5.text': 'Hip circles — 10 each direction',
  'warmup.5.desc': 'Hands on hips, wide circles.',

  'cooldown.name': 'Cooldown & Stretch',
  'cooldown.1.text': 'Chest stretch — 20s per side',
  'cooldown.1.desc': 'Forearm against doorframe, lean forward.',
  'cooldown.2.text': 'Quad stretch — 20s per leg',
  'cooldown.2.desc': 'Pull heel to glute, keep knees together.',
  'cooldown.3.text': 'Seated forward fold — 30s',
  'cooldown.3.desc': 'Legs straight, reach for toes.',
  'cooldown.4.text': 'Hip flexor stretch — 20s per side',
  'cooldown.4.desc': 'Knee on floor, other leg at 90°.',
  'cooldown.5.text': 'Cat-cow — 10 reps',
  'cooldown.5.desc': 'On all fours: arch down (inhale), round up (exhale).',
  'cooldown.6.text': 'Lying spinal twist — 20s per side',
  'cooldown.6.desc': 'On back, cross leg over.',
  'cooldown.7.text': "Child's pose — 30s",
  'cooldown.7.desc': 'Sit on heels, arms forward.',

  'meta.hold': 'Hold · {{seconds}}s',
  'meta.set': 'Level {{level}} · Set {{set}} of {{total}}',
  'technique.tempo': 'Tempo {{tempo}}. Maintain form throughout.',

  'workout.restDay': 'Rest day — no workouts scheduled.',
  'error.userNotFound': 'User not found. Visit /app/profile first.',
  'error.noSchedule': 'No schedule configured. Set up your weekly plan first.',
};

const ru: Dictionary = {
  'day.0': 'Воскресенье',
  'day.1': 'Понедельник',
  'day.2': 'Вторник',
  'day.3': 'Среда',
  'day.4': 'Четверг',
  'day.5': 'Пятница',
  'day.6': 'Суббота',

  'warmup.name': 'Разминка',
  'warmup.1.text': 'Ходьба на месте — 1 мин',
  'warmup.1.desc': 'Бодрый шаг, поднимайте колени.',
  'warmup.2.text': 'Круговые движения руками — по 10 в каждую сторону',
  'warmup.2.desc': 'Руки прямые, максимальная амплитуда.',
  'warmup.3.text': 'Вращения в локтях — по 10',
  'warmup.3.desc': 'Руки вперёд, вращайте предплечья.',
  'warmup.4.text': 'Наклоны корпуса — по 5 в каждую сторону',
  'warmup.4.desc': 'Стоя прямо: вперёд, назад, в стороны.',
  'warmup.5.text': 'Вращения тазом — по 10 в каждую сторону',
  'warmup.5.desc': 'Руки на поясе, широкие круги.',

  'cooldown.name': 'Заминка и растяжка',
  'cooldown.1.text': 'Растяжка груди — 20 сек на сторону',
  'cooldown.1.desc': 'Предплечье в дверной проём, наклонитесь вперёд.',
  'cooldown.2.text': 'Растяжка квадрицепса — 20 сек на ногу',
  'cooldown.2.desc': 'Притяните пятку к ягодице, колени вместе.',
  'cooldown.3.text': 'Наклон вперёд сидя — 30 сек',
  'cooldown.3.desc': 'Ноги прямые, тянитесь к носкам.',
  'cooldown.4.text': 'Растяжка сгибателей бедра — 20 сек на сторону',
  'cooldown.4.desc': 'Колено на полу, вторая нога под 90°.',
  'cooldown.5.text': 'Кошка-корова — 10 повторений',
  'cooldown.5.desc': 'На четвереньках: прогиб (вдох), округление (выдох).',
  'cooldown.6.text': 'Скручивание лёжа — 20 сек на сторону',
  'cooldown.6.desc': 'Лёжа на спине, перекиньте ногу через себя.',
  'cooldown.7.text': 'Поза ребёнка — 30 сек',
  'cooldown.7.desc': 'Сядьте на пятки, руки вперёд.',

  'meta.hold': 'Удержание · {{seconds}} сек',
  'meta.set': 'Уровень {{level}} · Подход {{set}} из {{total}}',
  'technique.tempo': 'Темп {{tempo}}. Сохраняйте технику до конца.',

  'workout.restDay': 'День отдыха — тренировок не запланировано.',
  'error.userNotFound': 'Профиль не найден. Сначала откройте /app/profile.',
  'error.noSchedule': 'Расписание не настроено. Сначала составьте недельный план.',
};

const lv: Dictionary = {
  'day.0': 'Svētdiena',
  'day.1': 'Pirmdiena',
  'day.2': 'Otrdiena',
  'day.3': 'Trešdiena',
  'day.4': 'Ceturtdiena',
  'day.5': 'Piektdiena',
  'day.6': 'Sestdiena',

  'warmup.name': 'Iesildīšanās',
  'warmup.1.text': 'Soļošana uz vietas — 1 min',
  'warmup.1.desc': 'Možs solis, cel ceļgalus augstu.',
  'warmup.2.text': 'Roku apļi — 10 katrā virzienā',
  'warmup.2.desc': 'Taisnas rokas, maksimāla amplitūda.',
  'warmup.3.text': 'Elkoņu apļi — pa 10',
  'warmup.3.desc': 'Rokas uz priekšu, groza apakšdelmus.',
  'warmup.4.text': 'Rumpja noliekšanās — pa 5 katrā virzienā',
  'warmup.4.desc': 'Stāvot taisni: uz priekšu, atpakaļ, uz sāniem.',
  'warmup.5.text': 'Gurnu apļi — 10 katrā virzienā',
  'warmup.5.desc': 'Rokas uz gurniem, plaši apļi.',

  'cooldown.name': 'Atsildīšanās un stiepšanās',
  'cooldown.1.text': 'Krūšu stiepšana — 20 s katrā pusē',
  'cooldown.1.desc': 'Apakšdelms pret durvju stenderi, noliecies uz priekšu.',
  'cooldown.2.text': 'Augšstilba priekšpuses stiepšana — 20 s katrai kājai',
  'cooldown.2.desc': 'Velc papēdi pie sēžas, ceļgali kopā.',
  'cooldown.3.text': 'Noliekšanās uz priekšu sēdus — 30 s',
  'cooldown.3.desc': 'Kājas taisnas, sniedzies pie pēdām.',
  'cooldown.4.text': 'Gurnu locītāju stiepšana — 20 s katrā pusē',
  'cooldown.4.desc': 'Ceļgals uz grīdas, otra kāja 90° leņķī.',
  'cooldown.5.text': 'Kaķis–govs — 10 atkārtojumi',
  'cooldown.5.desc': 'Četrrāpus: izliec muguru (ieelpa), noapaļo (izelpa).',
  'cooldown.6.text': 'Mugurkaula skrūve guļus — 20 s katrā pusē',
  'cooldown.6.desc': 'Guļot uz muguras, pārliec kāju pāri.',
  'cooldown.7.text': 'Bērna poza — 30 s',
  'cooldown.7.desc': 'Sēdi uz papēžiem, rokas uz priekšu.',

  'meta.hold': 'Noturēšana · {{seconds}} s',
  'meta.set': 'Līmenis {{level}} · {{set}}. piegājiens no {{total}}',
  'technique.tempo': 'Temps {{tempo}}. Saglabā tehniku līdz galam.',

  'workout.restDay': 'Atpūtas diena — treniņi nav ieplānoti.',
  'error.userNotFound': 'Lietotājs nav atrasts. Vispirms atveriet /app/profile.',
  'error.noSchedule': 'Grafiks nav izveidots. Vispirms izveidojiet nedēļas plānu.',
};

const es: Dictionary = {
  'day.0': 'Domingo',
  'day.1': 'Lunes',
  'day.2': 'Martes',
  'day.3': 'Miércoles',
  'day.4': 'Jueves',
  'day.5': 'Viernes',
  'day.6': 'Sábado',

  'warmup.name': 'Calentamiento',
  'warmup.1.text': 'Caminar en el sitio — 1 min',
  'warmup.1.desc': 'Pasos enérgicos, levanta las rodillas.',
  'warmup.2.text': 'Círculos de brazos — 10 en cada dirección',
  'warmup.2.desc': 'Brazos rectos, máximo recorrido.',
  'warmup.3.text': 'Círculos de codos — 10 de cada',
  'warmup.3.desc': 'Brazos al frente, gira los antebrazos.',
  'warmup.4.text': 'Flexiones de torso — 5 en cada dirección',
  'warmup.4.desc': 'De pie erguido: adelante, atrás y a los lados.',
  'warmup.5.text': 'Círculos de cadera — 10 en cada dirección',
  'warmup.5.desc': 'Manos en las caderas, círculos amplios.',

  'cooldown.name': 'Vuelta a la calma y estiramientos',
  'cooldown.1.text': 'Estiramiento de pecho — 20 s por lado',
  'cooldown.1.desc': 'Antebrazo en el marco de la puerta, inclínate al frente.',
  'cooldown.2.text': 'Estiramiento de cuádriceps — 20 s por pierna',
  'cooldown.2.desc': 'Lleva el talón al glúteo, rodillas juntas.',
  'cooldown.3.text': 'Flexión sentado hacia delante — 30 s',
  'cooldown.3.desc': 'Piernas rectas, alcanza los pies.',
  'cooldown.4.text': 'Estiramiento de flexores de cadera — 20 s por lado',
  'cooldown.4.desc': 'Rodilla en el suelo, la otra pierna a 90°.',
  'cooldown.5.text': 'Gato-vaca — 10 repeticiones',
  'cooldown.5.desc': 'A cuatro patas: arquea (inhala), redondea (exhala).',
  'cooldown.6.text': 'Torsión espinal tumbado — 20 s por lado',
  'cooldown.6.desc': 'Boca arriba, cruza la pierna por encima.',
  'cooldown.7.text': 'Postura del niño — 30 s',
  'cooldown.7.desc': 'Siéntate sobre los talones, brazos al frente.',

  'meta.hold': 'Mantener · {{seconds}} s',
  'meta.set': 'Nivel {{level}} · Serie {{set}} de {{total}}',
  'technique.tempo': 'Tempo {{tempo}}. Mantén la técnica en todo momento.',

  'workout.restDay': 'Día de descanso: no hay entrenamientos programados.',
  'error.userNotFound': 'Usuario no encontrado. Visita /app/profile primero.',
  'error.noSchedule': 'No hay horario configurado. Configura primero tu plan semanal.',
};

const DICTIONARIES: Record<Locale, Dictionary> = { en, ru, lv, es };

function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Normalizes an arbitrary language tag ("ru-RU", "ES") to a supported locale. */
export function normalizeLocale(value: unknown): Locale {
  if (typeof value !== 'string') return DEFAULT_LOCALE;
  const base = value.toLowerCase().split('-')[0].trim();
  return isSupportedLocale(base) ? base : DEFAULT_LOCALE;
}

/**
 * Picks the best supported locale from an Accept-Language header,
 * honouring quality values. Returns null when nothing matches.
 */
export function localeFromAcceptLanguage(header: unknown): Locale | null {
  if (typeof header !== 'string' || !header.trim()) return null;

  const candidates = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith('q='));
      const quality = q ? Number.parseFloat(q.slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter((c) => c.tag && c.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const candidate of candidates) {
    const base = candidate.tag.split('-')[0];
    if (isSupportedLocale(base)) return base;
  }
  return null;
}

/**
 * Resolves the locale to use for generated content: the user's saved locale
 * wins, then the browser's Accept-Language header, then English.
 */
export function resolveLocale(userLocale: unknown, acceptLanguage?: unknown): Locale {
  if (typeof userLocale === 'string' && isSupportedLocale(userLocale.toLowerCase().split('-')[0])) {
    return normalizeLocale(userLocale);
  }
  return localeFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}

/** Translates `key` into `locale`, falling back to English then the key itself. */
export function t(locale: Locale, key: string, params: Record<string, string | number> = {}): string {
  const template = DICTIONARIES[locale]?.[key] ?? en[key] ?? key;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
