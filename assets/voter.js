;(function () {
  const loginView = document.getElementById('view-login')
  const voteView = document.getElementById('view-vote')
  const voucherInput = document.getElementById('voucherInput')
  const btnLogin = document.getElementById('btnLogin')
  const loginError = document.getElementById('loginError')
  const candidateGrid = document.getElementById('candidateGrid')
  const selectedCount = document.getElementById('selectedCount')
  const btnSubmit = document.getElementById('btnSubmit')
  const confirmModal = document.getElementById('confirmModal')
  const confirmList = document.getElementById('confirmList')
  const btnCancelConfirm = document.getElementById('btnCancelConfirm')
  const btnFinalSubmit = document.getElementById('btnFinalSubmit')
  const timeRemaining = document.getElementById('timeRemaining')

  let voucherCode = null
  let candidates = []
  const selected = new Set()
  let timerId = null
  let deadline = 0
  let expired = false

  function renderCandidates() {
    candidateGrid.innerHTML = ''
    candidates.forEach(c => {
      const card = document.createElement('div')
      card.className = `candidate-card ${selected.has(c.id) ? 'selected' : ''}`
      card.innerHTML = `
        <img src="${c.photo_url || ''}" alt="${c.name}" class="w-full h-36 object-cover bg-gray-100">
        <div class="p-3 flex items-center justify-between">
          <div class="font-semibold">${c.name}</div>
          <button data-id="${c.id}" class="rounded-md border px-2 py-1">${selected.has(c.id) ? 'Hapus' : 'Pilih'}</button>
        </div>
      `
      card.querySelector('button').addEventListener('click', () => toggleSelect(c.id))
      candidateGrid.appendChild(card)
    })
    updateSelectedState()
  }

  function toggleSelect(id) {
    if (expired) return
    if (selected.has(id)) selected.delete(id)
    else if (selected.size < 9) selected.add(id)
    updateSelectedState()
    renderCandidates()
  }

  function updateSelectedState() {
    selectedCount.textContent = selected.size
    btnSubmit.disabled = selected.size !== 9
  }

  async function loadCandidates() {
    const list = await window.api.getCandidates()
    candidates = list
    renderCandidates()
  }

  function getVoteMinutes() {
    const params = new URLSearchParams(window.location.search)
    const q = parseInt(params.get('voteMinutes'), 10)
    if (Number.isFinite(q) && q > 0) return q
    return window.VOTE_TIME_MINUTES || 10
  }

  function formatLeft(ms) {
    const s = Math.max(0, Math.floor(ms / 1000))
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`
  }

  function startTimer() {
    expired = false
    const mins = getVoteMinutes()
    deadline = Date.now() + mins * 60 * 1000
    if (timerId) clearInterval(timerId)
    timerId = setInterval(() => {
      const left = deadline - Date.now()
      if (timeRemaining) timeRemaining.textContent = formatLeft(left)
      if (left <= 0) {
        clearInterval(timerId)
        expired = true
        btnSubmit.disabled = true
        const msg = document.createElement('div')
        msg.className = 'px-6 pb-6 text-center text-red-600'
        msg.textContent = 'Waktu pengisian telah habis'
        voteView.appendChild(msg)
      }
    }, 500)
  }

  async function handleLogin() {
    const code = voucherInput.value.trim().toUpperCase()
    loginError.classList.add('hidden')
    if (!code) return
    try {
      const ok = await window.api.validateVoucher(code)
      if (!ok) {
        if (!window.api.isConfigured()) {
          // Mode offline: terima kode baru dan lanjut
          voucherCode = code
          loginView.classList.add('hidden')
          voteView.classList.remove('hidden')
          await loadCandidates()
          return
        } else {
          loginError.textContent = 'Voucher tidak valid atau sudah digunakan'
          loginError.classList.remove('hidden')
          return
        }
      }
      voucherCode = code
      loginView.classList.add('hidden')
      voteView.classList.remove('hidden')
      await loadCandidates()
      startTimer()
    } catch (e) {
      loginError.textContent = 'Terjadi kesalahan'
      loginError.classList.remove('hidden')
    }
  }

  function openConfirm() {
    confirmList.innerHTML = ''
    const chosen = candidates.filter(c => selected.has(c.id))
    chosen.forEach(c => {
      const div = document.createElement('div')
      div.className = 'flex items-center gap-3'
      div.innerHTML = `<img src="${c.photo_url || ''}" class="w-10 h-10 object-cover rounded"><span>${c.name}</span>`
      confirmList.appendChild(div)
    })
    confirmModal.classList.remove('hidden')
    confirmModal.classList.add('flex')
  }

  async function finalSubmit() {
    const ids = Array.from(selected)
    btnFinalSubmit.disabled = true
    try {
      await window.api.submitBallot(voucherCode, ids)
      candidateGrid.innerHTML = ''
      btnSubmit.disabled = true
      confirmModal.classList.add('hidden')
      confirmModal.classList.remove('flex')
      const msg = document.createElement('div')
      msg.className = 'p-6 text-center'
      msg.innerHTML = '<div class="text-xl font-semibold text-green-700">Terima kasih, suara Anda telah direkam</div>'
      voteView.appendChild(msg)
    } catch (e) {
      btnFinalSubmit.disabled = false
      alert('Gagal mengirim suara')
    }
  }

  btnLogin.addEventListener('click', handleLogin)
  voucherInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin() })
  btnSubmit.addEventListener('click', openConfirm)
  btnCancelConfirm.addEventListener('click', () => {
    confirmModal.classList.add('hidden')
    confirmModal.classList.remove('flex')
  })
  btnFinalSubmit.addEventListener('click', finalSubmit)
})()
