;(function () {
  // Ambil config dari file config.js atau variabel global
  const { url, key } = window.config || { url: '', key: '' };
  const supabase = url && key ? window.supabase.createClient(url, key) : null;

  async function getCandidates() {
    const { data, error } = await supabase.from('candidates').select('*').order('name');
    if (error) throw error;
    return data;
  }

  async function validateVoucher(code) {
    const { data, error } = await supabase.from('vouchers').select('is_used').eq('code', code).single();
    if (error || !data) return false;
    return !data.is_used;
  }

  async function submitBallot(code, candidateIds) {
    // Memanggil fungsi SQL yang kita buat tadi
    const { error } = await supabase.rpc('submit_ballot', { 
      voucher_code: code, 
      candidate_ids: candidateIds 
    });
    if (error) throw error;
    return true;
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    localStorage.setItem('ADMIN_SESSION', 'true');
    return data.user;
  }

  async function signOut() {
    await supabase.auth.signOut();
    localStorage.removeItem('ADMIN_SESSION');
    return true;
  }

  async function listVouchers() {
    const { data, error } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async function voteCounts() {
    const { data, error } = await supabase
      .from('candidates')
      .select('id, name, photo_url, votes:ballot_votes(count)');
    if (error) throw error;
    return data.map(c => ({
      id: c.id,
      name: c.name,
      photo_url: c.photo_url,
      votes: c.votes[0]?.count || 0
    }));
  }

  // Expose API ke Window (Agar dibaca admin-v3.js)
  window.api = {
    supabase,
    isConfigured: () => !!supabase,
    getCandidates,
    validateVoucher,
    submitBallot,
    signIn,
    signOut,
    listVouchers,
    voteCounts,
    subscribeVoteChanges: (handler) => {
        return supabase.channel('custom-all-channel')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ballot_votes' }, () => handler())
          .subscribe();
    }
  }
})()
