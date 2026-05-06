// 로컬 스토리지 키
const STORAGE_KEYS = {
    HOST_DATA: 'golf_join_host_data',
    HOT_DEALS: 'golf_join_hot_deals',
    REQUESTS: 'golf_join_requests',
};

// 전역 상태
let currentHost = null;
let hotDeals = [];
let requests = [];

// 페이지 초기화
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // 로컬 스토리지에서 데이터 로드
    loadHostData();
    loadHotDeals();
    loadRequests();

    // 호스트 정보 표시
    displayHostInfo();

    // 대시보드 표시
    showPage('dashboard');
}

function setupEventListeners() {
    // 네비게이션
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            showPage(page);
        });
    });

    // 로그아웃
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // 핫딜 추가 버튼
    document.getElementById('addHotdealBtn').addEventListener('click', openHotdealModal);
    document.getElementById('cancelHotdealBtn').addEventListener('click', closeHotdealModal);
    document.querySelector('.modal-close').addEventListener('click', closeHotdealModal);

    // 핫딜 폼 제출
    document.getElementById('hotdealForm').addEventListener('submit', submitHotdeal);

    // 상태 필터
    document.getElementById('statusFilter').addEventListener('change', filterRequests);

    // 설정 폼
    document.getElementById('settingsForm').addEventListener('submit', saveSettings);

    // 모달 외부 클릭 시 닫기
    document.getElementById('hotdealModal').addEventListener('click', (e) => {
        if (e.target.id === 'hotdealModal') {
            closeHotdealModal();
        }
    });
}

