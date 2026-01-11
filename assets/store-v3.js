// Gunakan var agar bisa diakses global
var supabase = null;

;(function () {
  // 1. Definisikan window.api segera agar tidak 'undefined'
  window.api = {
    supabase: null,
    isConfigured: () => !!supabase,
    
    // Fungsi login dengan proteksi ekstra
    signIn: async function(email, password) {
      // Jika supabase belum siap, coba paksa inisialisasi sekali lagi
      if (!supabase) initSupabase(); 
      if (!supabase) throw new Error("Database belum siap. Cek koneksi internet atau config.js");
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      localStorage.setItem('ADMIN_SESSION', 'true');
      return data.user;
    },

    signUp: async (email, password) => {
      if (!supabase) initSupabase();
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
      if (!supabase) initSupabase();
      if (!supabase) return [];
      const { data, error } = await supabase.from('candidates').select('*').order('name');
      if (error) throw error;
      return data || [];
    },

    voteCounts: async () => {
      if (!supabase) initSupabase();
      if (!supabase) return [];
      const { data, error } = await supabase.from('candidates').select('id, name, photo_url, votes:ballot_votes(count)');
      if (error) throw error;
      return data.map(c => ({
        id: c.id,
        name: c.name,
        photo_url: c.photo_url,
        votes: c.votes[0]?.count || 0
      }));
    },
    
    // Fungsi-fungsi pembantu agar admin-v3.js tidak crash
    setSupabaseConfig: (url, key) => {
      window.SUPABASE_URL = url;
      window.SUPABASE_ANON_KEY = key;
      return initSupabase();
    },
    listVouchers: async () => {
      if (!supabase) initSupabase();
      const { data, error } = await supabase.from('vouchers').select('*');
      return data || [];
    },
    bootstrapAdmin: async () => true,
    subscribeVoteChanges: (handler) => ({ unsubscribe: () => {} })
  };

  // 2. Fungsi Inisialisasi yang bisa dipanggil kapan saja
  function initSupabase() {
    const url = window.SUPABASE_URL;
    const key = window.SUPABASE_ANON_KEY;

    if (url && key && window.supabase) {
      supabase = window.supabase.createClient(url, key);
      window.api.supabase = supabase;
      console.log("Supabase Ready!");
      return true;
    }
    return false;
  }

  // 3. Coba inisialisasi berkala (jika config.js telat loading)
  const retryInit = setInterval(() => {
    if (initSupabase()) {
      clearInterval(retryInit);
    }
  }, 500);

  // Jalankan sekali di awal
  initSupabase();
})();
