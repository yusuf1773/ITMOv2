import { useEffect, useRef, useState } from 'react'
import { lessons, reviewQuestions } from '@/data/lessons'
import { checkAnswer, validateAnswer } from '@/domain/lesson'
import type { Answer, Lesson, Progress, Question, SessionResult } from '@/domain/types'
import { dueCount, loadProgress, saveResult, selectFreeIds, selectReviewIds } from '@/storage/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Icon, LessonArt, Mascot, Ornament } from '@/components/Artwork'

type Page = 'course' | 'words' | 'grammar' | 'exercise' | 'result' | 'empty' | 'reviewIntro'
type Session = { kind: SessionResult['kind']; lesson?: Lesson; questions: Question[]; baseCount: number }
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
const countCorrect = (answers: Answer[]) => answers.filter(answer => answer.correct).length

export default function App() {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [page, setPage] = useState<Page>('course')
  const [session, setSession] = useState<Session | null>(null)
  const [wordIndex, setWordIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [validation, setValidation] = useState('')
  const [checked, setChecked] = useState<Answer | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [result, setResult] = useState<SessionResult | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [imageError, setImageError] = useState(false)
  const saving = useRef(false)

  const reload = () => {
    try { setProgress(loadProgress()); setLoadError(false) }
    catch { setLoadError(true) }
  }
  useEffect(() => { reload() }, [])

  const resetAnswer = () => { setAnswer(''); setValidation(''); setChecked(null) }
  const goCourse = () => { setSession(null); setPage('course'); resetAnswer(); reload() }

  const startLesson = (lesson: Lesson) => {
    setSession({ kind: 'lesson', lesson, questions: [...lesson.questions], baseCount: lesson.questions.length })
    setWordIndex(0); setQuestionIndex(0); setAnswers([]); setResult(null); setSaveStatus('idle'); resetAnswer(); setPage('words')
  }

  const startReview = (forceFree = false) => {
    if (!progress) return
    const due = selectReviewIds(progress)
    if (!due.length && !forceFree && Object.keys(progress.review).length) { setPage('reviewIntro'); return }
    const kind = due.length && !forceFree ? 'review' : 'free'
    const ids = kind === 'review' ? due : selectFreeIds(progress)
    if (!ids.length) { setPage('empty'); return }
    const questions = ids.map(id => reviewQuestions.find(question => question.itemId === id)).filter((question): question is Question => Boolean(question))
    setSession({ kind, questions, baseCount: questions.length })
    setQuestionIndex(0); setAnswers([]); setResult(null); setSaveStatus('idle'); resetAnswer(); setPage('exercise')
  }

  const nextWord = () => {
    if (!session?.lesson) return
    if (wordIndex < session.lesson.words.length - 1) setWordIndex(wordIndex + 1)
    else setPage(session.lesson.rule ? 'grammar' : 'exercise')
  }

  const currentQuestion = session?.questions[questionIndex]
  const submitAnswer = () => {
    if (!currentQuestion || checked) return
    const error = validateAnswer(currentQuestion, answer)
    if (error) { setValidation(error); return }
    setChecked(checkAnswer(currentQuestion, answer))
  }

  const nextQuestion = () => {
    if (!session || !checked) return
    const updatedAnswers = [...answers, checked]
    setAnswers(updatedAnswers)
    const updatedQuestions = [...session.questions]
    if (session.kind !== 'lesson' && !checked.correct && !answers.some(item => item.itemId === checked.itemId)) {
      updatedQuestions.push(currentQuestion!)
      setSession({ ...session, questions: updatedQuestions })
    }
    if (questionIndex + 1 < updatedQuestions.length) {
      setQuestionIndex(questionIndex + 1)
      resetAnswer()
    } else {
      const finished: SessionResult = { id: newId(), kind: session.kind, lessonId: session.lesson?.id, answers: updatedAnswers }
      setResult(finished); setSaveStatus('idle'); setPage('result')
    }
  }

  const persist = async (finished: SessionResult) => {
    if (saving.current) return
    saving.current = true
    setSaveStatus('saving')
    try {
      let saved: Progress | null = null
      for (let attempt = 0; attempt < 2; attempt++) {
        try { saved = await saveResult(finished); break }
        catch { if (attempt === 0) await new Promise(resolve => window.setTimeout(resolve, 250)) }
      }
      if (!saved) throw new Error('Не удалось сохранить прогресс')
      setProgress(saved); setSaveStatus('saved')
    } catch { setSaveStatus('error') }
    finally { saving.current = false }
  }
  useEffect(() => { if (result) void persist(result) }, [result?.id])

  const blockedNavigation = page === 'result' && saveStatus !== 'saved'
  const completed = progress?.completedLessonIds.length ?? 0
  const due = progress ? dueCount(progress) : 0

  return <div className="min-h-screen bg-[#F8FAF7] font-sans text-[#17212B]">
    <header className="border-b border-[#e3e9e1] bg-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 py-4 lg:px-8">
        <Button variant="ghost" className="gap-3 px-1 text-xl font-bold tracking-tight" onClick={goCourse} disabled={blockedNavigation} aria-label="Татарча — на главную">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F766E] text-[#F5B942]"><Icon name="leaf"/></span>Татарча
        </Button>
        <nav className="flex gap-2" aria-label="Главная навигация">
          <Button variant="secondary" onClick={goCourse} disabled={blockedNavigation}>Мой курс</Button>
          <Button variant="secondary" onClick={() => startReview()} disabled={blockedNavigation || !progress}>Повторить{due > 0 ? ` · ${due}` : ''}</Button>
        </nav>
      </div>
    </header>

    <main className="mx-auto max-w-[1200px] px-5 pb-10 pt-7 lg:px-8">
      {loadError ? <Card className="mx-auto max-w-xl"><CardContent className="py-8 text-center">
        <div className="flex justify-center"><Mascot mood="wrong"/></div>
        <h1 className="mt-4 text-2xl font-bold">Не удалось загрузить прогресс</h1>
        <p className="mt-3 text-slate-600">Проверьте доступ к данным браузера и попробуйте снова.</p>
        <Button className="mt-6" onClick={reload}>Попробовать снова</Button>
      </CardContent></Card> : !progress ? <p role="status" className="py-16 text-center">Загружаем курс…</p> : page === 'course' ? <>
        <section className="relative mb-9 flex min-h-[304px] flex-col-reverse overflow-hidden rounded-3xl border border-[#e1e7d9] bg-[#f0f4e9] md:block">
          {!imageError ? <img src="/images/welcome.png" alt="Белый барс на фоне Казани" onError={() => setImageError(true)} className="h-52 w-full object-cover object-right md:absolute md:right-0 md:top-0 md:h-full md:w-[67%]"/> : <div className="flex justify-center md:absolute md:right-6 md:bottom-0"><Mascot/></div>}
          <div className="relative z-10 w-full bg-linear-to-r from-[#f0f4e9] via-[#f0f4e9]/95 to-[#f0f4e9]/10 p-6 md:w-[61%] md:p-10">
            <span className="inline-block rounded-full bg-white/90 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[#4c6750]">Язык ближе, чем кажется</span>
            <h1 className="mt-4 text-[32px] font-bold leading-tight tracking-tight md:text-[40px]">Каждый день —<br/>чуть ближе к татарскому</h1>
            <p className="mt-4 max-w-[365px] leading-7 text-[#526154]">Слова, небольшие открытия и радость понимания. Продолжим вместе?</p>
            <div className="mt-6"><Ornament/></div>
          </div>
        </section>
        <div className="grid gap-7 lg:grid-cols-[1fr_300px]">
          <section>
            <div className="mb-5 flex items-end justify-between gap-3"><h2 className="text-2xl font-bold">Мой курс</h2><span className="text-sm text-slate-600">Начальный уровень</span></div>
            <Card className="mb-6"><CardContent><p className="font-semibold">Пройдено {completed} из {lessons.length} уроков</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf0e8]"><div className="h-full bg-[#0F766E]" style={{ width: `${completed / lessons.length * 100}%` }}/></div></CardContent></Card>
            <div className="grid gap-4 md:grid-cols-3">{lessons.map((lesson, index) => {
              const done = progress.completedLessonIds.includes(lesson.id)
              const available = index === 0 || progress.completedLessonIds.includes(lessons[index - 1].id)
              return <Card key={lesson.id} className={`overflow-hidden p-0 ${available && !done ? 'ring-2 ring-[#0F766E]' : ''}`}>
                <div className={`flex h-36 items-center justify-center ${index === 0 ? 'bg-[#eff4e7]' : index === 1 ? 'bg-[#faf5e8]' : 'bg-[#f0f1ed]'}`}><LessonArt kind={index === 0 ? 1 : index}/></div>
                <CardContent className="flex flex-1 flex-col py-5"><span className="text-xs font-semibold uppercase tracking-widest text-slate-600">Урок {index + 1}</span><h3 className="mt-2 text-lg font-bold">{lesson.title}</h3><p className="mb-5 mt-2 flex-1 text-sm leading-6 text-slate-600">{lesson.description}</p>
                  <Button variant={done ? 'secondary' : 'default'} disabled={!available} onClick={() => startLesson(lesson)}>{done ? 'Пройти ещё раз' : available ? 'Начать урок' : 'Закрыт'}</Button>
                </CardContent>
              </Card>
            })}</div>
          </section>
          <aside><Card className="bg-[#edf4ed]"><CardContent className="py-2"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#0F766E]"><Icon name="repeat"/></span><h2 className="mt-4 text-xl font-bold">Вспомним изученное?</h2><p className="mt-2 text-sm leading-6 text-[#526154]">{due > 0 ? `Сейчас доступно ${due} заданий.` : completed ? 'По расписанию пока нет заданий. Можно потренироваться свободно.' : 'Завершите первый урок, чтобы открыть повторение.'}</p><Button className="mt-6 w-full" onClick={() => startReview()} disabled={completed === 0}>Повторить</Button></CardContent></Card></aside>
        </div>
      </> : page === 'empty' ? <Card className="mx-auto max-w-xl"><CardContent className="py-8 text-center"><div className="flex justify-center"><Mascot mood="finish"/></div><h1 className="mt-5 text-3xl font-bold">Пока нечего повторять</h1><p className="mt-4 text-slate-600">Завершите первый урок, и здесь появятся слова и правила.</p><Button className="mt-6" onClick={goCourse}>К курсу</Button></CardContent></Card> : page === 'reviewIntro' ? <Card className="mx-auto max-w-xl"><CardContent className="py-8 text-center"><div className="flex justify-center"><Mascot mood="finish"/></div><h1 className="mt-5 text-3xl font-bold">На сегодня всё повторено</h1><p className="mt-4 text-slate-600">По расписанию заданий нет. Можно потренироваться ещё.</p><Button className="mt-6 w-full" onClick={() => startReview(true)}>Потренироваться</Button><Button variant="secondary" className="mt-3 w-full" onClick={goCourse}>К курсу</Button></CardContent></Card> : <section className="mx-auto max-w-[800px]">
        <div className="mb-5 flex items-center justify-between gap-3"><Button variant="secondary" onClick={goCourse} disabled={blockedNavigation}>← К курсу</Button><span className="text-sm text-slate-600">{session?.kind === 'lesson' ? session.lesson?.title : 'Повторение'}</span></div>
        {session?.kind === 'lesson' && page !== 'result' && <div className="mb-6 flex gap-2" aria-label="Этапы урока">{[...['Слова'], ...(session.lesson?.rule ? ['Правило'] : []), 'Практика', 'Результат'].map((stage, index, stages) => <div key={stage} className="flex-1"><div className={`mb-2 h-1.5 rounded-full ${index <= (page === 'words' ? 0 : page === 'grammar' ? 1 : stages.length - 2) ? 'bg-[#0F766E]' : 'bg-[#e2e8df]'}`}/><span className="text-xs text-slate-600">{stage}</span></div>)}</div>}
        <Card><CardContent className="py-5 md:py-8">
          {page === 'words' && session?.lesson && <>
            <span className="text-sm font-semibold text-[#0F766E]">НОВЫЕ СЛОВА · {wordIndex + 1} ИЗ {session.lesson.words.length}</span>
            <div className="my-6 flex justify-center rounded-2xl bg-[#f6f5e9] py-8"><LessonArt kind={lessons.indexOf(session.lesson) === 0 ? 1 : lessons.indexOf(session.lesson)}/></div>
            <h1 className="text-3xl font-bold">{session.lesson.words[wordIndex].tatar}</h1>
            <p className="mt-3 text-xl text-slate-600">{session.lesson.words[wordIndex].russian}</p>
            <div className="my-6 rounded-2xl bg-[#f1f6ef] p-5"><p className="text-sm font-semibold text-[#0F766E]">В КОНТЕКСТЕ</p><p className="mt-3 text-lg">{session.lesson.words[wordIndex].example}</p><p className="mt-2 text-slate-600">{session.lesson.words[wordIndex].exampleTranslation}</p></div>
            <a className="text-sm text-[#0F766E] underline focus-visible:outline-2" href={session.lesson.words[wordIndex].source.url} target="_blank" rel="noreferrer">Источник: {session.lesson.words[wordIndex].source.label}</a>
            <Button className="mt-7 w-full" onClick={nextWord}>{wordIndex + 1 < session.lesson.words.length ? 'Следующее слово' : session.lesson.rule ? 'К правилу' : 'К упражнениям'}</Button>
          </>}
          {page === 'grammar' && session?.lesson?.rule && <>
            <span className="text-sm font-semibold text-[#0F766E]">НОВОЕ ПРАВИЛО</span><h1 className="mt-4 text-3xl font-bold">{session.lesson.rule.title}</h1>
            <p className="mt-6 leading-8 text-slate-600">{session.lesson.rule.explanation}</p>
            <div className="my-7 rounded-2xl border-l-4 border-[#0F766E] bg-[#f0f5ef] p-6"><p className="text-sm font-semibold text-[#0F766E]">ПРИМЕР</p><p className="mt-3 text-lg">{session.lesson.rule.example}</p><p className="mt-2 text-slate-600">{session.lesson.rule.exampleTranslation}</p></div>
            <a className="text-sm text-[#0F766E] underline focus-visible:outline-2" href={session.lesson.rule.source.url} target="_blank" rel="noreferrer">Источник: {session.lesson.rule.source.label}</a>
            <Button className="mt-7 w-full" onClick={() => setPage('exercise')}>Теперь попробуем →</Button>
          </>}
          {page === 'exercise' && currentQuestion && <>
            <div className="flex justify-between gap-3 text-sm text-slate-600"><span>{currentQuestion.type === 'grammar' ? 'Грамматика' : 'Слова'} · практика</span><span>{questionIndex + 1} из {session?.questions.length}</span></div>
            <h1 className="mt-5 text-2xl font-bold md:text-3xl">{currentQuestion.prompt}</h1><p className="mb-7 mt-3 text-slate-600">{currentQuestion.subtitle}</p>
            {currentQuestion.type === 'input' ? <div><label htmlFor="translation" className="mb-2 block font-semibold">Перевод на русский язык</label><Input id="translation" value={answer} disabled={Boolean(checked)} onChange={event => { setAnswer(event.target.value); setValidation('') }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); submitAnswer() } }} aria-invalid={Boolean(validation)} aria-describedby="input-help" className="h-14 text-base" placeholder="Введите перевод"/><p id="input-help" role={validation ? 'alert' : undefined} className={`mt-2 text-sm ${validation ? 'text-[#B42318]' : 'text-slate-600'}`}>{validation || `Не более 100 символов · ${Array.from(answer).length}/100`}</p></div>
              : <div className="space-y-3" role="group" aria-label="Варианты ответа">{currentQuestion.options?.map(option => <Button key={option} variant="secondary" disabled={Boolean(checked)} aria-pressed={answer === option} onClick={() => { setAnswer(option); setValidation('') }} className={`w-full justify-start border-2 text-left ${answer === option ? 'border-[#0F766E] bg-[#edf6f1] text-[#0F766E]' : 'border-[#e2e7de]'}`}>{option}</Button>)}</div>}
            {validation && currentQuestion.type !== 'input' && <p role="alert" className="mt-4 text-sm text-[#B42318]">{validation}</p>}
            {checked && <Alert className={`mt-6 ${checked.correct ? 'border-[#b7d9b6] bg-[#eff7eb] text-[#166534]' : 'border-[#efc3bb] bg-[#fff1eb] text-[#B42318]'}`} role="status"><div className="flex items-center gap-3"><Mascot small mood={checked.correct ? 'correct' : 'wrong'}/><div><AlertTitle className="text-lg font-bold">{checked.correct ? 'Верно!' : 'Неверно. Ничего страшного!'}</AlertTitle><AlertDescription className="mt-2 text-sm text-inherit">{checked.correct ? 'Ответ засчитан.' : `Правильный ответ: ${checked.correctAnswer}. ${currentQuestion.explanation}`}</AlertDescription></div></div></Alert>}
            <Button className="mt-7 w-full" onClick={checked ? nextQuestion : submitAnswer}>{checked ? 'Продолжить →' : 'Проверить'}</Button>
          </>}
          {page === 'result' && result && <>
            <div className="flex justify-center"><Mascot mood="finish"/></div><h1 className="text-center text-3xl font-bold">{result.kind === 'lesson' ? 'Урок завершён!' : 'Повторение завершено!'}</h1>
            <p className="mt-3 text-center text-slate-600">Вы ответили на все задания.</p>
            <div className="my-7 rounded-2xl bg-[#eef4e9] p-6 text-center"><strong className="text-3xl text-[#0F766E]">{countCorrect(result.answers)} из {result.answers.length}</strong><p className="mt-2 text-sm text-slate-600">верных ответов</p></div>
            <h2 className="mb-3 font-semibold">Что стоит повторить</h2>
            {result.answers.every(item => item.correct) ? <p className="text-sm text-[#166534]">Все ответы верны. Отличная работа!</p> : <ul className="space-y-3">{result.answers.filter(item => !item.correct).map((item, index) => <li key={`${item.questionId}-${index}`} className="rounded-xl border border-[#eadfd5] p-4 text-sm"><p>{[...lessons.flatMap(lesson => lesson.questions), ...reviewQuestions].find(question => question.id === item.questionId)?.prompt}</p><p className="mt-2 text-[#B42318]">Ваш ответ: {item.given}</p><p className="text-[#166534]">Правильно: {item.correctAnswer}</p></li>)}</ul>}
            <div role="status" className="mt-6 rounded-xl bg-[#f4f5f0] p-4 text-sm">{saveStatus === 'saving' ? 'Сохраняем прогресс…' : saveStatus === 'saved' ? '✓ Прогресс сохранён' : saveStatus === 'error' ? 'Не удалось сохранить результат. Он остаётся на экране.' : 'Подготавливаем сохранение…'}</div>
            {saveStatus === 'error' && <Button variant="link" className="mt-2" onClick={() => void persist(result)}>Повторить сейчас</Button>}
            {result.kind === 'lesson' && <p className="mt-4 text-sm text-slate-600">{saveStatus === 'saved' ? 'Следующий урок доступен.' : 'Следующий урок откроется после сохранения результата.'}</p>}
            <Button className="mt-6 w-full" disabled={saveStatus !== 'saved'} onClick={goCourse}>Вернуться к курсу</Button>
            {result.kind !== 'lesson' && <Button variant="secondary" className="mt-3 w-full" disabled={saveStatus !== 'saved'} onClick={() => startReview(true)}>Повторить ещё</Button>}
          </>}
        </CardContent></Card>
      </section>}
      <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#e2e8dd] pt-6 text-xs text-slate-600"><span>Татарча · Учиться с теплом, говорить с уверенностью</span><span>Материалы снабжены ссылками на источники</span></footer>
    </main>
  </div>
}
