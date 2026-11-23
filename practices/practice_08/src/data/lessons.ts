import type { Lesson, Question, Rule, Word } from '@/domain/types'

const schoolWords = {
  label: 'Электронное образование Республики Татарстан: словарный минимум «Татарча сөйләшәбез»',
  url: 'https://edu.tatar.ru/upload/storage/org3639/files/%D0%98%D0%B3%D1%80%D1%8B%20%D0%B8%20%D1%81%D0%BB%D0%BE%D0%B2%D0%B0%D1%80%D0%BD%D1%8B%D0%B9%20%D0%BC%D0%B8%D0%BD%D0%B8%D0%BC%D1%83%D0%BC%20%D0%BF%D0%BE%20%D0%BF%D1%80%D0%BE%D0%B5%D0%BA%D1%82%D1%83%20%D0%91%D0%95%D0%97%20%D0%98%D0%9D%D0%94%D0%95%20%D0%A5%D3%98%D0%97%D0%95%D0%A0%20%D0%97%D0%A3%D0%A0%D0%9B%D0%90%D0%A0%2C%20%D0%9C%D3%98%D0%9A%D0%A2%D3%98%D0%9F%D0%9A%D3%98%20%D0%98%D0%9B%D0%A2%D3%98%20%D0%AE%D0%9B%D0%9B%D0%90%D0%A0%20%D0%B4%D0%BB%D1%8F%20%D0%B4%D0%B5%D1%82%D0%B5%D0%B9%206-7%20%D0%BB%D0%B5%D1%82.pdf',
}
const grammarSource = {
  label: 'Р. З. Хәйдәрова и др., «Татарский язык», 4 класс, часть 1, ЭО РТ',
  url: 'https://edu.tatar.ru/upload/storage/org6297/files/4_klass_Tatarskii_774_yazyk_Khai_774_darova_TMF_1_chast_compressed.pdf',
}
const greetingSource = {
  label: 'Татарская энциклопедия TATARICA: «Междометие»',
  url: 'https://tatarica.org/ru/razdely/narody/tatary/tatarskij-yazyk/sovremennyj-tatarskij-literaturnyj-yazyk/mezhdometie',
}
const schoolSource = {
  label: 'Электронное образование Республики Татарстан: рекомендации для родителей',
  url: 'https://edu.tatar.ru/upload/storage/org3601/files/%D0%A0%D0%B5%D0%BA%D0%BE%D0%BC%D0%B5%D0%BD%D0%B4%D0%B0%D1%86%D0%B8%D0%B8%20%D0%B4%D0%BB%D1%8F%20%D1%80%D0%BE%D0%B4%D0%B8%D1%82%D0%B5%D0%BB%D0%B5%D0%B9%206-7%20%D0%BB%D0%B5%D1%82.pdf',
}

