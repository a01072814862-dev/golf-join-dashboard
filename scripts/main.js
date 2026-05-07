// API 기본 URL
const API_BASE_URL = 'https://3000-i8851c8pzj4040t73pg87-40c28c45.sg1.manus.computer/api/hotdeal';

// 로컬 스토리지 키
const STORAGE_KEYS = {
    AUTH_TOKEN: 'golf_join_auth_token',
    HOST_DATA: 'golf_join_host_data',
};

// 전역 상태
let currentHost = null;
let hotDeals = [];
let requests = [];
let authToken = null;

// 페이지 초기화
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // 로컬 스토리지에서 토큰 로드
    authToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    
    if (!authToken) {
        // 로그인 페이지로 리다이렉트
        window.location.href = '/pages/login.html';
        return;
    }
    
    // 호스트 정보 로드
    loadHostData();
    
    // 대시보드 표시
    showPage('dashboard');
    
    // 데이터 로드
    loadHotDeals();
    loadRequests();
}

function setupEventListeners() {
    // 네비게이션
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            console.log('Navigating to:', page);
            showPage(page);
        });
    });
    
    // 로그아웃
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // 핫딜 추가 버튼
    const addHotdealBtn = document.getElementById('addHotdealBtn');
    if (addHotdealBtn) {
        addHotdealBtn.addEventListener('click', openHotdealModal);
    }
    
    const cancelHotdealBtn = document.getElementById('cancelHotdealBtn');
    if (cancelHotdealBtn) {
        cancelHotdealBtn.addEventListener('click', closeHotdealModal);
    }
    
    const modalClose = document.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', closeHotdealModal);
    }
    
    // 핫딜 폼 제출
    const hotdealForm = document.getElementById('hotdealForm');
    if (hotdealForm) {
        hotdealForm.addEventListener('submit', submitHotdeal);
    }
    
    // 상태 필터
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterRequests);
    }
    
    // 설정 폼
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', saveSettings);
    }
    
    // 모달 외부 클릭 시 닫기
    const hotdealModal = document.getElementById('hotdealModal');
    if (hotdealModal) {
        hotdealModal.addEventListener('click', (e) => {
            if (e.target.id === 'hotdealModal') {
                closeHotdealModal();
            }
        });
    }
}

// 페이지 전환
function showPage(pageName) {
    console.log('showPage called with:', pageName);
    
    // 모든 페이지 숨기기
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 네비게이션 업데이트
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });
    
    // 선택한 페이지 표시
    const pageElement = document.getElementById(`${pageName}-page`);
    console.log('Looking for page element:', `${pageName}-page`, pageElement);
    if (pageElement) {
        pageElement.classList.add('active');
    }
    
    // 페이지 제목 업데이트
    const titles = {
        dashboard: '대시보드',
        hotdeals: '핫딜 관리',
        requests: '구매요청 관리',
        rounds: '라운드 관리',
        settings: '설정',
    };
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = titles[pageName] || '';
    }
    
    // 페이지별 데이터 로드
    if (pageName === 'hotdeals') {
        displayHotdeals();
    } else if (pageName === 'requests') {
        displayRequests();
    } else if (pageName === 'dashboard') {
        updateDashboard();
    } else if (pageName === 'settings') {
        loadSettingsForm();
    }
}

// 대시보드 업데이트
function updateDashboard() {
    const totalHotdeals = hotDeals.length;
    const totalRequests = requests.length;
    const confirmedRequests = requests.filter(r => r.status === 'confirmed').length;
    const totalRevenue = hotDeals.reduce((sum, d) => sum + (d.discountedPrice || 0), 0);
    
    const activeHotdeals = document.getElementById('activeHotdeals');
    if (activeHotdeals) activeHotdeals.textContent = totalHotdeals;
    
    const pendingRequests = document.getElementById('pendingRequests');
    if (pendingRequests) pendingRequests.textContent = totalRequests - confirmedRequests;
    
    const completedDeals = document.getElementById('completedDeals');
    if (completedDeals) completedDeals.textContent = confirmedRequests;
    
    const totalDiscount = document.getElementById('totalDiscount');
    if (totalDiscount) totalDiscount.textContent = `${totalRevenue.toLocaleString()}원`;
    
    displayRecentRequests();
}

