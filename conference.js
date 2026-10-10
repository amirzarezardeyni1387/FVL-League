const SUPABASE_URL = 'https://lmaswbdjbgruzrgphocx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mUOxsInUn6bUUQWj3myuGA_AO5TB_Cq';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = localStorage.getItem('fvl_logged_user') || 'مهمان';

document.addEventListener('DOMContentLoaded', () => {
    const roleEl = document.getElementById('conferenceUserRole');
    if (roleEl) roleEl.textContent = `کاربر: ${currentUser}`;

    // فقط و فقط اگر کاربر ادمین باشد، دکمه پاکسازی نمایش داده می‌شود
    if (currentUser === 'admin') {
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) clearBtn.style.display = 'flex';
    }

    fetchMessages();
    setupRealtimeSubscription();
});

// ۱. خواندن پیام‌ها
async function fetchMessages(scrollToBottom = true) {
    const { data, error } = await _supabase
        .from('conference_messages')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('خطا در خواندن پیام‌ها:', error);
        return;
    }

    renderMessages(data || [], scrollToBottom);
}

// ۲. رندر کردن پیام‌ها
function renderMessages(messages, scrollToBottom = true) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    if (messages.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #8a99ad; margin-top: auto; margin-bottom: auto; font-size: 0.9rem;">هنوز پیامی در کنفرانس ثبت نشده است. بحث را آغاز کنید!</div>';
        return;
    }

    container.innerHTML = messages.map(msg => {
        const isAdmin = msg.sender === 'admin';
        const isMe = msg.sender === currentUser;
        
        return `
            <div style="display: flex; flex-direction: column; align-items: ${isMe ? 'flex-end' : 'flex-start'}; margin-bottom: 8px;">
                <span style="font-size: 0.75rem; color: #8a99ad; margin-bottom: 3px;">
                    ${isAdmin ? '👑 ادمین (برگزارکننده)' : `مربی تیم: ${msg.sender}`} - ${new Date(msg.created_at).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})}
                </span>
                <div style="background: ${isAdmin ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : (isMe ? 'rgba(0, 210, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)')}; 
                            border: 1px solid ${isAdmin ? '#a78bfa' : (isMe ? 'var(--accent-color)' : 'rgba(255,255,255,0.15)')}; 
                            padding: 10px 14px; border-radius: 14px; max-width: 75%; color: #fff; font-size: 0.9rem; word-break: break-word; white-space: pre-wrap;">
                    ${msg.message}
                </div>
            </div>
        `;
    }).join('');

    if (scrollToBottom) {
        container.scrollTop = container.scrollHeight;
    }
}

// ۳. ارسال پیام
async function sendConferenceMessage() {
    const input = document.getElementById('inputMessage');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;

    const { error } = await _supabase
        .from('conference_messages')
        .insert([{ sender: currentUser, message: text }]);

    if (error) {
        console.error('خطا در ارسال پیام:', error);
        alert('ارسال پیام با خطا مواجه شد.');
        return;
    }

    input.value = '';
}

function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendConferenceMessage();
    }
}

// ۴. پاکسازی کل کنفرانس (محافظت شده و فقط مختص ادمین)
async function clearAllMessages() {
    if (currentUser !== 'admin') {
        alert('شما دسترسی لازم برای این کار را ندارید.');
        return;
    }

    if (confirm('هشدار: آیا مطمئن هستید که می‌خواهید تمام پیام‌های کنفرانس را پاک کنید؟')) {
        const { error } = await _supabase
            .from('conference_messages')
            .delete()
            .gt('id', 0);

        if (error) {
            console.error('خطا در پاکسازی:', error);
            alert('خطا در پاکسازی اتاق کنفرانس');
        } else {
            fetchMessages();
            alert('اتاق کنفرانس با موفقیت پاکسازی شد.');
        }
    }
}

// ۵. دریافت آنی (Real-time) پیام‌ها
function setupRealtimeSubscription() {
    _supabase
        .channel('conference-room')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'conference_messages' },
            (payload) => {
                fetchMessages(true);
            }
        )
        .subscribe();
}