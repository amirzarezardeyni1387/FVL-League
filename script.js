/* ==========================================================================
   FVL VIRTUAL LEAGUE - COMPLETE SCRIPT
   ========================================================================== */


const SUPABASE_URL = 'https://lmaswbdjbgruzrgphocx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mUOxsInUn6bUUQWj3myuGA_AO5TB_Cq';

// ساخت کلاینت ارتباطی
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
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
// خواندن بودجه‌ها از دیتابیس ابری Supabase
async function getTeamBudgets() {
    const { data, error } = await _supabase
        .from('team_budgets')
        .select('*');

    if (error) {
        console.error('خطا در خواندن بودجه‌ها:', error);
        return {};
    }

    const budgetsObj = {};
    if (data) {
        data.forEach(item => {
            budgetsObj[item.id] = item.budget;
        });
    }
    return budgetsObj;
}

// ذخیره یا بروزرسانی بودجه تیم توسط ادمین در دیتابیس
async function saveTeamBudget(teamId) {
    const inputEl = document.getElementById(`budget_input_${teamId}`);
    if (!inputEl) return;

    const newBudget = parseFloat(inputEl.value);
    if (isNaN(newBudget) || newBudget < 0) {
        alert('لطفاً یک مبلغ معتبر وارد کنید.');
        return;
    }

    // آپدیت در جدول Supabase
    const { error } = await _supabase
        .from('team_budgets')
        .update({ budget: newBudget })
        .eq('id', teamId);

    if (error) {
        console.error('خطا در بروزرسانی بودجه:', error);
        alert('خطا در ارتباط با سرور برای ثبت بودجه');
        return;
    }

    alert('بودجه تیم با موفقیت در فضای ابری بروزرسانی شد.');
    updateBudgetDisplay();
}

