;(function () {
  // Variabel internal
  let supabase = null;

  // Fungsi inisialisasi agar sinkron dengan admin-v3.js
  function initSupabase(url, key) {
    if (url && key && window.supabase) {
      supabase = window.supabase.createClient(url, key);
      window.api.supabase = supabase; // Update global api object
      console.log("Supabase initialized!");
      return true;
    }
    return false;
  }

  // Ambil dari config.js dulu kalau ada
  if (window.config) {
    initSupabase(window.config.url, window.config.key);
  }

  // --- Implementasi Fungsi ---
  window.api = {
    supabase: supabase,
    
    // Fungsi yang diminta admin-v3.js agar tidak error undefined
    setSupabaseConfig: (url, key) => initSupabase(url, key),
    isConfigured: () => !!supabase,
    
    signIn: async (email, password) => {
      if (!supabase) throw new Error("Database belum siap");
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      localStorage.setItem('ADMIN_SESSION', 'true');
      return data.user;
    },

    signUp: async (email, password) => {
      if (!supabase) throw new Error("Database belum siap");
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data.user;
    },

    signOut: async () => {
      if (supabase) await supabase.auth.signOut();
      localStorage.removeItem('ADMIN_SESSION');
      return true;
    },

    getCandidates: async () => {
      const { data, error } = await supabase.from('candidates').select('*').order('name');
      if (error) throw error;
      return data || [];
    },

    addCandidate: async (name, photoUrl) => {
      const { data, error } = await supabase.from('candidates').insert([{ name, photo_url: photoUrl }]);
      if (error) throw error;
      return data;
    },

    updateCandidate: async (id, updates) => {
      const { error } = await supabase.from('candidates').update(updates).eq('id', id);
      if (error) throw error;
    },

    deleteCandidate: async (id) => {
      const { error } = await supabase.from('candidates').delete().eq('id', id);
      if (error) throw error;
    },

    generateVouchers: async (count) => {
      const newVouchers = Array.from({ length: count }, () => ({
        code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        is_used: false
      }));
      const { data, error } = await supabase.from('vouchers').insert(newVouchers).select();
      if (error) throw error;
      return (data || []).map(v => v.code);
    },

    listVouchers: async (limit = 100) => {
      const { data, error } = await supabase.from('vouchers').select('*').limit(limit).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    voteCounts: async () => {
      const { data, error } = await supabase.from('candidates').select('id, name, photo_url, votes:ballot_votes(count)');
      if (error) throw error;
      return data.map(c => ({
        id: c.id,
        name: c.name,
        photo_url: c.photo_url,
        votes: c.votes[0]?.count || 0
      }));
    },

    bootstrapAdmin: async () => true,

    subscribeVoteChanges: (handler) => {
      if (!supabase) return { unsubscribe: () => {} };
      const channel = supabase.channel('realtime-votes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ballot_votes' }, () => handler())
        .subscribe();
      return channel;
    }
  };
})();
