import type { ReactNode } from 'react'

type IconName = 'book' | 'repeat' | 'arrow' | 'check' | 'lock' | 'grid' | 'flag' | 'close' | 'sound' | 'leaf';

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
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

export function Ornament() {
  return <svg viewBox="0 0 180 28" className="h-7 w-44 text-[#0F766E]" fill="none" aria-hidden="true"><path d="M4 22c24 0 20-24 40-15S62 30 90 15s26-17 43-5 26 12 43 5" stroke="currentColor" strokeWidth="1.5"/><path d="M28 15C14-6 10 7 28 15Zm32 5c1-22 15-17 0 0Zm61-13c-3 23-17 15 0 0Zm31 11c7-20 18-9 0 0Z" fill="currentColor"/><path d="m86 6 4-6 4 6-4 7Z" fill="#F5B942"/></svg>;
}

export function Mascot({ mood = 'welcome', small = false }: { mood?: string; small?: boolean }) {
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

export function LessonArt({ kind }: { kind: number }) {
  return <svg viewBox="0 0 150 100" className="h-24 w-36" aria-hidden="true">
    <ellipse cx="75" cy="86" rx="51" ry="7" fill="#dce6d4"/>
    {kind === 0 ? <><path d="M35 47h53l-6 31c-10 11-29 11-40 0Z" fill="#fffdf4" stroke="#a48246" strokeWidth="2"/><path d="M88 52c26-4 24 25-4 20" fill="none" stroke="#a48246" strokeWidth="5"/><path d="M58 38c-14-15 12-13 1-29m12 26c-8-10 9-12 3-20" fill="none" stroke="#b9c3a0" strokeWidth="3" strokeLinecap="round"/><path d="m62 70-9-11 9 4 8-8-2 15Z" fill="#0f766e"/><path d="m96 83 20-32 24 32Z" fill="#e9b65c" stroke="#b88b41" strokeWidth="2"/></>
    : kind === 1 ? <><path d="m31 69 64-14 29 16-65 16Z" fill="#c88650"/><path d="m32 61 63-12 28 14-64 15Z" fill="#fff9e5" stroke="#ae7c40" strokeWidth="2"/><path d="m30 53 66-15 28 15-64 16Z" fill="#d9aa51"/><path d="m30 44 64-15 30 16-65 16Z" fill="#fff9e5" stroke="#ae7c40" strokeWidth="2"/><path d="m28 34 65-15 32 16-66 16Z" fill="#338574" stroke="#1c6657" strokeWidth="2"/><path d="M29 35v12l30 15V50" fill="#196d5d"/><path d="m108 13 3-10m7 16 8-6" stroke="#e4ad38" strokeWidth="3" strokeLinecap="round"/></>
    : <><rect x="43" y="23" width="68" height="61" rx="9" fill="#edf0e9" stroke="#9da79c" strokeWidth="2"/><path d="M43 42h68" stroke="#9da79c" strokeWidth="2"/><path d="M60 15v18m34-18v18" stroke="#899789" strokeWidth="6" strokeLinecap="round"/>{[0,1,2,3,4,5].map(i=><rect key={i} x={55+i%3*17} y={50+Math.floor(i/3)*17} width="9" height="8" rx="2" fill="#adb8aa"/>)}</>}
  </svg>;
}