// نمایش بودجه در بالای صفحه و بخش تنظیمات ادمین به صورت آنلاین
async function updateBudgetDisplay() {
    const budgets = await getTeamBudgets();

    // ۱. بروزرسانی مقدار نشان داده شده در بالای صفحه (برای تیم لاگین شده)
    const currentTeamBudget = budgets[currentUser] || 0;
    const topBudgetEl = document.getElementById('userBudgetDisplay');
    if (topBudgetEl) {
        topBudgetEl.textContent = currentTeamBudget.toLocaleString('fa-IR');
    }

    // ۲. رندر کردن فرم ویرایش بودجه‌ها برای ادمین
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

async function setupUserEnvironment() {
    const isAdmin = (currentUser === 'admin');
    
    // تنظیم تم و عناوین بر اساس کاربر
    document.body.setAttribute('data-theme', isAdmin ? 'admin' : currentUser);
    
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

    // 🌟 دریافت و بارگذاری تمام اطلاعات بخش لیگ از فضای ابری (که خودش تمام جدول‌ها، بازی‌ها، جام حذفی و... را رندر می‌کند)
    await loadLeagueDataFromCloud();
    await checkConferenceStatus();

    // رندر سایر بخش‌های مستقل (اخبار، نقل و انتقالات و بودجه)
    renderNewsFeed();
    renderTransferRequests();
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

    // اگر تب بازی‌ها انتخاب شد، بازی‌ها را رندر کن
    if (subId === 'fixturesSubTab') {
        renderFixtures();
    }
}
// ==========================================================================
// MODULE: SQUAD & TACTICS MANAGEMENT (مدیریت ترکیب اختصاصی هر تیم)
// ==========================================================================

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
async function resetImageUpload(inputId, previewId, placeholderId, resetBtnId) {
    const selectedTeam = getActiveSquadTeam();
    const imageType = previewId.includes('squad') ? 'squad' : 'tactic';
    const urlField = imageType === 'squad' ? 'squad_url' : 'tactic_url';

    // فقط مقدار فیلد مربوطه را در جدول دیتابیس برابر با null قرار بده
    const { error: dbError } = await _supabase
        .from('team_squads')
        .update({ [urlField]: null })
        .eq('team_id', selectedTeam);

    if (dbError) {
        console.error('خطا در پاکسازی دیتابیس:', dbError);
        alert('خطا در پاکسازی اطلاعات از دیتابیس');
        return;
    }

    // بازنشانی ظاهر صفحه
    resetImageUI(inputId, previewId, placeholderId, resetBtnId);
    alert('تصویر مورد نظر با موفقیت حذف شد.');
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
async function loadTeamSquadAndTactics() {
    setupAdminSquadSelector();

    const activeTeam = getActiveSquadTeam();

    // خواندن لینک عکس‌ها از جدول دیتابیس Supabase
    const { data, error } = await _supabase
        .from('team_squads')
        .select('*')
        .eq('team_id', activeTeam)
        .maybeSingle();

    let savedSquad = '';
    let savedTactic = '';

    if (data) {
        savedSquad = data.squad_url || '';
        savedTactic = data.tactic_url || '';
    }

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

async function handleImageUpload(event, previewId, placeholderId, resetBtnId) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert('حجم عکس انتخابی نباید بیشتر از ۵ مگابایت باشد.');
        return;
    }

    const selectedTeam = getActiveSquadTeam();
    const imageType = previewId.includes('squad') ? 'squad' : 'tactic';
    const fileName = `${selectedTeam}_${imageType}_${Date.now()}.png`;

    // آپلود فایل به Storage
    const { data, error } = await _supabase.storage
        .from('squads')
        .upload(fileName, file);

    if (error) {
        console.error('خطا در آپلود عکس:', error);
        alert('خطا در آپلود عکس به سرور ابری');
        return;
    }

    // دریافت لینک عمومی عکس
    const { data: publicUrlData } = _supabase.storage
        .from('squads')
        .getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;
    const urlField = imageType === 'squad' ? 'squad_url' : 'tactic_url';
    const pathField = imageType === 'squad' ? 'squad_path' : 'tactic_path';

    // ذخیره لینک و نام فایل (path) در جدول دیتابیس برای حذف آسان بعدی
    const { error: dbError } = await _supabase
        .from('team_squads')
        .upsert({ 
            team_id: selectedTeam, 
            [urlField]: imageUrl,
            [pathField]: fileName 
        }, { onConflict: 'team_id' });

    if (dbError) {
        console.error('خطا در دیتابیس:', dbError);
    }

    showImagePreview(imageUrl, previewId, placeholderId, resetBtnId);
    alert('عکس با موفقیت آپلود شد!');
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
// آرایه اصلی برای ذخیره درخواست‌ها
// دریافت لیست درخواست‌ها از LocalStorage
// دریافت لیست درخواست‌ها از LocalStorage
let transferRequests = JSON.parse(localStorage.getItem('fvl_transfer_requests')) || [];

// تابع بررسی ادمین بودن کاربر جاری
// تابع بررسی ادمین بودن کاربر جاری
function isUserAdmin() {
    // استفاده از متغیر سراسری currentUser یا کلید صحیح fvl_logged_user
    const user = currentUser || localStorage.getItem('fvl_logged_user') || '';
    return user.toLowerCase() === 'admin';
}
async function submitTransferRequest(type) {
    const user = currentUser || localStorage.getItem('fvl_logged_user') || 'کاربر';
    let playerName = '';
    let price = '';
    let typeLabel = '';

    if (type === 'buy') {
        playerName = document.getElementById('buyPlayerName').value.trim();
        typeLabel = 'خرید عمومی';
        if (!playerName) { alert('لطفاً نام بازیکن را وارد کنید.'); return; }
    } else if (type === 'sell') {
        playerName = document.getElementById('sellPlayerName').value.trim();
        typeLabel = 'فروش';
        if (!playerName) { alert('لطفاً نام بازیکن را وارد کنید.'); return; }
    } else if (type === 'direct') {
        playerName = document.getElementById('directPlayerName').value.trim();
        price = document.getElementById('directPrice').value.trim();
        typeLabel = 'پیشنهاد مستقیم';
        if (!playerName || !price) { alert('لطفاً نام بازیکن و قیمت پیشنهادی را وارد کنید.'); return; }
    }

    const newRequest = {
        id: Date.now(),
        team: user,
        type: type,
        typelabel: typeLabel,     // دقت کنید که حروف کوچک و بزرگ مطابق ستون دیتابیس باشد
        playername: playerName,  // مطابق ستون دیتابیس (بدون فاصله یا کپیتال اضافه)
        price: price ? price + ' سکه' : '',
        status: 'pending',
        date: new Date().toLocaleDateString('fa-IR')
    };

    // ارسال به دیتابیس ابری Supabase
    const { error } = await _supabase
        .from('transfer_requests')
        .insert([newRequest]);

    if (error) {
        console.error('خطا در ثبت درخواست:', error);
        alert('خطا در ارتباط با سرور ثبت درخواست');
        return;
    }

    // پاک‌سازی ورودی‌ها
    if (type === 'buy') document.getElementById('buyPlayerName').value = '';
    if (type === 'sell') document.getElementById('sellPlayerName').value = '';
    if (type === 'direct') {
        document.getElementById('directPlayerName').value = '';
        document.getElementById('directPrice').value = '';
    }

    fetchAndRenderTransferRequests();
}

async function fetchAndRenderTransferRequests() {
    const { data, error } = await _supabase
        .from('transfer_requests')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error('خطا در خواندن درخواست‌ها:', error);
        return;
    }

    transferRequests = data || [];
    renderTransferRequestsUI();
}
function renderTransferRequestsUI() {
    const container = document.getElementById('requestsList');
    if (!container) return;

    container.innerHTML = '';
    const isAdmin = isUserAdmin();

    if (transferRequests.length === 0) {
        container.innerHTML = '<p class="empty-inbox-msg">هیچ درخواستی ثبت نشده است.</p>';
        return;
    }

    transferRequests.forEach(req => {
        const item = document.createElement('div');
        item.className = `request-item type-${req.type}`;

        let messageText = '';
        if (req.type === 'buy') {
            messageText = `تیم <strong>${req.team}</strong> درخواست خرید عمومی برای <strong>${req.playername}</strong> ثبت کرده است.`;
        } else if (req.type === 'sell') {
            messageText = `تیم <strong>${req.team}</strong> درخواست فروش برای <strong>${req.playername}</strong> ثبت کرده است.`;
        } else if (req.type === 'direct') {
            messageText = `تیم <strong>${req.team}</strong> درخواست خرید برای <strong>${req.playername}</strong> (${req.price}) ثبت کرده است.`;
        }

        let actionsHtml = '';

        if (isAdmin) {
            if (req.status === 'pending') {
                actionsHtml = `
                    <div class="req-actions">
                        <button class="btn-status-approve" onclick="changeRequestStatus(${req.id}, 'approved')">تایید</button>
                        <button class="btn-status-reject" onclick="changeRequestStatus(${req.id}, 'rejected')">رد</button>
                        <button class="btn-status-delete" onclick="deleteTransferRequest(${req.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
            } else {
                const badgeClass = req.status === 'approved' ? 'approved' : 'rejected';
                const statusText = req.status === 'approved' ? 'تایید شده' : 'رد شده';
                actionsHtml = `
                    <div class="req-actions">
                        <span class="status-badge ${badgeClass}">${statusText}</span>
                        <button class="btn-status-delete" onclick="deleteTransferRequest(${req.id})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
            }
        } else {
            let statusText = 'در حال بررسی';
            let badgeClass = 'pending';
            if (req.status === 'approved') { statusText = 'تایید شده'; badgeClass = 'approved'; }
            else if (req.status === 'rejected') { statusText = 'رد شده'; badgeClass = 'rejected'; }

            actionsHtml = `<span class="status-badge ${badgeClass}">${statusText}</span>`;
        }

        item.innerHTML = `
            <div class="req-info">
                <span class="req-badge badge-${req.type}">${req.typelabel}</span>
                <div style="margin-right: 10px;">
                    <div class="req-text">${messageText}</div>
                    <div class="req-meta">${req.date}</div>
                </div>
            </div>
            ${actionsHtml}
        `;

        container.appendChild(item);
    });
}

// تابع واسط برای دکمه به‌روزرسانی صفحه
function renderTransferRequests() {
    fetchAndRenderTransferRequests();
}

// تغییر وضعیت توسط ادمین (تایید یا رد)
async function changeRequestStatus(id, newStatus) {
    const { error } = await _supabase
        .from('transfer_requests')
        .update({ status: newStatus })
        .eq('id', id);

    if (!error) {
        fetchAndRenderTransferRequests();
    }
}

async function deleteTransferRequest(id) {
    if (confirm('آیا از حذف این درخواست مطمئن هستید؟')) {
        const { error } = await _supabase
            .from('transfer_requests')
            .delete()
            .eq('id', id);

        if (!error) {
            fetchAndRenderTransferRequests();
        }
    }
}

// اجرای خودکار هنگام لود صفحه
document.addEventListener('DOMContentLoaded', () => {
    renderTransferRequests();
});
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
async function saveNews() {
    const title = document.getElementById('newsTitleInput').value.trim();
    const cat = document.getElementById('newsCategorySelect').value;
    const content = document.getElementById('newsContentInput').value.trim();
    const editId = document.getElementById('editNewsId').value;

    if (!title || !content) return alert('لطفاً عنوان و متن خبر را تکمیل کنید.');

    if (editId) {
        // ویرایش خبر موجود در دیتابیس
        const { error } = await _supabase
            .from('news')
            .update({ title: title, category: cat, content: content })
            .eq('id', editId);

        if (error) {
            console.error('خطا در ویرایش خبر:', error);
            alert('خطا در بروزرسانی خبر');
            return;
        }
    } else {
        // ثبت خبر جدید در دیتابیس
        const newNews = {
            id: Date.now(),
            title: title,
            category: cat,
            content: content,
            date: new Date().toLocaleDateString('fa-IR')
        };

        const { error } = await _supabase
            .from('news')
            .insert([newNews]);

        if (error) {
            console.error('خطا در ثبت خبر:', error);
            alert('خطا در ثبت خبر در سرور');
            return;
        }
    }

    cancelNewsEdit();
    renderNewsFeed();
}

function filterNews(cat, btn) {
    document.querySelectorAll('.news-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderNewsFeed(cat);
}
async function renderNewsFeed(categoryFilter = 'all') {
    const feed = document.getElementById('newsFeed');
    if (!feed) return;

    const { data, error } = await _supabase
        .from('news')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error('خطا در خواندن اخبار:', error);
        return;
    }

    newsData = data || [];

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

async function deleteNews(id) {
    if (confirm('آیا از حذف این خبر اطمینان دارید؟')) {
        const { error } = await _supabase
            .from('news')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('خطا در حذف خبر:', error);
            alert('خطا در حذف خبر از سرور');
            return;
        }

        renderNewsFeed();
    }
}

// ==========================================================================
// MODULE: LEAGUE STANDINGS & HISTORY (جدول و تاریخچه)
// ==========================================================================

// بارگذاری همگانی داده‌های لیگ از جدول ابری
async function loadLeagueDataFromCloud() {
    const { data, error } = await _supabase
        .from('league_data')
        .select('*');

    if (error) {
        console.error('خطا در دریافت اطلاعات لیگ:', error);
        return;
    }

    if (data) {
        data.forEach(item => {
            if (item.key === 'standings') standingsData = item.value;
            if (item.key === 'fixtures') fixturesData = item.value;
            if (item.key === 'history') historyData = item.value;
            if (item.key === 'honors') honorsData = item.value;
            if (item.key === 'cup') cupData = item.value;
            if (item.key === 'rules') rulesData = item.value;
            if (item.key === 'stats') statsData = item.value;
        });
    }

    // رندر کردن تمام بخش‌ها پس از دریافت اطلاعات
    renderStandings();
    renderFixtures();
    renderHistory();
    renderHonors();
    renderCup();
    renderRules();
    renderStats();
}

// تابع عمومی برای ذخیره هر بخش در جدول ابری
async function saveLeagueDataToCloud(key, value) {
    const { error } = await _supabase
        .from('league_data')
        .upsert({ key: key, value: value }, { onConflict: 'key' });

    if (error) {
        console.error(`خطا در ذخیره ${key}:`, error);
        alert('خطا در ارتباط با سرور ابری');
        return false;
    }
    return true;
}

function getInitialStandings() {
    return TEAMS_LIST.map(t => ({
        id: t.id,
        name: t.name,
        played: 0, won: 0, drawn: 0, lost: 0,
        gf: 0, ga: 0, gd: 0, points: 0
    }));
}

async function renderStandings() {
    const tbody = document.getElementById('standingsTbody');
    if (!tbody) return;

    const { data, error } = await _supabase
        .from('standings')
        .select('*');

    if (error) {
        console.error('خطا در خواندن رده‌بندی:', error);
        return;
    }

    standingsData = data || [];

    // مرتب‌سازی بر اساس امتیاز، تفاضل گل و گل زده
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

async function saveStandings() {
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

    await saveLeagueDataToCloud('standings', standingsData);
    renderStandings();
    toggleEditStandings();
    alert('جدول رده‌بندی در فضای ابری بروزرسانی شد.');
}

function renderHistory() {
    const feed = document.getElementById('historyFeed');
    if (!feed) return;
    feed.innerHTML = historyData.map(h => `<div style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #e2e8f0;">• ${h}</div>`).join('');
}

async function saveHistory() {
    const inp = document.getElementById('historyInput');
    if (!inp || !inp.value.trim()) return;
    
    historyData.unshift(inp.value.trim());
    
    // ذخیره در فضای ابری
    await saveLeagueDataToCloud('history', historyData);
    
    inp.value = '';
    renderHistory();
    alert('تاریخچه با موفقیت در فضای ابری ثبت شد.');
}

function renderRules() {
    const feed = document.getElementById('rulesFeed');
    if (!feed) return;
    feed.innerHTML = rulesData.map((r, i) => `<div style="padding: 8px 0; color: #e2e8f0;"><strong>${i + 1}.</strong> ${r}</div>`).join('');
}

async function saveRule() {
    const inp = document.getElementById('rulesInput');
    if (!inp || !inp.value.trim()) return;
    
    rulesData.push(inp.value.trim());
    
    // ذخیره در فضای ابری
    await saveLeagueDataToCloud('rules', rulesData);
    
    inp.value = '';
    renderRules();
    alert('قانون جدید با موفقیت ثبت شد.');
}

// دریافت یا ایجاد داده‌های بازی‌ها
let fixturesData = JSON.parse(localStorage.getItem('fvl_fixtures')) || [
    { weekNumber: 1, matches: [] },
    { weekNumber: 2, matches: [] },
    { weekNumber: 3, matches: [] },
    { weekNumber: 4, matches: [] },
    { weekNumber: 5, matches: [] },
    { weekNumber: 6, matches: [] }
];

// تابع پر کردن منوی کشویی تیم‌ها بر اساس TEAMS_LIST
// تابع پر کردن منوی کشویی تیم‌ها بر اساس TEAMS_LIST
function setupMatchTeamSelects() {
    const homeSelect = document.getElementById('homeTeamSelect');
    const awaySelect = document.getElementById('awayTeamSelect');

    if (!homeSelect || !awaySelect) return;

    // گزینه‌های منو
    const optionsHtml = '<option value="">انتخاب تیم...</option>' + 
        TEAMS_LIST.map(t => `<option value="${t.name}">${t.name}</option>`).join('');

    homeSelect.innerHTML = optionsHtml;
    awaySelect.innerHTML = optionsHtml;
}

// تابع نمایش/مخفی‌سازی فرم ادمین و پر کردن منوی کشویی
function toggleAdminMatchForm() {
    const form = document.getElementById('adminMatchFormCard');
    if (form) {
        const isHidden = form.style.display === 'none' || form.style.display === '';
        form.style.display = isHidden ? 'block' : 'none';
        
        if (isHidden) {
            setupMatchTeamSelects(); // پر کردن منوهای کشویی هنگام باز شدن فرم
        }
    }
}
// تابع افزودن بازی جدید با ذخیره در فضای ابری
async function addNewMatch() {
    const weekNum = parseInt(document.getElementById('matchWeekSelect').value);
    const homeTeam = document.getElementById('homeTeamSelect').value;
    const awayTeam = document.getElementById('awayTeamSelect').value;

    if (!homeTeam || !awayTeam) {
        alert('لطفاً هم تیم میزبان و هم تیم میهمان را انتخاب کنید.');
        return;
    }

    if (homeTeam === awayTeam) {
        alert('تیم میزبان و میهمان نمی‌توانند یکسان باشند!');
        return;
    }

    const weekObj = fixturesData.find(w => w.weekNumber === weekNum);
    if (weekObj) {
        const newMatch = {
            id: 'm_' + Date.now(),
            home: homeTeam,
            away: awayTeam,
            homeScore: '',
            awayScore: ''
        };
        weekObj.matches.push(newMatch);
        
        // ذخیره در دیتابیس ابری Supabase
        const success = await saveLeagueDataToCloud('fixtures', fixturesData);
        if (!success) return;

        // بازنشانی مقادیر منوها
        document.getElementById('homeTeamSelect').value = '';
        document.getElementById('awayTeamSelect').value = '';
        
        renderFixtures();
        alert(`بازی (${homeTeam} - ${awayTeam}) با موفقیت به هفته ${weekNum} اضافه شد.`);
    }
}

// تابع حذف بازی توسط ادمین و بروزرسانی در فضای ابری
async function deleteMatch(matchId) {
    if (!confirm('آیا از حذف این بازی اطمینان دارید؟')) return;

    fixturesData.forEach(week => {
        week.matches = week.matches.filter(m => m.id !== matchId);
    });

    // ذخیره تغییرات در دیتابیس ابری Supabase
    const success = await saveLeagueDataToCloud('fixtures', fixturesData);
    if (!success) return;

    renderFixtures();
    alert('بازی مورد نظر با موفقیت حذف شد.');
}
// تابع رندر بازی‌ها و فرم ادمین
function renderFixtures() {
    const container = document.getElementById('fixturesContainer');
    const adminBtn = document.getElementById('adminAddMatchBtn');
    
    // بررسی ادمین بودن کاربر
    const isAdmin = currentUser === 'admin'; // یا طبق لاجیک پروژه‌تان

    if (adminBtn) {
        adminBtn.style.display = isAdmin ? 'block' : 'none';
    }

    if (!container) return;

    let html = '';

    fixturesData.forEach(week => {
        html += `
            <div class="week-card" style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1);">
                <h3 style="color: #4facfe; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">
                    <i class="fa-solid fa-calendar-week"></i> هفته ${week.weekNumber}
                </h3>
                <div class="matches-list" style="display: flex; flex-direction: column; gap: 10px;">
        `;

        if (week.matches.length === 0) {
            html += `<div style="color: #888; text-align: center; font-size: 0.9rem; padding: 10px;">هنوز بازی برای این هفته تعریف نشده است.</div>`;
        } else {
            week.matches.forEach(m => {
                html += `
                    <div class="match-item" style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 10px 15px; border-radius: 8px;">
                        <div style="flex: 1; text-align: left; font-weight: bold; color: #fff;">
                            ${m.home} <span style="font-size: 0.75rem; color: #8a99ad;">(میزبان)</span>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 8px; margin: 0 15px;">
                            ${isAdmin ? `
                                <input type="number" id="hs_${m.id}" value="${m.homeScore}" style="width: 40px; text-align: center; border-radius: 4px; border: 1px solid #444; background: #222; color: #fff;">
                                <span>-</span>
                                <input type="number" id="as_${m.id}" value="${m.awayScore}" style="width: 40px; text-align: center; border-radius: 4px; border: 1px solid #444; background: #222; color: #fff;">
                                <button onclick="saveMatchResult('${m.id}')" style="background: #22c55e; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">ثبت نتیجه</button>
                                <button onclick="deleteMatch('${m.id}')" style="background: #ef4444; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">حذف</button>
                            ` : `
                                <span style="background: #111; padding: 4px 10px; border-radius: 6px; font-weight: bold; color: #ffd700;">
                                    ${m.homeScore !== '' ? m.homeScore : '-'} : ${m.awayScore !== '' ? m.awayScore : '-'}
                                </span>
                            `}
                        </div>

                        <div style="flex: 1; text-align: right; font-weight: bold; color: #fff;">
                            <span style="font-size: 0.75rem; color: #8a99ad;">(میهمان)</span> ${m.away}
                        </div>
                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// تابع ذخیره نتیجه مسابقه
// تابع ذخیره نتیجه مسابقه
async function saveMatchResult(matchId) {
    const hs = document.getElementById(`hs_${matchId}`).value;
    const as = document.getElementById(`as_${matchId}`).value;

    fixturesData.forEach(week => {
        const match = week.matches.find(m => m.id === matchId);
        if (match) {
            match.homeScore = hs;
            match.awayScore = as;
        }
    });

    await saveLeagueDataToCloud('fixtures', fixturesData);
    alert('نتیجه بازی با موفقیت به روزرسانی شد.');
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

async function saveHonor() {
    const title = document.getElementById('honorTitleInput').value.trim();
    const desc = document.getElementById('honorDescInput').value.trim();
    const fileInp = document.getElementById('honorImageInput');

    if (!title) return alert('عنوان افتخار را وارد کنید.');

    const addHonor = async (imgData = '') => {
        honorsData.push({ title, desc, img: imgData });
        
        // ذخیره در فضای ابری
        await saveLeagueDataToCloud('honors', honorsData);
        
        renderHonors();
        document.getElementById('honorTitleInput').value = '';
        document.getElementById('honorDescInput').value = '';
        if (fileInp) fileInp.value = '';
        alert('افتخار جدید ثبت شد.');
    };

    if (fileInp && fileInp.files[0]) {
        const reader = new FileReader();
        reader.onload = async e => await addHonor(e.target.result);
        reader.readAsDataURL(fileInp.files[0]);
    } else {
        await addHonor();
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

async function saveCupData() {
    cupData = {
        s1_1: document.getElementById('cupSemi1_1').value,
        s1_2: document.getElementById('cupSemi1_2').value,
        s2_1: document.getElementById('cupSemi2_1').value,
        s2_2: document.getElementById('cupSemi2_2').value,
        f_1: document.getElementById('cupFinal_1').value,
        f_2: document.getElementById('cupFinal_2').value,
        winner: document.getElementById('cupWinner').value
    };
    
    // ذخیره در فضای ابری
    await saveLeagueDataToCloud('cup', cupData);
    
    renderCup();
    alert('جام حذفی در فضای ابری بروزرسانی شد.');
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

async function addTopStat() {
    const type = document.getElementById('statTypeSelect').value;
    const player = document.getElementById('statPlayerInput').value.trim();
    const team = document.getElementById('statTeamSelect').value;
    const count = parseInt(document.getElementById('statCountInput').value) || 0;

    if (!player || count <= 0) return alert('اطلاعات را درست وارد کنید.');

    statsData[type].push({ player, team, count });
    statsData[type].sort((a, b) => b.count - a.count);
    
    // ذخیره در فضای ابری
    await saveLeagueDataToCloud('stats', statsData);
    
    renderStats();
    document.getElementById('statPlayerInput').value = '';
    document.getElementById('statCountInput').value = '';
    alert('آمار جدید با موفقیت ثبت شد.');
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

document.addEventListener('DOMContentLoaded', () => {
    loadAllDataFromStorage();
    checkSession();
    fetchAndRenderTransferRequests(); // فراخوانی آنلاین درخواست‌ها
});
// ۱. بررسی وضعیت کنفرانس هنگام بارگذاری صفحه
async function checkConferenceStatus() {
    const { data, error } = await _supabase
        .from('league_data')
        .select('value')
        .eq('key', 'conference_active')
        .maybeSingle();

    const isActive = data ? data.value : false;
    const confCard = document.getElementById('conferenceCard');
    const toggleBtn = document.getElementById('toggleConfBtn');

    if (confCard) {
        confCard.style.display = isActive ? 'block' : 'none';
    }

    if (toggleBtn) {
        if (isActive) {
            toggleBtn.textContent = '🔒 بستن و غیرفعال کردن سالن کنفرانس';
            toggleBtn.style.background = '#ef4444'; // قرمز
        } else {
            toggleBtn.textContent = '🔓 فعال‌سازی سالن کنفرانس برای همه';
            toggleBtn.style.background = '#22c55e'; // سبز
        }
    }
}

// ۲. تغییر وضعیت کنفرانس توسط ادمین
async function toggleConferenceStatus() {
    if (currentUser !== 'admin') return;

    // خواندن وضعیت فعلی
    const { data } = await _supabase
        .from('league_data')
        .select('value')
        .eq('key', 'conference_active')
        .maybeSingle();

    const currentState = data ? data.value : false;
    const newState = !currentState;

    // آپدیت در دیتابیس
    const { error } = await _supabase
        .from('league_data')
        .update({ value: newState })
        .eq('key', 'conference_active');

    if (error) {
        alert('خطا در تغییر وضعیت کنفرانس');
        return;
    }

    checkConferenceStatus();
    alert(newState ? 'سالن کنفرانس برای همه مربیان فعال شد.' : 'سالن کنفرانس بسته شد.');
}