import '@sakun/system.css'
import './style.css'

import gsap from 'gsap'
import { marked } from 'marked'

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ================= GitHub ================= */
const GH_USER = 'foolishbuilder'

function timeAgo(iso) {
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000)
  if (days < 1) return 'today'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

/* Project windows: fetch README + stats on first open (once each) */
async function hydrateProjectWindow(win) {
  if (win.dataset.hydrated) return
  win.dataset.hydrated = '1'
  const repo = win.dataset.repo
  const readmeEl = win.querySelector('[data-readme]')
  const statsEl = win.querySelector('[data-stats]')
  const link = win.querySelector('[data-repo-link]')
  if (link) link.href = `https://github.com/${GH_USER}/${repo}`

  try {
    const [repoRes, readmeRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${GH_USER}/${repo}`),
      fetch(`https://api.github.com/repos/${GH_USER}/${repo}/readme`),
    ])

    if (repoRes.ok) {
      const d = await repoRes.json()
      const bits = []
      if (d.language) bits.push(d.language)
      bits.push(`Updated ${timeAgo(d.pushed_at)}`)
      if (d.stargazers_count > 0) bits.push(`★ ${d.stargazers_count}`)
      statsEl.textContent = bits.join('   ·   ')
    }

    if (readmeRes.ok) {
      const j = await readmeRes.json()
      // GitHub sends the README base64-encoded; decode it UTF-8-safely
      const md = new TextDecoder().decode(Uint8Array.from(atob(j.content.replace(/\s/g, '')), (c) => c.charCodeAt(0)))
      readmeEl.innerHTML = marked.parse(md)
    } else {
      readmeEl.textContent = 'No README yet — add one on GitHub and it shows up here automatically.'
    }
  } catch {
    readmeEl.textContent = 'Couldn’t reach GitHub just now.'
  }
}

/* Profile stats — Activity Monitor plugs into this next */
/* Activity Monitor: profile summary, recent events, language gauges */
async function hydrateActivity(win) {
  if (win.dataset.hydrated) return
  win.dataset.hydrated = '1'
  const summaryEl = win.querySelector('[data-activity-summary]')
  const feedEl = win.querySelector('[data-activity-feed]')
  const langsEl = win.querySelector('[data-activity-langs]')

  try {
    const [user, events, repos] = await Promise.all([
      fetch(`https://api.github.com/users/${GH_USER}`).then((r) => r.json()),
      fetch(`https://api.github.com/users/${GH_USER}/events/public?per_page=30`).then((r) => r.json()),
      fetch(`https://api.github.com/users/${GH_USER}/repos?per_page=100`).then((r) => r.json()),
    ])

    /* Summary line */
    const since = new Date(user.created_at).getFullYear()
    summaryEl.textContent = `${GH_USER} · building in the open since ${since} · ${user.public_repos} public repos`

    /* Recent activity — translate raw events into human lines */
    const lines = []
    for (const ev of events) {
      if (lines.length >= 6) break
      const repo = ev.repo.name.split('/')[1]
      let what = null
      if (ev.type === 'PushEvent') {
        const n = ev.payload.commits?.length ?? 0
        what = `Pushed ${n} commit${n === 1 ? '' : 's'} to ${repo}`
      } else if (ev.type === 'CreateEvent' && ev.payload.ref_type === 'repository') {
        what = `Created ${repo}`
      } else if (ev.type === 'PublicEvent') {
        what = `Open-sourced ${repo}`
      } else if (ev.type === 'ReleaseEvent') {
        what = `Released ${ev.payload.release?.tag_name ?? ''} of ${repo}`
      }
      if (what) lines.push({ what, when: timeAgo(ev.created_at) })
    }
    feedEl.innerHTML = lines.length
      ? lines.map((l) => `<li><span>${l.what}</span><span class="when">${l.when}</span></li>`).join('')
      : '<li><span>All quiet — nothing public lately.</span></li>'

    /* Language gauges — share of repos per language */
    const counts = {}
    for (const r of repos) if (r.language) counts[r.language] = (counts[r.language] ?? 0) + 1
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    langsEl.innerHTML = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, n]) => `
        <div class="lang-row">
          <span>${lang}</span>
          <div class="lang-bar"><div class="lang-bar__fill" style="width:${Math.round((n / total) * 100)}%"></div></div>
        </div>`)
      .join('')
  } catch {
    summaryEl.textContent = 'Couldn’t reach GitHub just now.'
  }
}

