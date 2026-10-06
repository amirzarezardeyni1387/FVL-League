/* ==========================================================================
   FVL VIRTUAL LEAGUE - COMPLETE SCRIPT
   ========================================================================== */

// --- GLOBAL STATE ---
let currentUser = null; // مشخص‌کننده کاربر جاری
let newsData = [];
let standingsData = [];
let historyData = [];
let honorsData = [];
let rulesData = [];
let statsData = { goals: [], assists: [], cleansheets: [] };
let requestsData = [];
let cupData = {
    s1_1: '', s1_2: '',
    s2_1: '', s2_2: '',
    f_1: '', f_2: '',
    winner: ''
};

// لیست تیم‌های لیگ
const TEAMS_LIST = [
    { id: 'mancity', name: 'منچستر سیتی', budget: 3000 },
    { id: 'realmadrid', name: 'رئال مادرید', budget: 3000 },
    { id: 'psg', name: 'پاری سن ژرمن', budget: 3000 },
    { id: 'juventus', name: 'یوونتوس', budget: 3000 }
];

function getTeamBudgets() {
    const saved = localStorage.getItem('fvl_team_budgets');
    if (saved) return JSON.parse(saved);
    
    // در صورت عدم وجود، مقادیر پیش‌فرض ایجاد می‌شود
    const initial = {};
    TEAMS_LIST.forEach(t => initial[t.id] = t.budget);
    localStorage.setItem('fvl_team_budgets', JSON.stringify(initial));
    return initial;
}

function saveTeamBudget(teamId) {
    const inputEl = document.getElementById(`budget_input_${teamId}`);
    if (!inputEl) return;

    const newBudget = parseFloat(inputEl.value);
    if (isNaN(newBudget) || newBudget < 0) {
        alert('لطفاً یک مبلغ معتبر وارد کنید.');
        return;
    }

    const budgets = getTeamBudgets();
    budgets[teamId] = newBudget;
    localStorage.setItem('fvl_team_budgets', JSON.stringify(budgets));
    
    alert('بودجه تیم با موفقیت بروزرسانی شد.');
    updateBudgetDisplay();
}
// نمایش بودجه در بالای صفحه و بخش تنظیمات ادمین
function updateBudgetDisplay() {
    const budgets = getTeamBudgets();

    // ۱. بروزرسانی مقدار نشان داده شده در بالای صفحه (برای تیم لاگین شده)
    const currentTeamBudget = budgets[currentUser] || 0;
    const topBudgetEl = document.getElementById('userBudgetDisplay'); // آیدی المان سکه/بودجه در بالای صفحه
    if (topBudgetEl) {
        topBudgetEl.textContent = currentTeamBudget.toLocaleString('fa-IR');
    }

    // ۲. رندر کردن فرم ویرایش بودجه‌ها برای ادمین (در صورت وجود بخش مربوطه)
    const adminBudgetContainer = document.getElementById('adminBudgetList');
    if (adminBudgetContainer && currentUser === 'admin') {
        adminBudgetContainer.innerHTML = TEAMS_LIST.map(t => `
            <div class="budget-edit-item" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 8px;">
                <span style="font-weight: bold; color: #fff;">${t.name}:</span>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <input type="number" id="budget_input_${t.id}" value="${budgets[t.id] || 0}" style="width: 90px; padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.4); color: #fff; text-align: center;">
                    <span style="font-size: 0.8rem; color: #8a99ad;">میلیون</span>
                    <button onclick="saveTeamBudget('${t.id}')" style="background: #22c55e; color: #fff; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">ثبت</button>
                </div>
            </div>
        `).join('');
    }
}
// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadAllDataFromStorage();
    checkSession();
});