export const lessons: Lesson[] = [
  {
    id: 'books', title: 'Книга и тетрадь', description: 'Два слова и первое правило',
    words: [
      { id: 'book', tatar: 'китап', russian: 'книга', example: 'Китап бар.', exampleTranslation: 'Есть книга.', source: grammarSource },
      { id: 'notebook', tatar: 'дәфтәр', russian: 'тетрадь', example: 'Дәфтәр кирәк.', exampleTranslation: 'Нужна тетрадь.', source: schoolSource },
    ],
    rule: { id: 'plural', title: 'Множественное число', explanation: 'Для этих слов множественное число образуется с помощью -лар или -ләр: китап → китаплар, дәфтәр → дәфтәрләр.', example: 'китаплар · дәфтәрләр', exampleTranslation: 'книги · тетради', source: grammarSource },
    questions: [
      { id: 'book-choice', itemId: 'book', type: 'choice', prompt: 'Как переводится «китап»?', subtitle: 'Выберите один ответ', options: ['книга', 'тетрадь', 'школа'], accepted: ['книга'], explanation: 'Китап — книга.' },
      { id: 'notebook-input', itemId: 'notebook', type: 'input', prompt: 'Переведите «дәфтәр» на русский', subtitle: 'Введите одно слово', accepted: ['тетрадь'], explanation: 'Дәфтәр — тетрадь.' },
      { id: 'plural-choice', itemId: 'plural', type: 'grammar', prompt: 'Как сказать «книги»?', subtitle: 'Выберите форму слова «китап»', options: ['китаплар', 'китапләр', 'китапнар'], accepted: ['китаплар'], explanation: 'После китап используется -лар: китаплар.' },
    ],
  },
  {
    id: 'school', title: 'В школе', description: 'Узнаём слово «мәктәп»',
    words: [{ id: 'school-word', tatar: 'мәктәп', russian: 'школа', example: 'Мәктәп.', exampleTranslation: 'Школа.', source: schoolSource }],
    questions: [
      { id: 'school-choice', itemId: 'school-word', type: 'choice', prompt: 'Как переводится «мәктәп»?', subtitle: 'Выберите один ответ', options: ['школа', 'книга', 'тетрадь'], accepted: ['школа'], explanation: 'Мәктәп — школа.' },
      { id: 'school-input', itemId: 'school-word', type: 'input', prompt: 'Переведите «мәктәп» на русский', subtitle: 'Введите одно слово', accepted: ['школа'], explanation: 'Мәктәп — школа.' },
    ],
  },
  {
    id: 'greetings', title: 'Приветствие и прощание', description: 'Две полезные фразы',
    words: [
      { id: 'hello', tatar: 'исәнме', russian: 'здравствуй', example: 'Исәнме!', exampleTranslation: 'Здравствуй!', source: greetingSource },
      { id: 'goodbye', tatar: 'сау бул', russian: 'до свидания', example: 'Сау бул!', exampleTranslation: 'До свидания!', source: greetingSource },
    ],
    questions: [
      { id: 'hello-choice', itemId: 'hello', type: 'choice', prompt: 'Как переводится «исәнме»?', subtitle: 'Выберите один ответ', options: ['здравствуй', 'до свидания', 'спасибо'], accepted: ['здравствуй'], explanation: 'Исәнме — здравствуй.' },
      { id: 'goodbye-input', itemId: 'goodbye', type: 'input', prompt: 'Переведите «сау бул» на русский', subtitle: 'Введите перевод', accepted: ['до свидания'], explanation: 'Сау бул — до свидания.' },
    ],
  },
]

export const allQuestions: Question[] = lessons.flatMap(lesson => lesson.questions)
export const reviewQuestions: Question[] = [
  { id: 'review-book', itemId: 'book', type: 'choice', prompt: 'Вспомните: «китап»', subtitle: 'Выберите перевод', options: ['книга', 'школа', 'тетрадь'], accepted: ['книга'], explanation: 'Китап — книга.' },
  { id: 'review-notebook', itemId: 'notebook', type: 'input', prompt: 'Вспомните: «дәфтәр»', subtitle: 'Введите перевод', accepted: ['тетрадь'], explanation: 'Дәфтәр — тетрадь.' },
  { id: 'review-plural', itemId: 'plural', type: 'grammar', prompt: 'Вспомните форму «книги»', subtitle: 'Выберите перевод', options: ['китаплар', 'китапләр', 'китапнар'], accepted: ['китаплар'], explanation: 'Китаплар — книги.' },
  { id: 'review-school', itemId: 'school-word', type: 'input', prompt: 'Вспомните: «мәктәп»', subtitle: 'Введите перевод', accepted: ['школа'], explanation: 'Мәктәп — школа.' },
  { id: 'review-hello', itemId: 'hello', type: 'choice', prompt: 'Вспомните: «исәнме»', subtitle: 'Выберите перевод', options: ['здравствуй', 'до свидания', 'спасибо'], accepted: ['здравствуй'], explanation: 'Исәнме — здравствуй.' },
  { id: 'review-goodbye', itemId: 'goodbye', type: 'input', prompt: 'Вспомните: «сау бул»', subtitle: 'Введите перевод', accepted: ['до свидания'], explanation: 'Сау бул — до свидания.' },
]
