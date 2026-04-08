window.onerror = function(msg, url, lineNo, columnNo, error) {
    alert("CRASH JAVASCRIPT: " + msg + "\nLigne: " + lineNo);
    return false;
};
window.addEventListener('unhandledrejection', function(event) {
    alert("CRASH RESEAU/PROMESSE: " + event.reason);
});

// ============================================
// CONFIGURATION CLOUD SUPABASE
// ============================================
const SUPABASE_URL = 'https://szxjqlsquutjebihubjd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LGxEeRxcumrmSaREEZTvXw_pVg3TrRe';

let supabase;
try {
    if (!window.supabase) {
        alert("ERREUR GRAVE: La bibliothèque de connexion a été bloquée par votre ordinateur (Pare-feu ou antivirus).");
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
    alert("Impossible de démarrer la base de données: " + err.message);
}

// State
let allTransactions = [];
let allCategories = [];
let currentUser = null;

// DOM
const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const mainTableBody = document.getElementById('full-transactions-body');
const recentTableBody = document.getElementById('recent-transactions-body');
const categorySummaryEl = document.getElementById('category-summary');

// UI Init
async function initApp() {
    try {
        if (window.lucide) lucide.createIcons();
    } catch(e) { console.error("Lucide error:", e); }
    
    try {
        setupAuthListeners();
        setupUIEventListeners();
    } catch(e) {
        alert("CRASH FATAL DEMARRAGE: " + e.message);
    }
}

// ============================================
// AUTHENTIFICATION
// ============================================
function setupAuthListeners() {
    const authForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');

    // Vérifier session
    supabase.auth.getSession().then(({ data: { session } }) => {
        handleSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
        handleSession(session);
    });

    authForm.onsubmit = async (e) => {
        e.preventDefault();
        alert("Clic bouton détecté ! Envoi à Supabase...");
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const errorEl = document.getElementById('auth-error');
        
        errorEl.textContent = "Connexion en cours...";
        
        let { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.error("Erreur de connexion:", error);
            // Tentative d'inscription si compte introuvable (Pour la démo)
            let signUp = await supabase.auth.signUp({ email, password });
            if (signUp.error) {
                errorEl.textContent = signUp.error.message;
                alert("Erreur Supabase: " + signUp.error.message + "\nAssurez-vous que l'email n'a pas besoin d'être confirmé ou que le mot de passe fait plus de 6 caractères.");
            }
            else {
                errorEl.textContent = "Veuillez vérifier votre email pour confirmer.";
                alert("Un email vous été envoyé OU vous avez bien créé le compte (si vous avez désactivé la confirmation).");
            }
        }
    };

    logoutBtn.onclick = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };
}

function handleSession(session) {
    if (session) {
        currentUser = session.user;
        document.getElementById('auth-overlay').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        document.getElementById('display-user-email').textContent = currentUser.email;
        document.getElementById('t-initiator').value = currentUser.email.split('@')[0]; // Préremplir
        
        // Démarrer la synchro temps réel une fois connecté
        loadData();
        subscribeToRealtime();
    } else {
        currentUser = null;
        document.getElementById('auth-overlay').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
}

// ============================================
// DONNÉES & TEMPS RÉEL (SYNC)
// ============================================
async function loadData() {
    // Fetch Categories
    const { data: cats } = await supabase.from('categories').select('*').order('name');
    if (cats) {
        allCategories = cats.map(c => c.name);
        updateCategoryOptions(allCategories);
    }
    
    // Fetch Transactions
    const { data: txs } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (txs) {
        allTransactions = txs;
        updateDashboard();
        renderTables();
    }
}

function subscribeToRealtime() {
    supabase.channel('public:transactions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, payload => {
            console.log("Nouveau changement synchronisé !", payload);
            showToast("Une donnée a été mise à jour par un autre utilisateur.");
            loadData(); // Recharger les données instantanément
        })
        .subscribe();
}