// --- DATA PERSISTENCE (LOCAL STORAGE) ---
function loadAllDataFromStorage() {
    newsData = JSON.parse(localStorage.getItem('fvl_news')) || getInitialNews();
    standingsData = JSON.parse(localStorage.getItem('fvl_standings')) || getInitialStandings();
    historyData = JSON.parse(localStorage.getItem('fvl_history')) || ['افتتاح رسمی فصل ۲۰۲۶ لیگ مجازی FVL.'];
    honorsData = JSON.parse(localStorage.getItem('fvl_honors')) || [];
    rulesData = JSON.parse(localStorage.getItem('fvl_rules')) || ['احترام به مربیان حریف الزامی است.', 'مهلت ارسال ترکیب تا ۲ ساعت قبل از بازی می‌باشد.'];
    statsData = JSON.parse(localStorage.getItem('fvl_stats')) || { goals: [], assists: [], cleansheets: [] };
    requestsData = JSON.parse(localStorage.getItem('fvl_requests')) || [];
    cupData = JSON.parse(localStorage.getItem('fvl_cup')) || cupData;
}

function saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// --- AUTHENTICATION & SESSION MANAGEMENT ---
function checkSession() {
    const savedUser = localStorage.getItem('fvl_logged_user');
    if (savedUser) {
        currentUser = savedUser;
        document.getElementById('loginScreen').style.display = 'none';
        setupUserEnvironment();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
    }
}

function handleLogin() {
    const userInp = document.getElementById('username').value.trim().toLowerCase();
    const passInp = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('loginError');

    if (!userInp) {
        errorEl.textContent = 'لطفاً نام کاربری را وارد کنید!';
        errorEl.style.display = 'block';
        return;
    }

    // پشتیبانی از ورود ادمین و همه تیم‌ها
    currentUser = userInp;
    localStorage.setItem('fvl_logged_user', currentUser);
    errorEl.style.display = 'none';
    document.getElementById('loginScreen').style.display = 'none';
    
    setupUserEnvironment();
}

function setupUserEnvironment() {
    const isAdmin = (currentUser === 'admin');
    
    // تنظیم تم و عناوین بر اساس کاربر
    document.body.setAttribute('data-theme', isAdmin ? 'mancity' : currentUser);
    
    const teamObj = TEAMS_LIST.find(t => t.id === currentUser);
    const teamName = teamObj ? teamObj.name : (isAdmin ? 'مدیریت کل لیگ' : currentUser);
    
    const welcomeEl = document.getElementById('welcomeText');
    if (welcomeEl) welcomeEl.textContent = `تیم ${teamName}`;

    // نمایش/مخفی‌سازی بخش‌های مخصوص ادمین
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        el.style.display = isAdmin ? 'block' : 'none';
    });

    // بارگذاری ترکیب و تاکتیک مخصوص این تیم
    loadTeamSquadAndTactics();

    // رندر اولیه تمام بخش‌ها
    renderNewsFeed();
    renderStandings();
    renderHistory();
    renderHonors();
    renderRules();
    renderStats();
    renderRequests();
    renderCup();
    updateBudgetDisplay();
}

function openLogoutModal() {
    document.getElementById('logoutModal').style.display = 'flex';
}

function closeLogoutModal() {
    document.getElementById('logoutModal').style.display = 'none';
}

function confirmLogout() {
    localStorage.removeItem('fvl_logged_user');
    currentUser = null;
    closeLogoutModal();
    document.getElementById('loginScreen').style.display = 'flex';
}

// --- NAVIGATION & TABS ---
function switchTab(sectionId, element) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.footer-nav .nav-item').forEach(item => item.classList.remove('active'));

    const targetSection = document.getElementById(sectionId);
    if (targetSection) targetSection.classList.add('active');
    if (element) element.classList.add('active');

    // اگر به بخش ترکیب آمدیم، مجدداً داده‌های ترکیب تیم بارگذاری شوند
    if (sectionId === 'squadSection') {
        loadTeamSquadAndTactics();
    }
}

function switchLeagueSubTab(subId, element) {
    document.querySelectorAll('.league-sub-content').forEach(sub => sub.classList.remove('active'));
    document.querySelectorAll('.subnav-btn').forEach(btn => btn.classList.remove('active'));

    const targetSub = document.getElementById(subId);
    if (targetSub) targetSub.classList.add('active');
    if (element) element.classList.add('active');
}

// ==========================================================================
// MODULE: SQUAD & TACTICS MANAGEMENT (مدیریت ترکیب اختصاصی هر تیم)
// ==========================================================================