// 호스트 정보 표시
function displayHostInfo() {
    if (currentHost) {
        const hostName = document.getElementById('hostName');
        if (hostName) hostName.textContent = currentHost.name || '호스트';
        
        const hostEmail = document.getElementById('hostEmail');
        if (hostEmail) hostEmail.textContent = currentHost.email || '';
    }
}

// 핫딜 목록 표시
function displayHotdeals() {
    const container = document.getElementById('hotdealsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (hotDeals.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">등록된 핫딜이 없습니다.</p>';
        return;
    }
    
    hotDeals.forEach(deal => {
        const discountRate = Math.round(((deal.originalPrice - deal.discountedPrice) / deal.originalPrice) * 100);
        const html = `
            <div class="hotdeal-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h3 style="margin: 0;">${deal.courseName}</h3>
                    <span style="background: #ff6b6b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${discountRate}% 할인</span>
                </div>
                <div style="margin-bottom: 12px; font-size: 14px; color: #666;">
                    <p><strong>위치:</strong> ${deal.courseLocation || '미지정'}</p>
                    <p><strong>날짜:</strong> ${deal.date}</p>
                    <p><strong>시간:</strong> ${deal.time}</p>
                    <p><strong>가격:</strong> <span style="text-decoration: line-through;">${deal.originalPrice.toLocaleString()}원</span> → <span style="color: #ff6b6b; font-weight: bold;">${deal.discountedPrice.toLocaleString()}원</span></p>
                    <p><strong>인원:</strong> ${deal.minPlayers}~${deal.maxPlayers}명</p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="editHotdeal(${deal.id})" style="flex: 1; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">수정</button>
                    <button onclick="deleteHotdeal(${deal.id})" style="flex: 1; padding: 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">삭제</button>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// 구매요청 목록 표시
function displayRequests() {
    const container = document.getElementById('requestsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    const filteredRequests = filterRequestsByStatus();
    
    if (filteredRequests.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">구매요청이 없습니다.</p>';
        return;
    }
    
    filteredRequests.forEach(req => {
        const statusClass = `status-${req.status}`;
        const statusLabel = getStatusLabel(req.status);
        const statusColor = req.status === 'pending' ? '#FFA500' : req.status === 'confirmed' ? '#4CAF50' : '#f44336';
        
        const html = `
            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h3 style="margin: 0;">${req.courseName}</h3>
                    <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${statusLabel}</span>
                </div>
                <div style="margin-bottom: 12px; font-size: 14px; color: #666;">
                    <p><strong>요청자:</strong> ${req.requesterName}</p>
                    <p><strong>연락처:</strong> ${req.requesterPhone}</p>
                    <p><strong>인원:</strong> ${req.players}명</p>
                </div>
                ${req.status === 'pending' ? `
                <div style="display: flex; gap: 8px;">
                    <button onclick="confirmRequest(${req.id})" style="flex: 1; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">수락</button>
                    <button onclick="rejectRequest(${req.id})" style="flex: 1; padding: 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">거절</button>
                </div>
                ` : ''}
            </div>
        `;
        container.innerHTML += html;
    });
}

// 최근 구매요청 표시
function displayRecentRequests() {
    const container = document.getElementById('recentRequests');
    if (!container) return;
    
    container.innerHTML = '';
    
    const recentRequests = requests.slice(0, 5);
    
    if (recentRequests.length === 0) {
        container.innerHTML = '<p class="empty-state">구매요청이 없습니다</p>';
        return;
    }
    
    recentRequests.forEach(req => {
        const statusLabel = getStatusLabel(req.status);
        const statusColor = req.status === 'pending' ? '#FFA500' : req.status === 'confirmed' ? '#4CAF50' : '#f44336';
        
        const html = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee;">
                <div>
                    <p style="margin: 0; font-weight: bold;">${req.courseName}</p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">${req.requesterName} (${req.requesterPhone})</p>
                </div>
                <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${statusLabel}</span>
            </div>
        `;
        container.innerHTML += html;
    });
}

// 요청 필터링
function filterRequestsByStatus() {
    const filter = document.getElementById('statusFilter')?.value || '';
    if (filter === '' || filter === 'all') return requests;
    return requests.filter(r => r.status === filter);
}

// 상태 필터 변경
function filterRequests() {
    displayRequests();
}