// 페이지 전환
function showPage(pageName) {
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
    document.getElementById('pageTitle').textContent = titles[pageName] || '';

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

// 호스트 정보 표시
function displayHostInfo() {
    if (currentHost) {
        document.getElementById('userName').textContent = currentHost.name || '호스트';
    }
}

// 대시보드 업데이트
function updateDashboard() {
    // 통계 계산
    const activeHotdeals = hotDeals.filter(d => new Date(d.date) > new Date()).length;
    const pendingReqs = requests.filter(r => r.status === 'pending').length;
    const completedDeals = requests.filter(r => r.status === 'confirmed').length;
    const totalDiscount = hotDeals.reduce((sum, d) => sum + (d.originalPrice - d.discountedPrice), 0);

    // 통계 표시
    document.getElementById('activeHotdeals').textContent = activeHotdeals;
    document.getElementById('pendingRequests').textContent = pendingReqs;
    document.getElementById('completedDeals').textContent = completedDeals;
    document.getElementById('totalDiscount').textContent = `${totalDiscount.toLocaleString()}원`;

    // 최근 요청 표시
    displayRecentRequests();
}

// 최근 요청 표시
function displayRecentRequests() {
    const container = document.getElementById('recentRequests');
    const recentReqs = requests.slice(0, 5);

    if (recentReqs.length === 0) {
        container.innerHTML = '<p class="empty-state">구매요청이 없습니다</p>';
        return;
    }

    container.innerHTML = recentReqs.map(req => `
        <div class="request-item">
            <div class="item-header">
                <div>
                    <div class="item-title">${req.courseName}</div>
                    <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">${req.requesterName}</div>
                </div>
                <span class="item-status status-${req.status}">${getStatusLabel(req.status)}</span>
            </div>
            <div class="item-details">
                <div class="detail-row">
                    <span class="detail-label">날짜:</span>
                    <span class="detail-value">${req.date}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">시간:</span>
                    <span class="detail-value">${req.time}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">인원:</span>
                    <span class="detail-value">${req.players}명</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">가격:</span>
                    <span class="detail-value">${req.price.toLocaleString()}원</span>
                </div>
            </div>
            <div class="item-actions">
                ${req.status === 'pending' ? `
                    <button class="btn btn-primary" onclick="confirmRequest('${req.id}')">수락</button>
                    <button class="btn btn-danger" onclick="rejectRequest('${req.id}')">거절</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// 핫딜 표시
function displayHotdeals() {
    const container = document.getElementById('hotdealsList');

    if (hotDeals.length === 0) {
        container.innerHTML = '<p class="empty-state">등록된 핫딜이 없습니다</p>';
        return;
    }

    container.innerHTML = hotDeals.map(deal => {
        const discount = ((deal.originalPrice - deal.discountedPrice) / deal.originalPrice * 100).toFixed(0);
        const isExpired = new Date(deal.date) < new Date();

        return `
            <div class="hotdeal-item">
                <div class="item-header">
                    <div>
                        <div class="item-title">${deal.courseName}</div>
                        <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">${deal.courseLocation}</div>
                    </div>
                    <span class="item-status ${isExpired ? 'status-cancelled' : 'status-confirmed'}">
                        ${isExpired ? '만료됨' : '활성'}
                    </span>
                </div>
                <div class="item-details">
                    <div class="detail-row">
                        <span class="detail-label">날짜:</span>
                        <span class="detail-value">${deal.date}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">시간:</span>
                        <span class="detail-value">${deal.time}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">원가:</span>
                        <span class="detail-value">${deal.originalPrice.toLocaleString()}원</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">할인가:</span>
                        <span class="detail-value">${deal.discountedPrice.toLocaleString()}원</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">할인율:</span>
                        <span class="detail-value" style="color: #EF4444;">${discount}%</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">인원:</span>
                        <span class="detail-value">${deal.minPlayers}~${deal.maxPlayers}명</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-secondary" onclick="editHotdeal('${deal.id}')">수정</button>
                    <button class="btn btn-danger" onclick="deleteHotdeal('${deal.id}')">삭제</button>
                </div>
            </div>
        `;
    }).join('');
}

// 요청 표시
function displayRequests() {
    const container = document.getElementById('requestsList');
    const statusFilter = document.getElementById('statusFilter').value;
    const filteredRequests = statusFilter 
        ? requests.filter(r => r.status === statusFilter)
        : requests;

    if (filteredRequests.length === 0) {
        container.innerHTML = '<p class="empty-state">구매요청이 없습니다</p>';
        return;
    }

    container.innerHTML = filteredRequests.map(req => `
        <div class="request-item">
            <div class="item-header">
                <div>
                    <div class="item-title">${req.courseName}</div>
                    <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">요청자: ${req.requesterName}</div>
                </div>
                <span class="item-status status-${req.status}">${getStatusLabel(req.status)}</span>
            </div>
            <div class="item-details">
                <div class="detail-row">
                    <span class="detail-label">날짜:</span>
                    <span class="detail-value">${req.date}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">시간:</span>
                    <span class="detail-value">${req.time}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">인원:</span>
                    <span class="detail-value">${req.players}명</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">가격:</span>
                    <span class="detail-value">${req.price.toLocaleString()}원</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">연락처:</span>
                    <span class="detail-value">${req.requesterPhone}</span>
                </div>
            </div>
            <div class="item-actions">
                ${req.status === 'pending' ? `
                    <button class="btn btn-primary" onclick="confirmRequest('${req.id}')">수락</button>
                    <button class="btn btn-danger" onclick="rejectRequest('${req.id}')">거절</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// 요청 필터링
function filterRequests() {
    displayRequests();
}

// 핫딜 모달 열기
function openHotdealModal() {
    document.getElementById('hotdealModal').classList.add('active');
}

// 핫딜 모달 닫기
function closeHotdealModal() {
    document.getElementById('hotdealModal').classList.remove('active');
    document.getElementById('hotdealForm').reset();
}

// 핫딜 제출
function submitHotdeal(e) {
    e.preventDefault();

    const newHotdeal = {
        id: Date.now().toString(),
        courseName: document.getElementById('courseName').value,
        courseLocation: document.getElementById('courseLocation').value,
        date: document.getElementById('hotdealDate').value,
        time: document.getElementById('hotdealTime').value,
        originalPrice: parseInt(document.getElementById('originalPrice').value),
        discountedPrice: parseInt(document.getElementById('discountedPrice').value),
        minPlayers: parseInt(document.getElementById('minPlayers').value),
        maxPlayers: parseInt(document.getElementById('maxPlayers').value),
        description: document.getElementById('hotdealDescription').value,
        createdAt: new Date().toISOString(),
    };

    hotDeals.push(newHotdeal);
    saveHotDeals();
    closeHotdealModal();
    displayHotdeals();
    updateDashboard();

    alert('핫딜이 등록되었습니다!');
}

// 핫딜 삭제
function deleteHotdeal(id) {
    if (confirm('이 핫딜을 삭제하시겠습니까?')) {
        hotDeals = hotDeals.filter(d => d.id !== id);
        saveHotDeals();
        displayHotdeals();
        updateDashboard();
    }
}

// 요청 수락
function confirmRequest(id) {
    const req = requests.find(r => r.id === id);
    if (req) {
        req.status = 'confirmed';
        saveRequests();
        displayRequests();
        updateDashboard();
        alert(`${req.requesterName}님의 요청을 수락했습니다. 연락처: ${req.requesterPhone}`);
    }
}

// 요청 거절
function rejectRequest(id) {
    if (confirm('이 요청을 거절하시겠습니까?')) {
        const req = requests.find(r => r.id === id);
        if (req) {
            req.status = 'cancelled';
            saveRequests();
            displayRequests();
            updateDashboard();
        }
    }
}

// 설정 폼 로드
function loadSettingsForm() {
    if (currentHost) {
        document.getElementById('hostName').value = currentHost.name || '';
        document.getElementById('hostEmail').value = currentHost.email || '';
        document.getElementById('hostPhone').value = currentHost.phone || '';
    }
}

// 설정 저장
function saveSettings(e) {
    e.preventDefault();

    currentHost = {
        ...currentHost,
        name: document.getElementById('hostName').value,
        email: document.getElementById('hostEmail').value,
        phone: document.getElementById('hostPhone').value,
    };

    saveHostData();
    displayHostInfo();
    alert('설정이 저장되었습니다!');
}

// 로그아웃
function logout() {
    if (confirm('로그아웃하시겠습니까?')) {
        localStorage.removeItem(STORAGE_KEYS.HOST_DATA);
        window.location.href = '/web/pages/login.html';
    }
}

// 상태 레이블
function getStatusLabel(status) {
    const labels = {
        pending: '대기 중',
        confirmed: '확정됨',
        cancelled: '취소됨',
    };
    return labels[status] || status;
}

// 로컬 스토리지 함수
function loadHostData() {
    const data = localStorage.getItem(STORAGE_KEYS.HOST_DATA);
    if (data) {
        currentHost = JSON.parse(data);
    } else {
        // 테스트용 기본 호스트 데이터
        currentHost = {
            id: 'host_1',
            name: '호스트 관리자',
            email: 'host@example.com',
            phone: '010-0000-0000',
        };
        saveHostData();
    }
}

function saveHostData() {
    localStorage.setItem(STORAGE_KEYS.HOST_DATA, JSON.stringify(currentHost));
}

function loadHotDeals() {
    const data = localStorage.getItem(STORAGE_KEYS.HOT_DEALS);
    if (data) {
        hotDeals = JSON.parse(data);
    } else {
        // 테스트용 샘플 데이터
        hotDeals = [
            {
                id: '1',
                courseName: 'Forest City Golf Resort',
                courseLocation: '조호바루',
                date: '2026-04-28',
                time: '15:10',
                originalPrice: 150000,
                discountedPrice: 100000,
                minPlayers: 2,
                maxPlayers: 4,
                description: '특별 할인 제공',
                createdAt: new Date().toISOString(),
            },
        ];
        saveHotDeals();
    }
}

function saveHotDeals() {
    localStorage.setItem(STORAGE_KEYS.HOT_DEALS, JSON.stringify(hotDeals));
}

function loadRequests() {
    const data = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    if (data) {
        requests = JSON.parse(data);
    } else {
        // 테스트용 샘플 데이터
        requests = [
            {
                id: '1',
                courseName: 'Forest City Golf Resort',
                date: '2026-04-28',
                time: '15:10',
                players: 3,
                price: 100000,
                requesterName: '김철수',
                requesterPhone: '010-1234-5678',
                status: 'pending',
                createdAt: new Date().toISOString(),
            },
        ];
        saveRequests();
    }
}

function saveRequests() {
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
}
