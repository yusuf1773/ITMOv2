import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type Page = 'course' | 'courseError' | 'words' | 'grammar' | 'exercise' | 'result' | 'review' | 'empty';
type IconName = 'book' | 'repeat' | 'arrow' | 'check' | 'lock' | 'grid' | 'flag' | 'close' | 'sound' | 'leaf';
const button = 'min-h-11 rounded-xl px-5 py-3 font-semibold transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-4 cursor-pointer disabled:cursor-not-allowed';
const primary = `${button} bg-[#0F766E] text-white`;
const secondary = `${button} border border-[#dce4dc] bg-white text-[#34463d]`;

function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    book: <><path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z"/><path d="M12 5v15"/></>,
    repeat: <><path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    flag: <><path d="M5 21V4c5-4 9 4 14 0v10c-5 4-9-4-14 0"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    sound: <><path d="m11 5-6 4H2v6h3l6 4Zm5 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,
    leaf: <><path d="M12 21V9m0 6C2 17 2 6 3 4c7 0 10 4 9 11Zm0-4C11 3 18 2 21 3c1 6-3 10-9 8Z"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 shrink-0 ${className}`} aria-hidden="true">{paths[name]}</svg>;
}

function Ornament() {
  return <svg viewBox="0 0 180 28" className="h-7 w-44 text-[#0F766E]" fill="none" aria-hidden="true"><path d="M4 22c24 0 20-24 40-15S62 30 90 15s26-17 43-5 26 12 43 5" stroke="currentColor" strokeWidth="1.5"/><path d="M28 15C14-6 10 7 28 15Zm32 5c1-22 15-17 0 0Zm61-13c-3 23-17 15 0 0Zm31 11c7-20 18-9 0 0Z" fill="currentColor"/><path d="m86 6 4-6 4 6-4 7Z" fill="#F5B942"/></svg>;
}

function Mascot({ mood = 'welcome', small = false }: { mood?: string; small?: boolean }) {
  const happy = mood === 'correct' || mood === 'finish';
  return <svg viewBox="0 0 180 190" className={small ? 'w-24 h-24 shrink-0' : 'w-40 h-44 shrink-0'} role="img" aria-label={`Белый барс: ${mood === 'wrong' ? 'подбадривает' : happy ? 'радуется' : 'приветствует'}`}>
    <path d="M53 153c-40 9-37-34-20-28" fill="none" stroke="#a4aaa6" strokeWidth="15" strokeLinecap="round"/>
    <ellipse cx="90" cy="143" rx="40" ry="40" fill="#fdfdf9" stroke="#68766e" strokeWidth="2"/>
    <path d="M55 47C25 8 15 54 40 74m85-27c30-39 40 7 15 27" fill="#fdfdf9" stroke="#68766e" strokeWidth="3"/>
    <path d="M47 47c-16-19-17 5-5 12m90-12c16-19 17 5 5 12" stroke="#e3bbb0" strokeWidth="8" strokeLinecap="round"/>
    <path d="M37 77c0-52 107-52 107 0 15 65-119 65-107 0Z" fill="#fffefa" stroke="#68766e" strokeWidth="2.5"/>
    {[56,81,108,129].map((x,i) => <ellipse key={x} cx={x} cy={i % 2 ? 45 : 66} rx="4" ry="6" fill="#929c96" transform={`rotate(${i%2 ? 35 : -30} ${x} 50)`}/>)}
    {happy ? <path d="M55 83q10-15 19 0m33 0q10-15 19 0" stroke="#243e35" strokeWidth="4" fill="none" strokeLinecap="round"/> : <><ellipse cx="65" cy="83" rx="9" ry="12" fill="#264f43"/><ellipse cx="116" cy="83" rx="9" ry="12" fill="#264f43"/><circle cx="68" cy="79" r="3" fill="white"/><circle cx="119" cy="79" r="3" fill="white"/></>}
    <path d="m84 99 7 7 7-7Z" fill="#59645d"/><path d={mood === 'wrong' ? 'M79 117q12-5 24 0' : 'M78 113q13 16 26 0'} stroke="#59645d" strokeWidth="2.5" fill={happy ? '#dca496' : 'none'} strokeLinecap="round"/>
    <ellipse cx="48" cy="105" rx="9" ry="5" fill="#edd0c1"/><ellipse cx="132" cy="105" rx="9" ry="5" fill="#edd0c1"/>
    <path d="M54 128q36 15 74-1l-4 18q-34 13-68-1Z" fill="#0F766E"/><path d="m103 143 22-5 5 38-23 3Z" fill="#11847a"/><path d="m111 159 6-7 5 7-5 8Z" fill="#F5B942"/>
    <path d={happy ? 'M51 145 28 109m101 36 25-36' : 'M51 148 38 127m91 21 23-41'} stroke="#68766e" strokeWidth="19" strokeLinecap="round"/><path d={happy ? 'M51 145 28 109m101 36 25-36' : 'M51 148 38 127m91 21 23-41'} stroke="#fffefa" strokeWidth="15" strokeLinecap="round"/>
    <ellipse cx="72" cy="177" rx="18" ry="9" fill="#fffefa" stroke="#68766e" strokeWidth="2"/><ellipse cx="112" cy="177" rx="18" ry="9" fill="#fffefa" stroke="#68766e" strokeWidth="2"/>
    {happy && <path d="m20 63-6-9m145 13 9-7m-16-20 2-10" stroke="#F5B942" strokeWidth="4" strokeLinecap="round"/>}
  </svg>;
}

function LessonArt({ kind }: { kind: number }) {
  return <svg viewBox="0 0 150 100" className="h-24 w-36" aria-hidden="true">
    <ellipse cx="75" cy="86" rx="51" ry="7" fill="#dce6d4"/>
    {kind === 0 ? <><path d="M35 47h53l-6 31c-10 11-29 11-40 0Z" fill="#fffdf4" stroke="#a48246" strokeWidth="2"/><path d="M88 52c26-4 24 25-4 20" fill="none" stroke="#a48246" strokeWidth="5"/><path d="M58 38c-14-15 12-13 1-29m12 26c-8-10 9-12 3-20" fill="none" stroke="#b9c3a0" strokeWidth="3" strokeLinecap="round"/><path d="m62 70-9-11 9 4 8-8-2 15Z" fill="#0f766e"/><path d="m96 83 20-32 24 32Z" fill="#e9b65c" stroke="#b88b41" strokeWidth="2"/></>
    : kind === 1 ? <><path d="m31 69 64-14 29 16-65 16Z" fill="#c88650"/><path d="m32 61 63-12 28 14-64 15Z" fill="#fff9e5" stroke="#ae7c40" strokeWidth="2"/><path d="m30 53 66-15 28 15-64 16Z" fill="#d9aa51"/><path d="m30 44 64-15 30 16-65 16Z" fill="#fff9e5" stroke="#ae7c40" strokeWidth="2"/><path d="m28 34 65-15 32 16-66 16Z" fill="#338574" stroke="#1c6657" strokeWidth="2"/><path d="M29 35v12l30 15V50" fill="#196d5d"/><path d="m108 13 3-10m7 16 8-6" stroke="#e4ad38" strokeWidth="3" strokeLinecap="round"/></>
    : <><rect x="43" y="23" width="68" height="61" rx="9" fill="#edf0e9" stroke="#9da79c" strokeWidth="2"/><path d="M43 42h68" stroke="#9da79c" strokeWidth="2"/><path d="M60 15v18m34-18v18" stroke="#899789" strokeWidth="6" strokeLinecap="round"/>{[0,1,2,3,4,5].map(i=><rect key={i} x={55+i%3*17} y={50+Math.floor(i/3)*17} width="9" height="8" rx="2" fill="#adb8aa"/>)}</>}
  </svg>;
}

const lessons = [
  { title: 'Знакомство', description: 'Первые слова и приветствия', status: 'Пройден', icon: 'check' as IconName },
  { title: 'Повседневные слова', description: 'То, что окружает нас каждый день', status: 'Доступен', icon: 'arrow' as IconName },
  { title: 'Простые фразы', description: 'От слов — к общению', status: 'Закрыт', icon: 'lock' as IconName },
];
const reviewItems = [{ title: 'Слова', count: 5, icon: 'book' as IconName }, { title: 'Грамматика', count: 3, icon: 'grid' as IconName }];
const tasks = ['Выберите перевод', 'Введите перевод на русский', 'Выберите правильную форму'];
const screenNames: Record<Page, string> = { course: 'Курс', courseError: 'Ошибка загрузки курса', words: 'Слова', grammar: 'Грамматика', exercise: 'Практика', result: 'Результат', review: 'Повторение', empty: 'Всё повторено' };

export default function App() {
  const [page, setPage] = useState<Page>('course');
  const [task, setTask] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [review, setReview] = useState(false);
  const [save, setSave] = useState('Не сохранено');
  const [saveOutcome, setSaveOutcome] = useState('Сохранено');
  const [saveAttempt, setSaveAttempt] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [hasRule, setHasRule] = useState(true);
  const [tools, setTools] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [notice, setNotice] = useState('');
  const [results, setResults] = useState<boolean[]>([]);
  const go = (next: Page) => { setPage(next); setFeedback(''); setAnswer(''); setNotice(''); };
  const start = (isReview = false) => { setReview(isReview); setTask(0); setResults([]); go(isReview ? 'review' : 'words'); };
  const locked = feedback === 'correct' || feedback === 'wrong';
  const tooLong = task === 1 && Array.from(answer).length > 100;
  const check = () => setFeedback(tooLong ? 'tooLong' : !answer.trim() ? 'empty' : answer === '[Перевод 1]' || answer === '[Форма 1]' ? 'correct' : 'wrong');
  const saveResult = (outcome = saveOutcome) => {
    setSaveOutcome(outcome);
    setUnlocked(false);
    setSave('Сохраняем прогресс');
    setSaveAttempt(n => n + 1);
  };
  useEffect(() => {
    if (save !== 'Сохраняем прогресс') return;
    const timer = window.setTimeout(() => {
      setSave(saveOutcome);
      if (saveOutcome === 'Сохранено' && !review) setUnlocked(true);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [save, saveOutcome, saveAttempt, review]);
  const next = () => {
    setResults([...results, feedback === 'correct']);
    if (task === 2) { go('result'); saveResult(); }
    else { setTask(task + 1); setFeedback(''); setAnswer(''); }
  };
  const correct = results.filter(Boolean).length;
  const isTask = page === 'exercise' || page === 'review';
  const totalReview = reviewItems.reduce((sum, item) => sum + item.count, 0);

  return <div className="min-h-screen overflow-x-hidden bg-[#F8FAF7] font-sans text-[#17212B] selection:bg-teal-100">
    <header className="border-b border-[#e3e9e1] bg-white">
      <div className="mx-auto flex min-h-24 max-w-[1200px] items-center justify-between gap-5 px-5 lg:px-8">
        <button onClick={() => go('course')} className={`${button} flex items-center gap-3 px-0 text-2xl tracking-tight`} aria-label="Татарча — на главную"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F766E] text-[#F5B942]"><Icon name="leaf" className="h-7 w-7"/></span>Татарча<span className="ml-1 hidden rounded-md bg-[#f1f4ed] px-2 py-1 text-xs font-medium tracking-normal text-slate-600 lg:block">учимся вместе</span></button>
        <nav className="hidden items-center gap-2 md:flex" aria-label="Главная навигация">
          {([{ title: 'Мой курс', icon: 'book', active: !review, click: () => go('course') }, { title: 'Повторить', icon: 'repeat', active: review, click: () => start(true) }] as const).map(n => <button key={n.title} onClick={n.click} className={`${button} flex items-center gap-2 ${n.active ? 'bg-[#eaf3ed] text-[#0f766e]' : 'text-slate-600'}`}><Icon name={n.icon}/>{n.title}{n.icon === 'repeat' && <span className="ml-1 rounded-full bg-[#f5e6bf] px-2 text-xs text-[#68501b]">{totalReview}</span>}</button>)}
        </nav>
        <div className="flex items-center gap-3"><span className="hidden text-sm text-slate-600 lg:block">Маленькими шагами к большому</span><span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dfe5d9] bg-[#f1f3e9] text-sm font-semibold text-[#526444]">А</span></div>
      </div>
    </header>

    <main className="mx-auto max-w-[1200px] px-5 pb-8 pt-7 lg:px-8 lg:pt-9">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2 text-slate-600"><span className="h-2 w-2 rounded-full bg-[#0f766e]"/>Ваше пространство для изучения языка</span><button className="min-h-11 text-[#0f766e] underline-offset-4 hover:underline focus-visible:ring-2" onClick={() => setTools(!tools)} aria-expanded={tools}>Обзор прототипа <span aria-hidden="true">↗</span></button></div>
      {tools && <section className="mb-6 rounded-2xl border border-[#cbdcd0] bg-white p-5"><h2 className="mb-3 font-semibold">Экраны и состояния для ревью</h2><div className="flex flex-wrap gap-2">{(Object.keys(screenNames) as Page[]).map(p => <button key={p} onClick={() => { if (p === 'result') saveResult(); go(p); }} className={`${secondary} text-sm ${page === p ? 'ring-2 ring-teal-700' : ''}`}>{screenNames[p]}</button>)}</div><div className="mt-4 flex flex-wrap gap-2"><button className={secondary} onClick={() => { setHasRule(false); start(); }}>Урок без нового правила</button><button className={secondary} onClick={() => { setHasRule(true); start(); }}>Урок с новым правилом</button><button className={secondary} onClick={() => { go('result'); saveResult('Сохранено'); }}>Сохранение → успех</button><button className={secondary} onClick={() => { go('result'); saveResult('Не удалось сохранить'); }}>Сохранение → ошибка</button><button className={secondary} onClick={() => { setTask(1); go('exercise'); setAnswer('а'.repeat(101)); setFeedback('tooLong'); }}>Ввод более 100 символов</button></div><p className="mt-3 text-sm text-slate-600">Адаптивный макет: 390–1280 px. Для экспорта используйте печать браузера → PDF или снимок экрана. Все данные и сохранение — демонстрационные.</p></section>}

      {page === 'courseError' ? <section className="mx-auto max-w-xl rounded-3xl border border-[#dfe7dc] bg-white p-6 text-center md:p-10"><div className="flex justify-center"><Mascot mood="wrong"/></div><h1 className="mt-4 text-2xl font-bold">Не удалось загрузить курс</h1><p role="alert" className="mt-4 leading-7 text-slate-600">Не получилось получить список уроков. Проверьте подключение к интернету и попробуйте ещё раз.</p><button className={`${primary} mt-6 w-full`} onClick={() => go('course')}>Попробовать снова</button><p className="mt-4 text-sm text-slate-600">В прототипе повторная попытка показывает загруженный курс.</p></section> : page === 'course' ? <>
        <section className="relative mb-9 flex flex-col-reverse md:block min-h-[304px] overflow-hidden rounded-[24px] border border-[#e1e7d9] bg-[#f0f4e9]">
          {!imageError ? <img src="/images/welcome.png" alt="Белый барс в бирюзовом шарфе приветствует на фоне Казани" onError={() => setImageError(true)} className="h-52 w-full object-cover object-right md:absolute md:right-0 md:top-0 md:h-full md:w-[67%]"/> : <div className="flex justify-center md:absolute md:right-6 md:bottom-0"><Mascot/></div>}
          <div className="relative z-10 w-full bg-linear-to-r from-[#f0f4e9] via-[#f0f4e9]/95 to-[#f0f4e9]/10 p-6 md:w-[61%] md:p-10 md:pr-10">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.1em] text-[#4c6750]"><span className="h-1.5 w-1.5 rounded-full bg-[#0f766e]"/>Язык ближе, чем кажется</span>
            <h1 className="max-w-[480px] text-[32px] font-bold leading-[1.22] tracking-[-1.2px] md:text-[40px]">Каждый день —<br/>чуть ближе к татарскому</h1>
            <p className="mt-4 max-w-[365px] text-base leading-7 text-[#526154]">Слова, маленькие открытия и радость понимания. Продолжим вместе?</p>
            <div className="mt-5"><Ornament/></div>
          </div>
        </section>
        <div className="grid min-w-0 gap-7 lg:grid-cols-[1fr_300px]">
          <section className="min-w-0">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-bold tracking-tight">Мой курс</h2><span className="text-sm text-slate-600">Начальный уровень · А1</span></div>
            <div className="mb-6 flex items-center gap-4 rounded-2xl border border-[#e4e8df] bg-white px-5 py-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f6f0db] text-[#87651c]"><Icon name="flag"/></span><div className="min-w-0 flex-1"><div className="mb-2 flex justify-between gap-3 text-sm"><span className="font-semibold">Хорошее начало!</span><span className="text-slate-600">{unlocked ? 2 : 1} из {lessons.length} уроков</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#edf0e8]"><div className="h-full rounded-full bg-[#76a58c]" style={{ width: `${(unlocked ? 2 : 1) * 100 / lessons.length}%` }}/></div></div></div>
            <div className="grid gap-4 md:grid-cols-3">
              {lessons.map((l,i) => <article key={l.title} className={`relative flex flex-col overflow-hidden rounded-[20px] border bg-white ${i === 1 ? 'border-2 border-[#0f766e] shadow-[0_6px_22px_#0f766e0d]' : 'border-[#e2e7de]'}`}>
                <div className={`relative flex h-36 items-center justify-center ${i === 0 ? 'bg-[#eff4e7]' : i === 1 ? 'bg-[#faf5e8]' : 'bg-[#f0f1ed]'}`}><LessonArt kind={i}/><span className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full ${i === 0 ? 'bg-[#e0ebd6] text-[#426a38]' : i === 1 ? 'bg-white text-[#0f766e]' : 'bg-[#e4e7df] text-[#65705f]'}`}><Icon name={i===2 && unlocked ? 'arrow' : l.icon} className="h-4 w-4"/></span></div>
                <div className="flex flex-1 flex-col p-5"><span className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-600">Урок {i+1}</span><h3 className="text-lg font-bold leading-6">{l.title}</h3><p className="mb-5 mt-2 text-sm leading-6 text-slate-600">{l.description}</p><button disabled={i===2 && !unlocked} onClick={() => start()} className={`${i === 1 ? primary : secondary} mt-auto flex w-full items-center justify-center gap-2 px-2 text-sm ${i===2 && !unlocked ? 'border-transparent bg-[#f0f1ed] text-[#626c60]' : ''}`}><Icon name={i===2 && unlocked ? 'arrow' : l.icon} className="h-4 w-4"/>{i === 2 && unlocked ? 'Начать урок' : i === 1 ? (unlocked ? 'Пройти ещё раз' : 'Начать урок') : l.status}</button></div>
              </article>)}
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><Icon name="lock" className="h-4 w-4"/>{unlocked ? 'Следующий урок открыт: прогресс сохранён' : 'Следующий урок откроется после сохранения результата'}</p>
          </section>
          <aside className="pt-1">
            <section className="rounded-[20px] border border-[#dce6dc] bg-[#edf4ed] p-6"><div className="mb-4 flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#0f766e]"><Icon name="repeat"/></span><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#426249]">{totalReview} заданий</span></div><h2 className="text-xl font-bold">Вспомним изученное?</h2><p className="mb-5 mt-2 text-sm leading-6 text-[#526154]">Немного повторения, чтобы знания остались с вами.</p><div className="space-y-3">{reviewItems.map(item => <div key={item.title} className="flex items-center gap-3 text-sm"><Icon name={item.icon} className="text-[#0f766e]"/><span>{item.title}</span><span className="ml-auto text-slate-600">{item.count} заданий</span></div>)}</div><button onClick={() => start(true)} className={`${primary} mt-6 flex w-full items-center justify-center gap-3`}>Повторить<Icon name="arrow"/></button><p className="mt-3 text-center text-xs text-[#526154]">Около 5 минут · без спешки</p></section>
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#e4e8df] px-4 py-5 text-[#526154]"><Icon name="leaf" className="mt-1"/><p className="text-sm leading-6">Не нужно запоминать всё сразу. Даже один урок — уже шаг вперёд.</p></div>
          </aside>
        </div>
      </> : <section className="mx-auto min-w-0 max-w-[800px] break-words">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><button onClick={() => go('course')} className={`${secondary} flex items-center gap-2 px-3`}><span aria-hidden="true">←</span> К курсу</button><span className="text-sm font-medium text-slate-600">{review ? 'Повторение' : 'Урок 2'} · {screenNames[page]}</span></div>
        <div className="mb-6 flex gap-2" aria-label="Этапы урока">{(hasRule ? ['Слова','Правило','Практика','Результат'] : ['Слова','Практика','Результат']).map((s,i)=><div key={s} className="flex-1"><div className={`mb-2 h-1.5 rounded-full ${i <= (page==='words'?0:page==='grammar'?1:isTask?(hasRule?2:1):(hasRule?3:2)) ? 'bg-[#0f766e]' : 'bg-[#e2e8df]'}`}/><span className="text-xs text-slate-600">{s}</span></div>)}</div>
        <div className="rounded-3xl border border-[#dfe7dc] bg-white p-6 md:p-10">
          {page === 'words' && <><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm font-semibold text-[#0f766e]">ЗНАКОМИМСЯ СО СЛОВАМИ</span><span className="text-sm text-slate-600">Карточка материала</span></div><div className="my-5 flex justify-center rounded-2xl bg-[#f6f5e9] py-8"><LessonArt kind={1}/></div><h1 className="text-3xl font-bold">[Татарское слово]</h1><p className="mt-3 text-xl text-slate-600">[Перевод на русский]</p><div className="my-6 rounded-2xl bg-[#f1f6ef] p-5"><h2 className="mb-2 text-sm font-semibold text-[#0f766e]">В КОНТЕКСТЕ</h2><p>[Пример на татарском языке]</p><p className="mt-2 text-sm text-slate-600">[Перевод примера]</p></div><p className="mb-6 text-sm leading-6 text-slate-600">Материал-заглушка. Слово, перевод и пример будут добавлены из проверенного источника.</p><button onClick={() => go(hasRule ? 'grammar' : 'exercise')} className={`${primary} w-full`}>{hasRule ? 'Коротко о грамматике →' : 'Перейти к упражнениям →'}</button></>}
          {page === 'grammar' && <><span className="text-sm font-semibold text-[#0f766e]">НОВОЕ ПРАВИЛО · КОРОТКО И ПОНЯТНО</span><h1 className="mt-4 text-3xl font-bold">[Название правила]</h1><p className="mt-6 leading-8 text-slate-600">[Здесь будет короткое объяснение одного грамматического правила из проверенного источника. Не более 2–3 предложений.]</p><div className="my-7 rounded-2xl border-l-4 border-[#0f766e] bg-[#f0f5ef] p-6"><p className="mb-3 text-sm font-semibold text-[#0f766e]">ПРИМЕР</p><p className="text-lg">[Пример с выделенной формой]</p><p className="mt-3 text-sm text-slate-600">[Перевод и короткое пояснение]</p></div><p className="mb-7 text-sm text-slate-600">Если в уроке нет нового правила, сразу переходим к практике.</p><button onClick={() => go('exercise')} className={`${primary} w-full`}>Теперь попробуем →</button></>}
          {isTask && <><div className="flex justify-between text-sm text-slate-600"><span>{task===2 ? 'Грамматика' : 'Слова'} · практика</span><span>{task+1} из {tasks.length}</span></div><h1 className="mb-3 mt-5 text-2xl font-bold md:text-3xl">{tasks[task]}</h1><p className="mb-7 text-lg text-slate-600">{task===2 ? '[Предложение с пропущенной формой]' : '[Татарское слово]'}</p>{task===1 ? <div><label htmlFor="translation" className="mb-2 block text-sm font-semibold">Перевод на русский язык</label><input disabled={locked} id="translation" value={answer} onChange={e=>{setAnswer(e.target.value);setFeedback(Array.from(e.target.value).length > 100 ? 'tooLong' : '');}} placeholder="Введите перевод" aria-invalid={feedback==='empty' || tooLong} aria-describedby="input-message" className="min-h-14 w-full rounded-xl border border-[#b8c7b7] px-4 outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e] focus:ring-offset-2"/><p aria-live="polite" id="input-message" className={`mt-2 text-sm ${feedback==='empty' || tooLong ? 'text-[#b42318]' : 'text-slate-600'}`}>{tooLong ? 'Слишком длинный ответ. Сократите перевод до 100 символов.' : feedback==='empty' ? 'Введите перевод, чтобы проверить ответ.' : 'Не более 100 символов.'} {Array.from(answer).length}/100</p></div> : <div className="space-y-3" role="group" aria-label="Варианты ответа">{[1,2,3].map(n=>{const value=task===2 ? `[Форма ${n}]` : `[Перевод ${n}]`;return <button disabled={locked} key={n} aria-pressed={answer===value} onClick={()=>{setAnswer(value);setFeedback('');}} className={`${button} flex w-full items-center gap-4 border-2 text-left ${answer===value ? 'border-[#0f766e] bg-[#edf6f1] text-[#0f766e]' : 'border-[#e2e7de] bg-white'}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full border ${answer===value ? 'border-[#0f766e] bg-[#0f766e] text-white' : 'border-[#aab6aa]'}`}>{answer===value && <Icon name="check" className="h-4 w-4"/>}</span>{value}<span className="ml-auto text-xs text-slate-600">{n}</span></button>})}</div>}
            {feedback==='empty' && task!==1 && <p role="alert" className="mt-4 text-sm text-[#b42318]">Выберите вариант, чтобы проверить ответ.</p>}
            {(feedback==='correct'||feedback==='wrong') && <div role="status" className={`mt-6 flex flex-col items-center gap-3 rounded-2xl p-4 md:flex-row ${feedback==='correct' ? 'bg-[#eff7eb] text-[#166534]' : 'bg-[#fff1eb] text-[#b42318]'}`}><Mascot small mood={feedback}/><div><h2 className="text-lg font-bold">{feedback==='correct' ? 'Верно!' : 'Неверно. Ничего страшного!'}</h2><p className="mt-2 text-sm leading-6">{feedback==='correct' ? 'Вы выбрали правильный вариант.' : `Правильный ответ: ${task===2 ? '[Форма 1]' : '[Перевод 1]'}. [Пояснение из источника]`}</p></div></div>}
            <button onClick={feedback==='correct'||feedback==='wrong' ? next : check} className={`${primary} mt-7 w-full`}>{feedback==='correct'||feedback==='wrong' ? 'Продолжить →' : 'Проверить'}</button>
            {tools && <div className="mt-5 flex flex-wrap gap-2">{['correct','wrong','empty'].map((s,i)=><button className={`${secondary} text-sm`} key={s} onClick={()=>setFeedback(s)}>{['Верно','Неверно','Пустой ввод'][i]}</button>)}<button className={`${secondary} text-sm`} onClick={()=>{setTask((task+1)%3);setFeedback('');setAnswer('');}}>Тип задания →</button></div>}
          </>}
          {page === 'result' && <><div className="flex justify-center"><Mascot mood="finish"/></div><h1 className="text-center text-3xl font-bold">{review ? 'Повторение завершено!' : 'Ещё один шаг вперёд!'}</h1><p className="mt-3 text-center text-slate-600">{review ? 'Спасибо, что уделили время изученному.' : 'Урок завершён. Дайте новым знаниям освоиться.'}</p><div className="my-7 rounded-2xl bg-[#eef4e9] p-6 text-center"><strong className="text-3xl text-[#0f766e]">{correct} из {results.length || tasks.length}</strong><p className="mt-2 text-sm text-slate-600">верных ответов {results.length===0 && '· демонстрация результата'}</p></div><h2 className="mb-3 font-semibold">Что стоит повторить</h2>{results.length > 0 && correct === results.length ? <p className="text-sm text-[#166534]">Все ответы верны. Отличная работа!</p> : <div className="rounded-xl border border-[#eadfd5] p-4 text-sm leading-7"><p>[Задание с ошибкой]</p><p className="text-[#b42318]">Ваш ответ: [Неверный вариант]</p><p className="text-[#166534]">Правильно: [Проверенный вариант]</p></div>}<div role="status" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f4f5f0] p-4 text-sm"><span>{save==='Сохранено' ? '✓ Сохранено' : save==='Сохраняем прогресс' ? '◌ Сохраняем прогресс…' : 'Не удалось сохранить'}</span>{save==='Не удалось сохранить' && <button className="min-h-11 font-semibold text-[#0f766e] underline" onClick={()=>saveResult('Сохранено')}>Повторить сейчас</button>}</div><div className="mt-4 flex items-center gap-3 rounded-xl border border-[#dfe7dc] p-4 text-sm"><Icon name={save==='Сохранено' ? 'check' : 'lock'}/><span>{save==='Сохранено' ? 'Следующий урок доступен' : 'Следующий урок закрыт до успешного сохранения'}</span></div><button onClick={()=>go(review ? 'empty' : 'course')} className={`${primary} mt-6 w-full`}>{review ? 'Завершить повторение' : 'Вернуться к курсу'}</button>{tools && <div className="mt-5 flex flex-wrap gap-2" aria-label="Демонстрация сохранения">{['Сохраняем прогресс','Сохранено','Не удалось сохранить'].map(s=><button key={s} onClick={()=>{ setSave(s); setUnlocked(s==='Сохранено' && !review); }} aria-pressed={save===s} className="min-h-11 rounded-lg border border-[#e0e6dc] px-3 text-xs text-slate-600 focus-visible:ring-2">{s}</button>)}</div>}<p className="mt-3 text-xs text-slate-600">Прототип: прогресс не отправляется на сервер.</p></>}
          {page==='empty' && <div className="py-6 text-center"><div className="flex justify-center"><Mascot mood="finish"/></div><h1 className="mt-5 text-3xl font-bold">На сегодня всё повторено</h1><p className="mx-auto mt-4 max-w-md leading-7 text-slate-600">Можно отдохнуть или ещё немного позаниматься в своём темпе.</p><button onClick={()=>start(true)} className={`${primary} mt-8 w-full`}>Потренироваться</button><button onClick={()=>go('course')} className={`${secondary} mt-3 w-full`}>Вернуться к курсу</button></div>}
        </div>
        {page!=='result' && page!=='empty' && <p className="mt-5 text-center text-xs leading-5 text-slate-600">Учебный материал обозначен заглушками и будет проверен перед публикацией.</p>}
      </section>}
      {notice && <p role="status">{notice}</p>}
      <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#e2e8dd] pt-6 text-xs text-slate-600"><span>Татарча · Учиться с теплом, говорить с уверенностью</span><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#b08d37]"/>Дизайн-прототип · материалы будут проверены</span></footer>
    </main>
  </div>;
}
