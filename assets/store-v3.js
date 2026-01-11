;(function () {
  let supabase = null;

  // 1. Fungsi Inisialisasi - Menggunakan nama variabel sesuai config.js kamu
  function initSupabase() {
    const url = window.SUPABASE_URL; // Sesuai baris 1 di config.js
    const key = window.SUPABASE_ANON_KEY; // Sesuai baris 2 di config.js

    if (url && key && window.supabase) {
      supabase = window.supabase.createClient(url, key);
      window.api.supabase = supabase;
      return true;
    }
    return false;
  }

  // Jalankan inisialisasi saat file dimuat
  initSupabase();

  // --- Implementasi Fungsi ---
  window.api = {
    supabase: supabase,
    setSupabaseConfig: (url, key) => {
        window.SUPABASE_URL = url;
        window.SUPABASE_ANON_KEY = key;
        return initSupabase();
    },
    isConfigured: () => !!supabase,
    
    signIn: async (email, password) => {
      if (!supabase) throw new Error("Database belum siap. Cek config.js");
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
      if (!supabase) return [];
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
      return supabase.channel('realtime-votes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ballot_votes' }, () => handler())
        .subscribe();
    }
  };
})();