// 상태 레이블
function getStatusLabel(status) {
    const labels = {
        pending: '대기 중',
        confirmed: '확정됨',
        cancelled: '취소됨'
    };
    return labels[status] || status;
}

// 핫딜 모달 열기
function openHotdealModal() {
    const modal = document.getElementById('hotdealModal');
    if (modal) {
        modal.classList.add('active');
    }
}

// 핫딜 모달 닫기
function closeHotdealModal() {
    const modal = document.getElementById('hotdealModal');
    if (modal) {
        modal.classList.remove('active');
    }
    const form = document.getElementById('hotdealForm');
    if (form) {
        form.reset();
    }
}

// 핫딜 제출
async function submitHotdeal(e) {
    e.preventDefault();
    
    const newHotdeal = {
        courseName: document.getElementById('courseName').value,
        courseLocation: document.getElementById('courseLocation').value,
        date: document.getElementById('hotdealDate').value,
        time: document.getElementById('hotdealTime').value,
        originalPrice: parseInt(document.getElementById('originalPrice').value),
        discountedPrice: parseInt(document.getElementById('discountedPrice').value),
        minPlayers: parseInt(document.getElementById('minPlayers').value),
        maxPlayers: parseInt(document.getElementById('maxPlayers').value),
        description: document.getElementById('hotdealDescription').value,
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/hotdeals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(newHotdeal),
        });
        
        if (response.ok) {
            alert('핫딜이 등록되었습니다!');
            closeHotdealModal();
            loadHotDeals();
        } else {
            alert('핫딜 등록에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('오류가 발생했습니다.');
    }
}

// 핫딜 수정
function editHotdeal(id) {
    alert('수정 기능은 준비 중입니다.');
}

// 핫딜 삭제
async function deleteHotdeal(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/hotdeals/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });
        
        if (response.ok) {
            alert('삭제되었습니다.');
            loadHotDeals();
        } else {
            alert('삭제에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('오류가 발생했습니다.');
    }
}

// 요청 수락
async function confirmRequest(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/requests/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ status: 'confirmed' }),
        });
        
        if (response.ok) {
            alert('요청을 수락했습니다.');
            loadRequests();
        } else {
            alert('수락에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('오류가 발생했습니다.');
    }
}

// 요청 거절
async function rejectRequest(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/requests/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ status: 'cancelled' }),
        });
        
        if (response.ok) {
            alert('요청을 거절했습니다.');
            loadRequests();
        } else {
            alert('거절에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('오류가 발생했습니다.');
    }
}

// 호스트 정보 로드
async function loadHostData() {
    try {
        const hostData = localStorage.getItem(STORAGE_KEYS.HOST_DATA);
        if (hostData) {
            currentHost = JSON.parse(hostData);
            displayHostInfo();
        }
    } catch (error) {
        console.error('Error loading host data:', error);
    }
}

// 핫딜 목록 로드
async function loadHotDeals() {
    try {
        const response = await fetch(`${API_BASE_URL}/hotdeals/all`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });
        
        if (response.ok) {
            hotDeals = await response.json();
            console.log('Loaded hotdeals:', hotDeals);
            displayHotdeals();
            updateDashboard();
        }
    } catch (error) {
        console.error('Error loading hotdeals:', error);
    }
}

// 구매요청 목록 로드
async function loadRequests() {
    try {
        const response = await fetch(`${API_BASE_URL}/requests`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });
        
        if (response.ok) {
            requests = await response.json();
            console.log('Loaded requests:', requests);
            displayRequests();
            updateDashboard();
        }
    } catch (error) {
        console.error('Error loading requests:', error);
    }
}

// 설정 폼 로드
function loadSettingsForm() {
    if (currentHost) {
        const hostNameInput = document.getElementById('hostNameInput');
        if (hostNameInput) hostNameInput.value = currentHost.name || '';
        
        const hostPhoneInput = document.getElementById('hostPhoneInput');
        if (hostPhoneInput) hostPhoneInput.value = currentHost.phone || '';
    }
}

// 설정 저장
async function saveSettings(e) {
    e.preventDefault();
    alert('설정 저장 기능은 준비 중입니다.');
}

// 로그아웃
function logout() {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.HOST_DATA);
    window.location.href = '/pages/login.html';
}