// ============================================
// UI & LOGIQUE
// ============================================
function updateDashboard() {
    let inc = 0, exp = 0;
    const catsStats = {};

    allTransactions.forEach(t => {
        if (t.type === 'income') inc += t.amount;
        else exp += t.amount;
        catsStats[t.category] = (catsStats[t.category] || 0) + t.amount;
    });

    totalBalanceEl.textContent = formatCurrency(inc - exp);
    totalIncomeEl.textContent = formatCurrency(inc);
    totalExpenseEl.textContent = formatCurrency(exp);

    categorySummaryEl.innerHTML = Object.entries(catsStats).map(([name, val]) => `
        <div class="category-item"><span class="cat-name">${name}</span><span class="cat-value">${formatCurrency(val)}</span></div>
    `).join('');
}

function renderTables() {
    // Recent (Top 5)
    recentTableBody.innerHTML = allTransactions.slice(0, 5).map(t => `
        <tr><td>${new Date(t.date).toLocaleDateString()}</td><td><strong>${t.reference}</strong></td><td>${t.description}</td>
        <td class="${t.type === 'income' ? 'text-emerald' : 'text-rose'}">${formatCurrency(t.amount)}</td></tr>
    `).join('');

    // Full
    mainTableBody.innerHTML = allTransactions.map(t => `
        <tr class="fade-in"><td>${new Date(t.date).toLocaleDateString()}</td><td class="ref-badge">${t.reference}</td><td>${t.initiator}</td>
        <td><span class="cat-tag">${t.category}</span></td><td>${t.description}</td>
        <td class="${t.type === 'income' ? 'text-emerald' : ''}">${t.type === 'income' ? formatCurrency(t.amount) : '-'}</td>
        <td class="${t.type === 'expense' ? 'text-rose' : ''}">${t.type === 'expense' ? formatCurrency(t.amount) : '-'}</td></tr>
    `).join('');
    lucide.createIcons();
}

function updateCategoryOptions(categories) {
    const datalist = document.getElementById('category-options');
    const filterSelect = document.getElementById('filter-category');
    const optionsHtml = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    datalist.innerHTML = optionsHtml;
    const currentFilter = filterSelect.value;
    filterSelect.innerHTML = `<option value="">Toutes les catégories</option>` + optionsHtml;
    filterSelect.value = currentFilter;
}

// GESTION FORMULAIRE
document.getElementById('transaction-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = "Publication...";

    const categoryInput = document.getElementById('t-category').value.trim();
    
    // Sauvegarder la catégorie si nouvelle
    if (!allCategories.includes(categoryInput)) {
        await supabase.from('categories').insert([{ name: categoryInput }]);
    }

    // Insérer transaction
    const newTx = {
        date: document.getElementById('t-date').value,
        reference: document.getElementById('t-piece').value,
        initiator: document.getElementById('t-initiator').value,
        type: document.getElementById('t-type').value,
        category: categoryInput,
        description: document.getElementById('t-desc').value,
        amount: parseFloat(document.getElementById('t-amount').value),
        user_id: currentUser.id
    };

    const { error } = await supabase.from('transactions').insert([newTx]);
    btn.textContent = "Publier (Temps réel)";

    if (error) {
        showToast("Erreur lors de l'enregistrement", "error");
    } else {
        document.getElementById('transaction-modal').classList.remove('active');
        document.getElementById('transaction-form').reset();
        // Optionnel : Générer le word localement en appelant la fonction generate-word JS si besoin
        showToast("Synchronisé sur le Cloud !");
    }
};

function setupUIEventListeners() {
    // Tabs
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // Modals
    document.getElementById('add-transaction-btn').onclick = () => document.getElementById('transaction-modal').classList.add('active');
    document.getElementById('close-modal').onclick = () => document.getElementById('transaction-modal').classList.remove('active');
    document.getElementById('cancel-modal').onclick = () => document.getElementById('transaction-modal').classList.remove('active');

    // Moteur de recherche local rapide
    document.getElementById('global-search').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const rows = mainTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(val) ? '' : 'none';
        });
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' F CFA';
}

function showToast(msg, type = "success") {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3000);
}

initApp();
