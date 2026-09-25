// The only script on the sample pages. No framework, well under 5 KB, and every feature works without it
// loading except the interactive bits (theme toggle, menus, filters, the detail panel).
(() => {
  const root = document.documentElement
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => [...r.querySelectorAll(s)]

  /* ---- light / dark: follows the device, this button just tries the other one (a refresh goes back) ---- */
  $$('[data-theme-toggle]').forEach((b) =>
    b.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
    }),
  )

  /* ---- fade sections in as they scroll into view (skipped for anyone who prefers less motion) ---- */
  const reveals = $$('.reveal')
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    reveals.forEach((el) => el.classList.add('in'))
  } else {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    )
    reveals.forEach((el) => io.observe(el))
  }

  /* ---- phone menu ---- */
  const menuBtn = $('[data-menu-btn]')
  const menu = $('#mobile-menu')
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => {
      const opening = menu.hidden
      menu.hidden = !opening
      menuBtn.setAttribute('aria-expanded', String(opening))
    })
  }

  /* ---- custom dropdowns ---- */
  const dropdowns = $$('[data-dropdown]')
  const closeAll = (except) =>
    dropdowns.forEach((d) => {
      if (d === except) return
      d.dataset.open = 'false'
      $('[data-dd-btn]', d).setAttribute('aria-expanded', 'false')
    })
  dropdowns.forEach((d) => {
    const btn = $('[data-dd-btn]', d)
    const options = $$('.dd-opt', d)
    const setOpen = (open) => {
      closeAll(d)
      d.dataset.open = String(open)
      btn.setAttribute('aria-expanded', String(open))
      if (open) ($('.dd-opt[aria-selected="true"]', d) || options[0]).focus()
    }
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      setOpen(d.dataset.open !== 'true')
    })
    options.forEach((o) =>
      o.addEventListener('click', (e) => {
        e.stopPropagation()
        options.forEach((x) => x.setAttribute('aria-selected', String(x === o)))
        $('[data-dd-label]', d).textContent = o.dataset.value
        setOpen(false)
        btn.focus()
        d.dispatchEvent(new CustomEvent('dd-change', { bubbles: true, detail: { id: d.dataset.dropdown, value: o.dataset.value } }))
      }),
    )
    d.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        btn.focus()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const i = options.indexOf(document.activeElement)
        const next = e.key === 'ArrowDown' ? Math.min(options.length - 1, i + 1) : Math.max(0, i - 1)
        options[next].focus()
      }
    })
  })
  document.addEventListener('click', () => closeAll())

  /* ---- report form ---- */
  $$('.tile input').forEach((r) =>
    r.addEventListener('change', () => {
      const out = $('#sum-type')
      if (out) out.textContent = r.value
    }),
  )
  const desc = $('#desc')
  if (desc) {
    desc.addEventListener('input', () => {
      $('#desc-count').textContent = desc.value.length
      const t = desc.value.trim()
      $('#sum-desc').textContent = t ? (t.length > 36 ? t.slice(0, 36) + '…' : t) : 'Not written yet'
    })
  }
  const dz = $('[data-dropzone]')
  if (dz) {
    const input = $('input', dz)
    const show = (file) => {
      if (!file) return
      $('[data-dz-title]', dz).textContent = file.name
      $('[data-dz-hint]', dz).textContent = 'Ready. Click to choose a different photo.'
      const s = $('#sum-photo')
      if (s) s.textContent = 'Added'
    }
    input.addEventListener('change', () => show(input.files[0]))
    ;['dragenter', 'dragover'].forEach((ev) =>
      dz.addEventListener(ev, (e) => {
        e.preventDefault()
        dz.dataset.over = 'true'
      }),
    )
    ;['dragleave', 'drop'].forEach((ev) =>
      dz.addEventListener(ev, (e) => {
        e.preventDefault()
        dz.dataset.over = 'false'
      }),
    )
    dz.addEventListener('drop', (e) => {
      if (e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files
        show(input.files[0])
      }
    })
  }

  /* ---- reported problems: filters, search, sort ---- */
  const grid = $('#grid')
  if (!grid) return
  const data = JSON.parse($('#reports-data').textContent)
  const state = { status: 'all', type: 'All types', sort: 'Newest', q: '' }
  const cards = $$('[data-report]', grid)
  const byId = Object.fromEntries(data.map((d) => [String(d.id), d]))

  const apply = () => {
    const q = state.q.trim().toLowerCase()
    let shown = 0
    cards
      .slice()
      .sort((a, b) => (state.sort === 'Most backed' ? byId[b.dataset.report].backers - byId[a.dataset.report].backers : Number(a.dataset.report) - Number(b.dataset.report)))
      .forEach((c) => {
        const ok =
          (state.status === 'all' || c.dataset.status === state.status) &&
          (state.type === 'All types' || c.dataset.type === state.type) &&
          (!q || c.dataset.text.includes(q))
        c.closest('li').hidden = !ok
        grid.appendChild(c.closest('li'))
        if (ok) shown++
      })
    $('#count').textContent = `Showing ${shown} of ${cards.length} reports`
    $('#empty').hidden = shown !== 0
  }
  $$('[data-filter]').forEach((b) =>
    b.addEventListener('click', () => {
      state.status = b.dataset.filter
      $$('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
      apply()
    }),
  )
  $('#search').addEventListener('input', (e) => {
    state.q = e.target.value
    apply()
  })
  document.addEventListener('dd-change', (e) => {
    if (e.detail.id === 'type') state.type = e.detail.value
    if (e.detail.id === 'sort') state.sort = e.detail.value
    apply()
  })
  apply()

  /* ---- the detail panel ---- */
  const drawer = $('#drawer')
  const scrim = $('#scrim')
  let opener = null
  const icons = { 'Fly-tipping': 'trash', Litter: 'trash', Pothole: 'road', Graffiti: 'spray', 'Abandoned vehicle': 'car' }
  const check = '<svg class="size-3.5" aria-hidden="true"><use href="#i-check"/></svg>'

  const fill = (r) => {
    $('#dr-type').textContent = r.type
    $('#dr-title').textContent = r.title
    $('#dr-meta').textContent = `${r.ago} · Sample report #${r.id}`
    const pill = $('#dr-pill')
    pill.className = 'pill pill-' + r.status
    pill.textContent = r.label
    $('#dr-photo').innerHTML = r.img
      ? `<img src="${r.img.src}" width="${r.img.w}" height="${r.img.h}" alt="${r.title}" class="absolute inset-0 size-full object-cover" decoding="async">`
      : `<span class="absolute inset-0 grid place-items-center bg-gradient-to-br from-accent/20 via-surface2 to-sky-400/20 text-accent"><svg class="size-16 opacity-80" aria-hidden="true"><use href="#i-${icons[r.type] || 'trash'}"/></svg></span>`
    $('#dr-history').innerHTML = r.history
      .map(([label, when], i) => {
        const last = i === r.history.length - 1
        return `<li class="flex gap-4 pb-6 last:pb-0"><span class="flex flex-col items-center"><span class="grid size-6 place-items-center rounded-full ${last ? 'bg-accent text-accent-ink ring-4 ring-accent/20' : 'bg-surface2 text-accent'}">${check}</span>${last ? '' : '<span class="mt-1 w-px flex-1 bg-line"></span>'}</span><div><p class="font-semibold">${label}</p><p class="text-sm text-soft">${when}</p></div></li>`
      })
      .join('')
    const back = $('[data-back]')
    back.disabled = false
    back.innerHTML = '<svg class="size-4" aria-hidden="true"><use href="#i-eye"/></svg>I have seen this too'
    back.onclick = () => {
      back.disabled = true
      back.textContent = 'You have backed this'
    }
  }

  const open = (id, trigger) => {
    const r = byId[id]
    if (!r) return
    opener = trigger || opener
    fill(r)
    scrim.hidden = false
    requestAnimationFrame(() => {
      scrim.classList.remove('opacity-0')
      drawer.classList.remove('translate-x-full')
    })
    drawer.setAttribute('aria-hidden', 'false')
    document.body.style.overflow = 'hidden'
    history.replaceState(null, '', '#r-' + id)
    $('[data-close]', drawer).focus()
  }
  const close = () => {
    scrim.classList.add('opacity-0')
    drawer.classList.add('translate-x-full')
    drawer.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = ''
    history.replaceState(null, '', location.pathname)
    setTimeout(() => (scrim.hidden = true), 300)
    if (opener) opener.focus()
  }
  cards.forEach((c) => c.addEventListener('click', () => open(c.dataset.report, c)))
  scrim.addEventListener('click', close)
  $('[data-close]', drawer).addEventListener('click', close)
  document.addEventListener('keydown', (e) => {
    if (drawer.getAttribute('aria-hidden') === 'true') return
    if (e.key === 'Escape') close()
    if (e.key === 'Tab') {
      const f = $$('button:not([disabled]), a[href]', drawer)
      if (!f.length) return
      const first = f[0]
      const lastEl = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        first.focus()
      }
    }
  })
  const fromHash = () => {
    const m = location.hash.match(/^#r-(\d+)$/)
    if (m) open(m[1])
    else if (drawer.getAttribute('aria-hidden') === 'false') close()
  }
  window.addEventListener('hashchange', fromHash)
  fromHash()
})()
