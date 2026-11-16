import './brand.css';

function Glyph({ abstract = false }) {
  return <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false" fill="currentColor">
    {abstract ? <path d="M12 12 29 24 40 18 51 24 68 12 62 39 40 49 18 39ZM19 46 40 56 61 46Q60 64 40 70 20 64 19 46Z" /> : <>
      <path d="M8 14H42V25H31V67H19V25H8Z" />
      <path fillRule="evenodd" d="M37 14H54Q69 14 69 28Q69 36 62 39Q72 42 72 53Q72 67 55 67H37ZM49 24V35H54Q59 35 59 29Q59 24 54 24ZM49 46V57H55Q61 57 61 51Q61 46 55 46Z" />
    </>}
  </svg>;
}

export default function Brand() {
  return <span className="tb-identity" role="img" aria-label="Tradebuddy">
    <span className="tb-emblem" aria-hidden="true">
      {[false, true].map(abstract => <span key={String(abstract)} className={`tb-form ${abstract ? 'tb-abstract' : 'tb-monogram'}`}>
        <span className="tb-half tb-left"><Glyph abstract={abstract} /></span>
        <span className="tb-half tb-right"><Glyph abstract={abstract} /></span>
      </span>)}
    </span>
    <span className="tb-word" aria-hidden="true">adebuddy<span className="accent">.</span></span>
  </span>;
}
