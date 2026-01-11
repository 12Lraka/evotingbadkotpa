;(function () {
  const adminLogin = document.getElementById('admin-login')
  const adminApp = document.getElementById('admin-app')
  const btnAdminLogin = document.getElementById('btnAdminLogin')
  const adminEmail = document.getElementById('adminEmail')
  const adminPassword = document.getElementById('adminPassword')
  const adminAuthError = document.getElementById('adminAuthError')
  const btnSignOut = document.getElementById('btnSignOut')
  const loginStatus = document.getElementById('loginStatus')

  const tabButtons = document.querySelectorAll('.tab-btn')
  const tabViews = document.querySelectorAll('.tab-view')

  const candName = document.getElementById('candName')
  const candPhoto = document.getElementById('candPhoto')
  const btnAddCandidate = document.getElementById('btnAddCandidate')
  const candidateList = document.getElementById('candidateList')

  const voucherCount = document.getElementById('voucherCount')
  const btnGenerateVouchers = document.getElementById('btnGenerateVouchers')
  const btnExportVouchers = document.getElementById('btnExportVouchers')
  const voucherList = document.getElementById('voucherList')
  const voucherStatus = document.getElementById('voucherStatus')

  const voteTable = document.getElementById('voteTable')

  function showError(msg) {
    if (adminAuthError) {
      adminAuthError.textContent = msg
      adminAuthError.classList.remove('hidden')
    } else {
      console.debug('admin-error:', msg)
    }
  }

  function hideError() {
    if (adminAuthError) adminAuthError.classList.add('hidden')
  }

  function setStatus(msg, kind = 'info') {
    if (!loginStatus) return
    loginStatus.textContent = msg
    loginStatus.classList.remove('hidden')
    loginStatus.classList.remove('text-gray-600','text-green-600','text-red-600')
    if (kind === 'ok') loginStatus.classList.add('text-green-600')
    else if (kind === 'err') loginStatus.classList.add('text-red-600')
    else loginStatus.classList.add('text-gray-600')
  }

  function readDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result)
      r.onerror = reject
      r.readAsDataURL(file)
    })
  }

  ;(function parseURLConfig(){
    const params = new URLSearchParams(window.location.search)
    const url = params.get('supabaseUrl')
    const key = params.get('supabaseAnonKey')
    if (url && key) {
      window.api.setSupabaseConfig(url, key)
    }
  })()

  function updateUIByConfig() {
    btnAdminLogin.disabled = false
  }

  async function checkConfig() {
    if (!window.api.isConfigured()) return
    try {
      const { error } = await window.api.supabase.from('candidates').select('id', { count: 'exact', head: true })
      if (error) throw error
    } catch (e) {
      showError(`Konfigurasi tidak valid. Isi URL/API Key di form lalu Simpan. Detail: ${e.message || e}`)
    }
  }

  updateUIByConfig()
  if (window.api.supabase) checkConfig()

  function getAdminCreds() {
    const params = new URLSearchParams(window.location.search)
    const qEmail = params.get('adminEmail')
    const qPass = params.get('adminPassword')
    const cEmail = window.ADMIN_EMAIL || localStorage.getItem('ADMIN_EMAIL')
    const cPass = window.ADMIN_PASSWORD || localStorage.getItem('ADMIN_PASSWORD')
    const iEmail = adminEmail && adminEmail.value ? adminEmail.value.trim() : ''
    const iPass = adminPassword && adminPassword.value ? adminPassword.value.trim() : ''
    const email = iEmail || qEmail || cEmail
    const password = iPass || qPass || cPass
    return { email, password }
  }
  function setAdminCreds(email, password) {
    localStorage.setItem('ADMIN_EMAIL', email)
    localStorage.setItem('ADMIN_PASSWORD', password)
  }

  function switchTab(id) {
    tabButtons.forEach(b => b.classList.remove('active'))
    tabViews.forEach(v => v.classList.add('hidden'))
    const btn = document.querySelector(`[data-tab="${id}"]`)
    if (btn) btn.classList.add('active')
    const view = document.getElementById(id)
    if (view) view.classList.remove('hidden')
    if (id === 'tab-candidates') renderCandidates()
    else if (id === 'tab-dashboard') renderVoteTable()
  }

  tabButtons.forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)))

  async function renderCandidates() {
    const list = await window.api.getCandidates()
    candidateList.innerHTML = ''
    list.forEach(c => {
      const row = document.createElement('div')
      row.className = 'flex items-center gap-3 p-2 border rounded'
      row.innerHTML = `
        <img src="${c.photo_url || ''}" class="w-12 h-12 object-cover rounded bg-gray-100">
        <input data-id="${c.id}" class="flex-1 rounded-md border px-2 py-1" value="${c.name}">
        <input data-id="${c.id}" data-photo class="flex-1 rounded-md border px-2 py-1" value="${c.photo_url || ''}">
        <button data-id="${c.id}" data-save class="rounded-md bg-blue-600 text-white px-3 py-1">Simpan</button>
        <button data-id="${c.id}" data-del class="rounded-md bg-red-600 text-white px-3 py-1">Hapus</button>
      `
      row.querySelector('[data-save]').addEventListener('click', async () => {
        const name = row.querySelector('input[data-id]').value
        const photo = row.querySelector('input[data-photo]').value
        await window.api.updateCandidate(c.id, { name, photo_url: photo })
        alert('Data kandidat berhasil disimpan')
        await renderCandidates()
      })
      row.querySelector('[data-del]').addEventListener('click', async () => {
        if (confirm('Apakah yakin akan menghapus data ini?')) {
          await window.api.deleteCandidate(c.id)
          await renderCandidates()
        }
      })
      candidateList.appendChild(row)
    })
  }

  function renderVouchers(codes = []) {
    voucherList.innerHTML = ''
    codes.forEach(code => {
      const chip = document.createElement('div')
      chip.className = `px-3 py-2 rounded border`
      chip.textContent = code
      voucherList.appendChild(chip)
    })
  }

  function exportVouchersCSV(vouchers) {
    const rows = [['code','used','consumed_at'], ...vouchers.map(v => [v.code, v.used, v.consumed_at || ''])]
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vouchers.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function renderVoteTable() {
    const stats = await window.api.voteCounts()
    stats.sort((a,b) => b.votes - a.votes)
    voteTable.innerHTML = ''
    stats.forEach(s => {
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td class="p-2">${s.name}</td>
        <td class="p-2 text-right font-semibold">${s.votes}</td>
      `
      voteTable.appendChild(tr)
    })
  }

  async function handleLogin(action) {
    hideError()
    const { email, password } = getAdminCreds()
    if (!email || !password) { showError('Kredensial admin belum disiapkan'); return }
    setStatus('Memproses login...', 'info')
    try {
      const user = await window.api.signIn(email, password)
      btnSignOut.classList.remove('hidden')
      adminLogin.classList.add('hidden')
      adminApp.classList.remove('hidden')
      setStatus('Login berhasil', 'ok')
      await renderCandidates()
      await renderVoteTable()
      window.api.subscribeVoteChanges(async () => { await renderVoteTable() })
    } catch (e) {
      try {
        await window.api.signUp(email, password)
        await window.api.bootstrapAdmin(email)
        const user2 = await window.api.signIn(email, password)
        setAdminCreds(email, password)
        btnSignOut.classList.remove('hidden')
        adminLogin.classList.add('hidden')
        adminApp.classList.remove('hidden')
        setStatus('Akun dibuat dan login berhasil', 'ok')
        await renderCandidates()
        await renderVoteTable()
        window.api.subscribeVoteChanges(async () => { await renderVoteTable() })
      } catch (err) {
        console.error(err)
        setStatus(`Login gagal: ${err.message || 'Cek console'}`, 'err')
      }
    }
  }

  // Auto-fill credentials from config if available
  if (window.ADMIN_EMAIL) adminEmail.value = window.ADMIN_EMAIL
  if (window.ADMIN_PASSWORD) adminPassword.value = window.ADMIN_PASSWORD

  btnAdminLogin.addEventListener('click', () => handleLogin('login'))
  btnSignOut.addEventListener('click', async () => {
    await window.api.signOut()
    location.reload()
  })

  btnAddCandidate.addEventListener('click', async () => {
    const name = candName.value.trim()
    const file = candPhoto.files && candPhoto.files[0]
    const photo = file ? await readDataURL(file) : ''
    if (!name) return
    await window.api.addCandidate(name, photo)
    candName.value = ''
    candPhoto.value = ''
    await renderCandidates()
  })

  btnGenerateVouchers.addEventListener('click', async () => {
    let n = parseInt(voucherCount.value, 10)
    if (!Number.isFinite(n) || n < 1) n = 10
    voucherStatus && voucherStatus.classList.remove('hidden')
    if (voucherStatus) voucherStatus.textContent = 'Menghasilkan voucher...'
    const oldText = btnGenerateVouchers.textContent
    btnGenerateVouchers.textContent = 'Menghasilkan...'
    btnGenerateVouchers.disabled = true
    try {
      const codes = await window.api.generateVouchers(n)
      renderVouchers(codes)
      if (voucherStatus) voucherStatus.textContent = `Generate ${codes.length} voucher selesai`
    } catch (e) {
      if (voucherStatus) voucherStatus.textContent = 'Gagal generate voucher'
    } finally {
      btnGenerateVouchers.textContent = oldText
      btnGenerateVouchers.disabled = false
    }
  })

  btnExportVouchers.addEventListener('click', async () => {
    const list = await window.api.listVouchers(2000)
    exportVouchersCSV(list)
  })
})()
