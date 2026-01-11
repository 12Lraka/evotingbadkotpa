;(function () {
  // Base URL API (otomatis deteksi relative path)
  const API_URL = 'api';

  // Helper untuk Fetch API
  async function apiCall(endpoint, method = 'GET', body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    }
    if (body) opts.body = JSON.stringify(body)
    
    const res = await fetch(`${API_URL}/${endpoint}`, opts)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'API Error')
    return data
  }

  // --- Implementasi Fungsi ---

  async function getCandidates() {
    return apiCall('candidates.php')
  }

  async function validateVoucher(code) {
    return apiCall(`vouchers.php?action=validate`, 'POST', { code })
  }

  async function submitBallot(code, candidateIds) {
    return apiCall('vote.php', 'POST', { code, candidateIds })
  }

  async function signIn(email, password) {
    const res = await apiCall('login.php', 'POST', { email, password })
    if (res.success) {
      localStorage.setItem('ADMIN_SESSION', 'true')
      return { email }
    }
    throw new Error('Login failed')
  }

  async function signUp(email, password) {
    // Tidak diimplementasikan di versi PHP simple ini, return success dummy
    return { email }
  }

  async function signOut() {
    localStorage.removeItem('ADMIN_SESSION')
    return true
  }

  async function addCandidate(name, photoUrl) {
    return apiCall('candidates.php', 'POST', { name, photo_url: photoUrl })
  }

  async function updateCandidate(id, updates) {
    return apiCall('candidates.php', 'PUT', { id, ...updates })
  }

  async function deleteCandidate(id) {
    return apiCall(`candidates.php?id=${id}`, 'DELETE')
  }

  async function listVouchers(limit = 100) {
    return apiCall(`vouchers.php?limit=${limit}`)
  }

  async function generateVouchers(count) {
    return apiCall(`vouchers.php?action=generate`, 'POST', { count })
  }

  async function voteCounts() {
    return apiCall('vote.php')
  }

  async function bootstrapAdmin(email) {
    return true
  }

  function subscribeVoteChanges(handler) {
    // Polling sederhana setiap 5 detik
    const interval = setInterval(async () => {
      try {
        const data = await voteCounts()
        // Format data supaya sesuai format realtime Supabase jika perlu
        // Tapi UI admin-v3.js menggunakan renderVoteTable() yang memanggil voteCounts() lagi?
        // Cek admin-v3.js: subscribeVoteChanges menerima handler, handler dipanggil saat ada event.
        // Di sini kita panggil handler secara berkala dengan data baru?
        // Sebenarnya admin-v3.js me-reload data ketika event diterima.
        // Jadi kita cukup panggil handler() kosong untuk trigger reload.
        handler()
      } catch (e) {}
    }, 5000)
    return { unsubscribe: () => clearInterval(interval) }
  }

  function setSupabaseConfig(url, key) {
    // Tidak relevan lagi di versi PHP
    return true
  }

  function getConfig() {
    return { url: '', key: '' }
  }

  // Expose API ke Window
  window.api = {
    supabase: null, // No supabase instance
    isConfigured: () => true, // Selalu true karena config ada di server (PHP)
    getDemoVoucher: () => null,
    getCandidates,
    validateVoucher,
    submitBallot,
    signIn,
    signUp,
    signOut,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    listVouchers,
    generateVouchers,
    voteCounts,
    bootstrapAdmin,
    subscribeVoteChanges,
    setSupabaseConfig,
    getSupabaseConfig: getConfig,
  }
})()
