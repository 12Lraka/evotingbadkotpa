;(function () {
  function getConfig() {
    const url = localStorage.getItem('SUPABASE_URL') || window.SUPABASE_URL
    const key = localStorage.getItem('SUPABASE_ANON_KEY') || window.SUPABASE_ANON_KEY
    return { url, key }
  }
  let supabase = null
  function isValidConfig(cfg) {
    if (!cfg || !cfg.url || !cfg.key) return false
    if (String(cfg.url).includes('YOUR-PROJECT')) return false
    if (String(cfg.key).includes('YOUR-ANON-KEY')) return false
    if (!/^https?:\/\/.*supabase\.co/.test(cfg.url)) return false
    return true
  }
  function initClient() {
    const { url, key } = getConfig()
    if (!isValidConfig({ url, key })) {
      supabase = null
      return null
    }
    supabase = window.supabase.createClient(url, key)
    return supabase
  }
  initClient()

  function readLocal(key, def) {
    try {
      const v = localStorage.getItem(key)
      return v ? JSON.parse(v) : def
    } catch { return def }
  }
  function writeLocal(key, val) {
    localStorage.setItem(key, JSON.stringify(val))
  }
  function genId() {
    return Math.random().toString(36).slice(2, 10)
  }

  function seedDemoData() {
    if (supabase) return
    const cands = readLocal('LOCAL_CANDIDATES', [])
    if (cands.length === 0) {
      const names = ['Calon 1','Calon 2','Calon 3','Calon 4','Calon 5','Calon 6','Calon 7','Calon 8','Calon 9','Calon 10','Calon 11','Calon 12']
      const seeded = names.map(n => ({ id: genId(), name: n, photo_url: '' }))
      writeLocal('LOCAL_CANDIDATES', seeded)
    }
    const vouchers = readLocal('LOCAL_VOUCHERS', [])
    if (vouchers.length === 0) {
      const demo = [{ code: 'DEMO99999', used: false, consumed_at: null }]
      for (let i = 0; i < 30; i++) {
        const code = Math.random().toString(36).slice(2, 8).toUpperCase()
        demo.push({ code, used: false, consumed_at: null })
      }
      writeLocal('LOCAL_VOUCHERS', demo)
    }
  }
  seedDemoData()

  async function getCandidates() {
    if (!supabase) {
      return readLocal('LOCAL_CANDIDATES', [])
    }
    const { data, error } = await supabase.from('candidates').select('*').order('name', { ascending: true })
    if (error) throw error
    return data
  }

  async function validateVoucher(code) {
    if (!supabase) {
      const vouchers = readLocal('LOCAL_VOUCHERS', [])
      let v = vouchers.find(x => x.code === code)
      if (!v) {
        v = { code, used: false, consumed_at: null }
        vouchers.push(v)
        writeLocal('LOCAL_VOUCHERS', vouchers)
      }
      return !v.used
    }
    try {
      const { data, error } = await supabase.rpc('validate_voucher', { voucher_code: code })
      if (error) throw error
      return data
    } catch (error) {
      // error koneksi: gunakan fallback offline
      const vouchers = readLocal('LOCAL_VOUCHERS', [])
      let v = vouchers.find(x => x.code === code)
      if (!v) {
        v = { code, used: false, consumed_at: null }
        vouchers.push(v)
        writeLocal('LOCAL_VOUCHERS', vouchers)
      }
      return !v.used
    }
  }

  async function submitBallot(code, candidateIds) {
    if (!supabase) {
      const vouchers = readLocal('LOCAL_VOUCHERS', [])
      const v = vouchers.find(x => x.code === code)
      if (!v || v.used) throw new Error('Voucher tidak valid')
      v.used = true; v.consumed_at = new Date().toISOString()
      writeLocal('LOCAL_VOUCHERS', vouchers)
      const votes = readLocal('LOCAL_BALLOT_VOTES', [])
      candidateIds.forEach(cid => votes.push({ candidate_id: cid }))
      writeLocal('LOCAL_BALLOT_VOTES', votes)
      return true
    }
    const { data, error } = await supabase.rpc('submit_ballot', { voucher_code: code, candidate_ids: candidateIds })
    if (error) throw error
    return data
  }

  async function signIn(email, password) {
    if (!supabase) {
      const cfgEmail = window.ADMIN_EMAIL || localStorage.getItem('ADMIN_EMAIL')
      const cfgPass = window.ADMIN_PASSWORD || localStorage.getItem('ADMIN_PASSWORD')
      if (email === cfgEmail && password === cfgPass) {
        localStorage.setItem('ADMIN_SESSION', 'true')
        return { email }
      }
      throw new Error('Login offline gagal')
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data.user
  }

  async function signUp(email, password) {
    if (!supabase) {
      localStorage.setItem('ADMIN_EMAIL', email)
      localStorage.setItem('ADMIN_PASSWORD', password)
      return { email }
    }
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data.user
  }

  async function signOut() {
    if (!supabase) {
      localStorage.removeItem('ADMIN_SESSION')
      return true
    }
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return true
  }

  async function addCandidate(name, photoUrl) {
    if (!supabase) {
      const list = readLocal('LOCAL_CANDIDATES', [])
      const item = { id: genId(), name, photo_url: photoUrl }
      list.push(item)
      writeLocal('LOCAL_CANDIDATES', list)
      return item
    }
    const { data, error } = await supabase.from('candidates').insert({ name, photo_url: photoUrl }).select().single()
    if (error) throw error
    return data
  }

  async function updateCandidate(id, updates) {
    if (!supabase) {
      const list = readLocal('LOCAL_CANDIDATES', [])
      const idx = list.findIndex(x => x.id === id)
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updates }
        writeLocal('LOCAL_CANDIDATES', list)
        return list[idx]
      }
      throw new Error('Candidate tidak ditemukan')
    }
    const { data, error } = await supabase.from('candidates').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  }

  async function deleteCandidate(id) {
    if (!supabase) {
      const list = readLocal('LOCAL_CANDIDATES', [])
      const next = list.filter(x => x.id !== id)
      writeLocal('LOCAL_CANDIDATES', next)
      return true
    }
    const { error } = await supabase.from('candidates').delete().eq('id', id)
    if (error) throw error
    return true
  }

  async function listVouchers(limit = 100) {
    if (!supabase) {
      const data = readLocal('LOCAL_VOUCHERS', [])
      return data.slice(0, limit)
    }
    const { data, error } = await supabase.from('vouchers').select('*').order('code', { ascending: true }).limit(limit)
    if (error) throw error
    return data
  }

  async function generateVouchers(count) {
    if (!supabase) {
      const list = readLocal('LOCAL_VOUCHERS', [])
      const codes = []
      for (let i = 0; i < count; i++) {
        const code = Math.random().toString(36).slice(2, 8).toUpperCase()
        list.push({ code, used: false, consumed_at: null })
        codes.push(code)
      }
      writeLocal('LOCAL_VOUCHERS', list)
      return codes
    }
    const { data, error } = await supabase.rpc('generate_vouchers', { v_count: count })
    if (error) throw error
    return data
  }

  async function voteCounts() {
    if (!supabase) {
      const cands = readLocal('LOCAL_CANDIDATES', [])
      const votes = readLocal('LOCAL_BALLOT_VOTES', [])
      const counts = cands.map(c => ({ id: c.id, name: c.name, photo_url: c.photo_url, votes: votes.filter(v => v.candidate_id === c.id).length }))
      return counts
    }
    const { data, error } = await supabase
      .from('candidates')
      .select('id,name,photo_url,votes:ballot_votes(count)')
    if (error) throw error
    return data.map(c => ({ id: c.id, name: c.name, photo_url: c.photo_url, votes: c.votes?.length ? c.votes[0].count : 0 }))
  }

  async function bootstrapAdmin(email) {
    if (!supabase) {
      return true
    }
    const { data, error } = await supabase.rpc('bootstrap_admin', { user_email: email })
    if (error) throw error
    return !!data
  }

  function subscribeVoteChanges(handler) {
    if (!supabase) {
      return { unsubscribe: () => {} }
    }
    const channel = supabase
      .channel('votes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ballot_votes' }, handler)
      .subscribe()
    return channel
  }

  function setSupabaseConfig(url, key) {
    localStorage.setItem('SUPABASE_URL', url)
    localStorage.setItem('SUPABASE_ANON_KEY', key)
    initClient()
    if (window.api) {
      window.api.supabase = supabase
    }
    return true
  }

  window.api = {
    supabase,
    isConfigured: () => !!supabase,
    getDemoVoucher: () => (readLocal('LOCAL_VOUCHERS', []).find(v => v.code === 'DEMO99999') ? 'DEMO99999' : null),
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
