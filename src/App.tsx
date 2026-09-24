import { ChangeEvent, useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { sortLessonNames, titleFromFile } from './lessons'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

type Lesson = { id: string; name: string; file: File; url: string }

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTask = useRef<{ cancel(): void } | null>(null)
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null)
  const [pdfName, setPdfName] = useState('')
  const [page, setPage] = useState(() => Number(localStorage.getItem('last-page')) || 1)
  const [scale, setScale] = useState(1.15)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [activeId, setActiveId] = useState('')
  const [notice, setNotice] = useState('')
  const active = lessons.find(item => item.id === activeId)

  useEffect(() => { localStorage.setItem('last-page', String(page)) }, [page])

  useEffect(() => {
    if (!pdf || !canvasRef.current) return
    let stale = false
    const draw = async () => {
      const pdfPage = await pdf.getPage(page)
      if (stale) return
      const viewport = pdfPage.getViewport({ scale: scale * Math.min(window.devicePixelRatio, 2) })
      const canvas = canvasRef.current!
      canvas.width = viewport.width
      canvas.height = viewport.height
      renderTask.current?.cancel()
      const task = pdfPage.render({ canvas, viewport })
      renderTask.current = task
      try { await task.promise } catch (error) { if ((error as Error).name !== 'RenderingCancelledException') throw error }
    }
    void draw()
    return () => { stale = true; renderTask.current?.cancel() }
  }, [pdf, page, scale])

  async function loadPdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
      setPdf(document); setPdfName(file.name); setPage(current => Math.min(current, document.numPages)); setNotice('Book ready — open any lesson and read at your own pace.')
    } catch { setNotice('That PDF could not be opened. Please choose another file.') }
  }

  function loadAudio(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    const names = sortLessonNames(selected.map(file => file.name))
    const files = names.map(name => selected.find(file => file.name === name)!)
    lessons.forEach(item => URL.revokeObjectURL(item.url))
    const next = files.map((file, index) => ({ id: `${file.name}-${file.size}-${index}`, name: titleFromFile(file.name), file, url: URL.createObjectURL(file) }))
    setLessons(next); setActiveId(next[0]?.id ?? ''); setNotice(`${next.length} lesson${next.length === 1 ? '' : 's'} added in filename order.`)
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= lessons.length) return
    setLessons(items => { const copy = [...items]; [copy[index], copy[target]] = [copy[target], copy[index]]; return copy })
  }

  return <main>
    <header className="topbar">
      <div className="brand"><span className="mark">P<span>&</span>V</span><div><strong>Page & Voice</strong><small>Bilingual lesson reader</small></div></div>
      <div className="privacy"><span>●</span> Files stay on this device</div>
    </header>

    <section className="hero">
      <p className="eyebrow">READ AND LISTEN, SIDE BY SIDE</p>
      <h1>Your book. Your lessons.<br/><em>One calm place.</em></h1>
      <p>Open your PDF, choose an audiobook lesson, and turn the pages yourself while you listen.</p>
      <div className="imports">
        <label className="button primary">＋ Choose book PDF<input type="file" accept="application/pdf,.pdf" onChange={loadPdf}/></label>
        <label className="button secondary">♫ Add lesson audio<input type="file" accept="audio/*,.mp3" multiple onChange={loadAudio}/></label>
      </div>
      {notice && <div className="notice" role="status">✓ {notice}</div>}
    </section>

    <section className="workspace" aria-label="Reader workspace">
      <div className="book panel">
        <div className="panelHead"><div><span className="step">01</span><div><h2>Book</h2><p>{pdfName || 'Choose a PDF to begin'}</p></div></div>
          {pdf && <div className="zoom"><button onClick={() => setScale(s => Math.max(.6, s - .15))} aria-label="Zoom out">−</button><span>{Math.round(scale * 100)}%</span><button onClick={() => setScale(s => Math.min(2.5, s + .15))} aria-label="Zoom in">＋</button></div>}
        </div>
        <div className="pageStage">
          {pdf ? <canvas ref={canvasRef} aria-label={`PDF page ${page}`}/> : <div className="empty"><span>▤</span><h3>Your pages will appear here</h3><p>Scanned and text-based PDFs are both welcome.</p></div>}
        </div>
        {pdf && <nav className="pageNav" aria-label="PDF pages"><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Previous</button><label>Page <input value={page} type="number" min="1" max={pdf.numPages} onChange={e => setPage(Math.min(pdf.numPages, Math.max(1, Number(e.target.value))))}/> of {pdf.numPages}</label><button disabled={page === pdf.numPages} onClick={() => setPage(p => p + 1)}>Next →</button></nav>}
      </div>

      <aside className="audio panel">
        <div className="panelHead"><div><span className="step">02</span><div><h2>Lessons</h2><p>{lessons.length ? `${lessons.length} audio files` : 'Add MP3 or audio files'}</p></div></div></div>
        {active ? <div className="nowPlaying"><p>NOW PLAYING</p><h3>{active.name || active.file.name}</h3><audio key={active.id} controls autoPlay={false} src={active.url}/></div> : <div className="empty compact"><span>♫</span><h3>Your lessons will appear here</h3><p>Select several files at once. We’ll sort numbered lessons for you.</p></div>}
        {lessons.length > 0 && <ol className="lessonList">{lessons.map((lesson, index) => <li key={lesson.id} className={lesson.id === activeId ? 'active' : ''}>
          <button className="lesson" onClick={() => setActiveId(lesson.id)}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{lesson.name || lesson.file.name}</strong><small>{(lesson.file.size / 1024 / 1024).toFixed(1)} MB</small></div><b>{lesson.id === activeId ? '▮▮' : '▶'}</b></button>
          <div className="reorder"><button onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${lesson.name} up`}>↑</button><button onClick={() => move(index, 1)} disabled={index === lessons.length - 1} aria-label={`Move ${lesson.name} down`}>↓</button></div>
        </li>)}</ol>}
      </aside>
    </section>
    <footer><strong>Made for focused learning.</strong><span>No account. No uploads. Your reading position is remembered.</span></footer>
  </main>
}