/* ================= Windowing engine ================= */
let topZ = 600
function bringToFront(win) { win.style.zIndex = ++topZ }

let cascade = 0
function positionWindow(win) {
  if (win.dataset.positioned) return                 // remember where a window was left
  const r = win.getBoundingClientRect()
  const off = cascade * 26                            // stagger each fresh window
  win.style.left = Math.max(8, (innerWidth - r.width) / 2 + off) + 'px'
  win.style.top  = Math.max(40, (innerHeight - r.height) / 2 + off) + 'px'
  win.dataset.positioned = '1'
  cascade = (cascade + 1) % 6
}

function openWindow(win) {
  if (!win) return
  win.removeAttribute('hidden')
  positionWindow(win)
  bringToFront(win)
  if (win.matches('.project-window[data-repo]')) hydrateProjectWindow(win)
  if (win.id === 'activity-window') hydrateActivity(win)
  gsap.killTweensOf(win)
  if (reduceMotion) { gsap.set(win, { clearProps: 'transform,opacity,visibility' }); return }
  gsap.fromTo(win,
    { scale: 0.5, autoAlpha: 0 },
    { scale: 1, autoAlpha: 1, duration: 0.3, ease: 'steps(5)', transformOrigin: 'center', clearProps: 'transform' }
  )
}

function closeWindow(win) {
  if (!win) return
  if (reduceMotion) { win.setAttribute('hidden', ''); return }
  gsap.to(win, {
    scale: 0.5, autoAlpha: 0, duration: 0.2, ease: 'steps(4)', transformOrigin: 'center',
    onComplete: () => { win.setAttribute('hidden', ''); gsap.set(win, { clearProps: 'transform,opacity,visibility' }) },
  })
}

function makeDraggable(win) {
  const bar = win.querySelector('.title-bar')
  if (!bar) return
  let offX, offY, dragging = false
  bar.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return            // don't drag when hitting close/zoom
    dragging = true
    bringToFront(win)
    const r = win.getBoundingClientRect()
    offX = e.clientX - r.left
    offY = e.clientY - r.top
    win.style.left = r.left + 'px'
    win.style.top = r.top + 'px'
    win.dataset.positioned = '1'
    bar.setPointerCapture(e.pointerId)                // drag survives a fast cursor
  })
  bar.addEventListener('pointermove', (e) => {
    if (!dragging) return
    win.style.left = (e.clientX - offX) + 'px'
    win.style.top = Math.max(30, e.clientY - offY) + 'px'   // never lose a title bar under the menu bar
  })
  bar.addEventListener('pointerup', (e) => {
    dragging = false
    bar.releasePointerCapture(e.pointerId)
  })
}

/* ================= Wiring ================= */
document.querySelectorAll('.floating-window').forEach((win) => {
  makeDraggable(win)
  win.addEventListener('pointerdown', () => bringToFront(win))
})
document.querySelectorAll('[data-open-window]').forEach((el) =>
  el.addEventListener('click', (e) => { e.preventDefault(); openWindow(document.getElementById(el.dataset.openWindow)) })
)
document.querySelectorAll('.desktop-icon[data-window]').forEach((icon) =>
  icon.addEventListener('dblclick', () => openWindow(document.getElementById(icon.dataset.window)))
)
document.querySelectorAll('.file-icon[data-window]').forEach((icon) =>
  icon.addEventListener('dblclick', () => openWindow(document.getElementById(icon.dataset.window)))
)
document.querySelectorAll('[data-close-window]').forEach((el) =>
  el.addEventListener('click', () => closeWindow(el.closest('.floating-window')))
)

/* ================= Menu bar: clock + restart ================= */
const clock = document.getElementById('menu-clock')
function tick() {
  const t = new Date()
  let h = t.getHours()
  const m = String(t.getMinutes()).padStart(2, '0')
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  clock.textContent = `${h}:${m} ${ap}`
}
tick()
setInterval(tick, 1000)

document.querySelector('[data-restart]')?.addEventListener('click', () => location.reload())

/* ================= Boot: open About — rAF waits a frame so styles exist before we measure ================= */
requestAnimationFrame(() => openWindow(document.getElementById('about-box')))