function handleImageUpload(event, previewId, placeholderId, resetBtnId) {
    const file = event.target.files[0];
    if (!file) return;

    // بررسی سایز فایل (محدودیت ۵ مگابایت برای جلوگیری از پر شدن سریع LocalStorage)
    if (file.size > 5 * 1024 * 1024) {
        alert('حجم عکس انتخابی نباید بیشتر از ۵ مگابایت باشد.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        
        // اگر ادمین در حال مشاهده تیم دیگری است، عکس برای همان تیم ذخیره شود
        const selectedTeam = getActiveSquadTeam();
        const imageType = previewId.includes('squad') ? 'squad' : 'tactic';

        // ذخیره اختصاصی در LocalStorage با کلید مربوط به تیم
        localStorage.setItem(`fvl_team_${selectedTeam}_${imageType}`, imageData);

        // نمایش پیش‌نمایش
        showImagePreview(imageData, previewId, placeholderId, resetBtnId);
    };
    reader.readAsDataURL(file);
}

function showImagePreview(imageData, previewId, placeholderId, resetBtnId) {
    const preview = document.getElementById(previewId);
    const placeholder = document.getElementById(placeholderId);
    const resetBtn = document.getElementById(resetBtnId);

    if (preview && placeholder && resetBtn) {
        preview.src = imageData;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        resetBtn.style.display = 'inline-block';
    }
}

function resetImageUpload(inputId, previewId, placeholderId, resetBtnId) {
    const selectedTeam = getActiveSquadTeam();
    const imageType = previewId.includes('squad') ? 'squad' : 'tactic';

    // حذف از حافظه
    localStorage.removeItem(`fvl_team_${selectedTeam}_${imageType}`);

    // بازنشانی UI
    resetImageUI(inputId, previewId, placeholderId, resetBtnId);
}

function resetImageUI(inputId, previewId, placeholderId, resetBtnId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const placeholder = document.getElementById(placeholderId);
    const resetBtn = document.getElementById(resetBtnId);

    if (input) input.value = '';
    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    if (placeholder) placeholder.style.display = 'flex';
    if (resetBtn) resetBtn.style.display = 'none';
}

// مشخص می‌کند ترکیب کدام تیم باید بارگذاری یا ذخیره شود
function getActiveSquadTeam() {
    const teamSelect = document.getElementById('adminSquadTeamSelect');
    if (currentUser === 'admin' && teamSelect) {
        return teamSelect.value;
    }
    return currentUser || 'guest';
}

// بارگذاری تصاویر ترکیب و تاکتیک تیم فعال
function loadTeamSquadAndTactics() {
    setupAdminSquadSelector(); // ایجاد منوی انتخاب تیم برای مدیر در صورت نیاز

    const activeTeam = getActiveSquadTeam();
    const savedSquad = localStorage.getItem(`fvl_team_${activeTeam}_squad`);
    const savedTactic = localStorage.getItem(`fvl_team_${activeTeam}_tactic`);

    if (savedSquad) {
        showImagePreview(savedSquad, 'squadPreview', 'squadPlaceholder', 'squadResetBtn');
    } else {
        resetImageUI('squadImageInput', 'squadPreview', 'squadPlaceholder', 'squadResetBtn');
    }

    if (savedTactic) {
        showImagePreview(savedTactic, 'tacticPreview', 'tacticPlaceholder', 'tacticResetBtn');
    } else {
        resetImageUI('tacticImageInput', 'tacticPreview', 'tacticPlaceholder', 'tacticResetBtn');
    }
}

// ایجاد منوی کشویی انتخاب تیم برای مدیر در صفحه ترکیب
function setupAdminSquadSelector() {
    let selectorWrapper = document.getElementById('adminSquadSelectorWrapper');
    const squadContainer = document.querySelector('.squad-container');

    if (!squadContainer) return;

    if (currentUser === 'admin') {
        if (!selectorWrapper) {
            selectorWrapper = document.createElement('div');
            selectorWrapper.id = 'adminSquadSelectorWrapper';
            selectorWrapper.className = 'admin-form-block admin-only';
            selectorWrapper.style.marginBottom = '20px';
            selectorWrapper.innerHTML = `
                <label style="font-weight: bold; margin-left: 10px;"><i class="fa-solid fa-eye"></i> مشاهده و مدیریت ترکیب تیم:</label>
                <select id="adminSquadTeamSelect" onchange="loadTeamSquadAndTactics()" style="padding: 8px 15px; border-radius: 8px; background: rgba(0,0,0,0.3); color: #fff; border: 1px solid rgba(255,255,255,0.2);">
                    ${TEAMS_LIST.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
            `;
            squadContainer.insertBefore(selectorWrapper, squadContainer.firstChild);
        }
    } else if (selectorWrapper) {
        selectorWrapper.remove();
    }
}

// ==========================================================================
// MODULE: TRANSFERS & REQUESTS (نقل و انتقالات)
// ==========================================================================

function submitRequest(type) {
    let text = '';
    const teamObj = TEAMS_LIST.find(t => t.id === currentUser);
    const teamName = teamObj ? teamObj.name : currentUser;

    if (type === 'buy') {
        const pName = document.getElementById('buyPlayerName').value.trim();
        if (!pName) return alert('نام بازیکن را وارد کنید.');
        text = `درخواست خرید بازیکن: ${pName} (توسط ${teamName})`;
        document.getElementById('buyPlayerName').value = '';
    } else if (type === 'sell') {
        const pName = document.getElementById('sellPlayerName').value.trim();
        if (!pName) return alert('نام بازیکن را وارد کنید.');
        text = `پیشنهاد فروش بازیکن: ${pName} (از طرف ${teamName})`;
        document.getElementById('sellPlayerName').value = '';
    } else if (type === 'coach') {
        const pName = document.getElementById('coachPlayerName').value.trim();
        const price = document.getElementById('coachOfferPrice').value;
        if (!pName || !price) return alert('نام بازیکن و مبلغ را وارد کنید.');
        text = `پیشنهاد مستقیم به مربی: ${pName} با مبلغ ${price} میلیون (از طرف ${teamName})`;
        document.getElementById('coachPlayerName').value = '';
        document.getElementById('coachOfferPrice').value = '';
    }

    const newReq = {
        id: Date.now(),
        sender: teamName,
        text: text,
        date: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    };

    requestsData.unshift(newReq);
    saveData('fvl_requests', requestsData);
    renderRequests();
    alert('درخواست شما با موفقیت ثبت شد.');
}

function renderRequests() {
    const listEl = document.getElementById('requestsList');
    if (!listEl) return;

    if (requestsData.length === 0) {
        listEl.innerHTML = '<p class="text-muted" style="text-align: center; padding: 15px;">هیچ درخواستی ثبت نشده است.</p>';
        return;
    }

    listEl.innerHTML = requestsData.map(req => `
        <div class="request-item" style="background: rgba(255,255,255,0.05); padding: 10px 15px; margin-bottom: 8px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong style="color: #4facfe;">${req.sender}:</strong>
                <span style="margin-right: 8px; color: #e2e8f0;">${req.text}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 0.75rem; color: #8a99ad;">${req.date}</span>
                ${currentUser === 'admin' ? `<button onclick="deleteRequest(${req.id})" style="background: none; border: none; color: #ff4b4b; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
        </div>
    `).join('');
}

function deleteRequest(id) {
    requestsData = requestsData.filter(r => r.id !== id);
    saveData('fvl_requests', requestsData);
    renderRequests();
}

// ==========================================================================
// MODULE: NEWS (اخبار و حواشی)
// ==========================================================================

function getInitialNews() {
    return [
        {
            id: 1,
            title: 'آغاز رسمی رقابت‌های فصل جدید FVL',
            category: 'leaguenameh',
            content: 'فصل جدید مسابقات لیگ مجازی FVL با حضور مدعیان اصلی قهرمانی رسماً کلید خورد.',
            date: '۱۴۰۴/۱۲/۱۰'
        }
    ];
}

function saveNews() {
    const title = document.getElementById('newsTitleInput').value.trim();
    const cat = document.getElementById('newsCategorySelect').value;
    const content = document.getElementById('newsContentInput').value.trim();
    const editId = document.getElementById('editNewsId').value;

    if (!title || !content) return alert('لطفاً عنوان و متن خبر را تکمیل کنید.');

    if (editId) {
        const index = newsData.findIndex(n => n.id == editId);
        if (index !== -1) {
            newsData[index].title = title;
            newsData[index].category = cat;
            newsData[index].content = content;
        }
    } else {
        const newNews = {
            id: Date.now(),
            title: title,
            category: cat,
            content: content,
            date: new Date().toLocaleDateString('fa-IR')
        };
        newsData.unshift(newNews);
    }

    saveData('fvl_news', newsData);
    cancelNewsEdit();
    renderNewsFeed();
}

function filterNews(cat, btn) {
    document.querySelectorAll('.news-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderNewsFeed(cat);
}

function renderNewsFeed(categoryFilter = 'all') {
    const feed = document.getElementById('newsFeed');
    if (!feed) return;

    let filtered = newsData;
    if (categoryFilter !== 'all') {
        filtered = newsData.filter(n => n.category === categoryFilter);
    }

    if (filtered.length === 0) {
        feed.innerHTML = '<p class="text-muted" style="text-align:center; padding: 20px;">خبری در این دسته‌بندی یافت نشد.</p>';
        return;
    }

    feed.innerHTML = filtered.map(item => `
        <div class="news-card" style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; margin-bottom: 15px; border-right: 4px solid #4facfe;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                <span class="badge" style="background: #4facfe; color: #000; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">${getCategoryLabel(item.category)}</span>
                <span style="font-size: 0.75rem; color: #8a99ad;">${item.date}</span>
            </div>
            <h3 style="margin-bottom: 8px; color: #fff;">${item.title}</h3>
            <p style="color: #cbd5e1; font-size: 0.9rem; line-height: 1.6;">${item.content}</p>
            ${currentUser === 'admin' ? `
                <div style="margin-top: 10px; display: flex; gap: 10px;">
                    <button onclick="editNews(${item.id})" style="background: #eab308; color: #000; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">ویرایش</button>
                    <button onclick="deleteNews(${item.id})" style="background: #ef4444; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">حذف</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function getCategoryLabel(cat) {
    if (cat === 'havashi') return '🔥 حواشی';
    if (cat === 'leaguenameh') return '📜 لیگ‌نامه';
    if (cat === 'zarebin') return '🔍 زیر ذره‌بین';
    return 'خبر';
}

function editNews(id) {
    const item = newsData.find(n => n.id === id);
    if (!item) return;

    document.getElementById('editNewsId').value = item.id;
    document.getElementById('newsTitleInput').value = item.title;
    document.getElementById('newsCategorySelect').value = item.category;
    document.getElementById('newsContentInput').value = item.content;
    document.getElementById('newsFormTitle').textContent = 'ویرایش خبر';
    document.getElementById('btnCancelEdit').style.display = 'inline-block';
}

function cancelNewsEdit() {
    document.getElementById('editNewsId').value = '';
    document.getElementById('newsTitleInput').value = '';
    document.getElementById('newsContentInput').value = '';
    document.getElementById('newsFormTitle').textContent = 'مدیریت اخبار (ویژه مدیریت)';
    document.getElementById('btnCancelEdit').style.display = 'none';
}

function deleteNews(id) {
    if (confirm('آیا از حذف این خبر اطمینان دارید؟')) {
        newsData = newsData.filter(n => n.id !== id);
        saveData('fvl_news', newsData);
        renderNewsFeed();
    }
}

// ==========================================================================
// MODULE: LEAGUE STANDINGS & HISTORY (جدول و تاریخچه)
// ==========================================================================

function getInitialStandings() {
    return TEAMS_LIST.map(t => ({
        id: t.id,
        name: t.name,
        played: 0, won: 0, drawn: 0, lost: 0,
        gf: 0, ga: 0, gd: 0, points: 0
    }));
}

function renderStandings() {
    const tbody = document.getElementById('standingsTbody');
    if (!tbody) return;

    // مرتب‌سازی جدول بر اساس امتیاز، تفاضل گل و گل زده
    const sorted = [...standingsData].sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);

    tbody.innerHTML = sorted.map((team, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td><strong>${team.name}</strong></td>
            <td>${team.played}</td>
            <td>${team.won}</td>
            <td>${team.drawn}</td>
            <td>${team.lost}</td>
            <td>${team.gf}</td>
            <td>${team.ga}</td>
            <td>${team.gd}</td>
            <td><strong>${team.points}</strong></td>
        </tr>
    `).join('');
}

function toggleEditStandings() {
    const form = document.getElementById('standingsEditForm');
    if (!form) return;

    if (form.style.display === 'none') {
        const container = document.getElementById('standingsInputsContainer');
        container.innerHTML = standingsData.map(t => `
            <div style="display: flex; gap: 5px; margin-bottom: 8px; align-items: center; background: rgba(0,0,0,0.2); padding: 5px; border-radius: 6px;">
                <span style="width: 120px; font-weight: bold;">${t.name}:</span>
                بازی: <input type="number" id="p_${t.id}" value="${t.played}" style="width: 45px;">
                برد: <input type="number" id="w_${t.id}" value="${t.won}" style="width: 45px;">
                مساوی: <input type="number" id="d_${t.id}" value="${t.drawn}" style="width: 45px;">
                باخت: <input type="number" id="l_${t.id}" value="${t.lost}" style="width: 45px;">
                گ.زد: <input type="number" id="gf_${t.id}" value="${t.gf}" style="width: 45px;">
                گ.خ: <input type="number" id="ga_${t.id}" value="${t.ga}" style="width: 45px;">
            </div>
        `).join('');
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
}

function saveStandings() {
    standingsData.forEach(t => {
        const p = parseInt(document.getElementById(`p_${t.id}`).value) || 0;
        const w = parseInt(document.getElementById(`w_${t.id}`).value) || 0;
        const d = parseInt(document.getElementById(`d_${t.id}`).value) || 0;
        const l = parseInt(document.getElementById(`l_${t.id}`).value) || 0;
        const gf = parseInt(document.getElementById(`gf_${t.id}`).value) || 0;
        const ga = parseInt(document.getElementById(`ga_${t.id}`).value) || 0;

        t.played = p; t.won = w; t.drawn = d; t.lost = l;
        t.gf = gf; t.ga = ga;
        t.gd = gf - ga;
        t.points = (w * 3) + d;
    });

    saveData('fvl_standings', standingsData);
    renderStandings();
    toggleEditStandings();
    alert('جدول با موفقیت بروزرسانی شد.');
}

function renderHistory() {
    const feed = document.getElementById('historyFeed');
    if (!feed) return;
    feed.innerHTML = historyData.map(h => `<div style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #e2e8f0;">• ${h}</div>`).join('');
}

function saveHistory() {
    const inp = document.getElementById('historyInput');
    if (!inp || !inp.value.trim()) return;
    historyData.unshift(inp.value.trim());
    saveData('fvl_history', historyData);
    inp.value = '';
    renderHistory();
}

function renderRules() {
    const feed = document.getElementById('rulesFeed');
    if (!feed) return;
    feed.innerHTML = rulesData.map((r, i) => `<div style="padding: 8px 0; color: #e2e8f0;"><strong>${i + 1}.</strong> ${r}</div>`).join('');
}

function saveRule() {
    const inp = document.getElementById('rulesInput');
    if (!inp || !inp.value.trim()) return;
    rulesData.push(inp.value.trim());
    saveData('fvl_rules', rulesData);
    inp.value = '';
    renderRules();
}

// ==========================================================================
// MODULE: HONORS & CUP & STATS (افتخارات، جام حذفی و آمار)
// ==========================================================================

function renderHonors() {
    const feed = document.getElementById('honorsFeed');
    if (!feed) return;

    if (honorsData.length === 0) {
        feed.innerHTML = '<p class="text-muted">افتخاری ثبت نشده است.</p>';
        return;
    }

    feed.innerHTML = honorsData.map(h => `
        <div class="honor-card" style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; text-align: center;">
            ${h.img ? `<img src="${h.img}" style="max-width: 100%; max-height: 120px; border-radius: 8px; margin-bottom: 10px;">` : ''}
            <h4 style="color: #facc15;">${h.title}</h4>
            <p style="font-size: 0.85rem; color: #cbd5e1;">${h.desc}</p>
        </div>
    `).join('');
}

function saveHonor() {
    const title = document.getElementById('honorTitleInput').value.trim();
    const desc = document.getElementById('honorDescInput').value.trim();
    const fileInp = document.getElementById('honorImageInput');

    if (!title) return alert('عنوان افتخار را وارد کنید.');

    const addHonor = (imgData = '') => {
        honorsData.push({ title, desc, img: imgData });
        saveData('fvl_honors', honorsData);
        renderHonors();
        document.getElementById('honorTitleInput').value = '';
        document.getElementById('honorDescInput').value = '';
        if (fileInp) fileInp.value = '';
    };

    if (fileInp && fileInp.files[0]) {
        const reader = new FileReader();
        reader.onload = e => addHonor(e.target.result);
        reader.readAsDataURL(fileInp.files[0]);
    } else {
        addHonor();
    }
}

function renderCup() {
    setupCupSelects();
    document.getElementById('b_s1_1').textContent = cupData.s1_1 || '؟';
    document.getElementById('b_s1_2').textContent = cupData.s1_2 || '؟';
    document.getElementById('b_s2_1').textContent = cupData.s2_1 || '؟';
    document.getElementById('b_s2_2').textContent = cupData.s2_2 || '؟';
    document.getElementById('b_f_1').textContent = cupData.f_1 || '؟';
    document.getElementById('b_f_2').textContent = cupData.f_2 || '؟';
    document.getElementById('b_winner').textContent = cupData.winner || '؟';
}

function setupCupSelects() {
    const ids = ['cupSemi1_1', 'cupSemi1_2', 'cupSemi2_1', 'cupSemi2_2', 'cupFinal_1', 'cupFinal_2', 'cupWinner'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.children.length === 0) {
            el.innerHTML = '<option value="">انتخاب...</option>' + TEAMS_LIST.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
        }
    });
}

function saveCupData() {
    cupData = {
        s1_1: document.getElementById('cupSemi1_1').value,
        s1_2: document.getElementById('cupSemi1_2').value,
        s2_1: document.getElementById('cupSemi2_1').value,
        s2_2: document.getElementById('cupSemi2_2').value,
        f_1: document.getElementById('cupFinal_1').value,
        f_2: document.getElementById('cupFinal_2').value,
        winner: document.getElementById('cupWinner').value
    };
    saveData('fvl_cup', cupData);
    renderCup();
    alert('جام حذفی بروزرسانی شد.');
}

function toggleEditStats() {
    const form = document.getElementById('statsEditForm');
    if (!form) return;

    if (form.style.display === 'none') {
        const sel = document.getElementById('statTeamSelect');
        if (sel) sel.innerHTML = TEAMS_LIST.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
}

function addTopStat() {
    const type = document.getElementById('statTypeSelect').value;
    const player = document.getElementById('statPlayerInput').value.trim();
    const team = document.getElementById('statTeamSelect').value;
    const count = parseInt(document.getElementById('statCountInput').value) || 0;

    if (!player || count <= 0) return alert('اطلاعات را درست وارد کنید.');

    statsData[type].push({ player, team, count });
    statsData[type].sort((a, b) => b.count - a.count);
    saveData('fvl_stats', statsData);
    renderStats();
    document.getElementById('statPlayerInput').value = '';
    document.getElementById('statCountInput').value = '';
}

function renderStats() {
    renderMiniTable('goalsTbody', statsData.goals);
    renderMiniTable('assistsTbody', statsData.assists);
    renderMiniTable('cleansheetsTbody', statsData.cleansheets);
}

function renderMiniTable(tbodyId, list) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = (list || []).map((item, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td>${item.player}</td>
            <td>${item.team}</td>
            <td><strong>${item.count}</strong></td>
        </tr>
    `).join('');
}
// --- SETTINGS MODAL FUNCTIONS ---
function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'flex';
        updateBudgetDisplay(); // به‌روزرسانی لیست بودجه‌ها هنگام باز شدن مودال
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}
