/**
 * 시니어 YouTube 트렌드 분석기 - 엑셀 다운로드 중심
 * Excel/CSV/JSON/PDF 다운로드 기능 구현
 */

class SeniorYoutubeTrendsExcel {
    constructor() {
        this.apiKey = this.getApiKey();
        this.baseUrl = 'https://www.googleapis.com/youtube/v3';
        this.currentData = [];
        this.charts = {};
        
        // 시니어 특화 키워드 데이터베이스
        this.seniorKeywords = {
            all: ['시니어', '노인', '중년', '50대', '60대', '70대', '실버', '어르신', '부모님'],
            health: [
                '시니어 운동', '실버 체조', '노인 건강', '중년 건강', '시니어 요가', '노년 운동',
                '관절 건강', '혈압 관리', '당뇨 관리', '치매 예방', '건강식품', '한방치료',
                '실버 피트니스', '노인 재활', '시니어 스트레칭', '무릎 건강', '척추 건강'
            ],
            hobby: [
                '시니어 취미', '노년 여가', '실버 문화', '시니어 댄스', '노인 악기',
                '시니어 그림', '서예', '원예', '실버 합창', '노년 학습', '평생교육',
                '시니어 독서', '실버 봉사', '노인 동호회'
            ],
            cooking: [
                '시니어 요리', '간편 요리', '건강 레시피', '노인 식단', '실버 쿠킹',
                '중년 요리', '한식 요리', '건강식', '당뇨식단', '고혈압 식단',
                '시니어 영양', '노인 반찬', '건강 간식'
            ],
            life: [
                '시니어 라이프', '노년 생활', '실버 정보', '시니어 팁', '노인 생활용품',
                '연금 정보', '실버타운', '노후 준비', '중년 라이프스타일', '은퇴 생활',
                '시니어 패션', '노인 돌봄'
            ],
            travel: [
                '시니어 여행', '실버 여행', '노년 여행', '시니어 투어', '중년 여행',
                '실버 패키지', '효도 여행', '국내 여행', '해외 여행', '시니어 캠핑',
                '노인 버스여행'
            ],
            tech: [
                '시니어 스마트폰', '노인 컴퓨터', '실버 디지털', '시니어 앱',
                '중년 IT', 'AI 활용', '스마트워치', '디지털 교육', '온라인 쇼핑',
                '시니어 SNS', '유튜브 사용법'
            ]
        };
        
        this.init();
    }
    
    // 초기화
    init() {
        console.log('🎯 시니어 YouTube 트렌드 분석기 (엑셀 다운로드) 시작');
        this.setupEventListeners();
        this.showInitialMessage();
    }
    
    // API 키 확인
    getApiKey() {
        return localStorage.getItem('youtube_api_key') || 'DEMO_MODE';
    }
    
    // 이벤트 리스너 설정
    setupEventListeners() {
      // 검색 버튼
      document.getElementById('searchBtn').addEventListener('click', () => this.performSearch());
    
      // 새로고침 버튼
      document.getElementById('refreshBtn').addEventListener('click', () => this.refreshData());
    
      // 다운로드 버튼들
      document.getElementById('downloadExcel').addEventListener('click', () => this.downloadExcel());
      document.getElementById('downloadCSV').addEventListener('click', () => this.downloadCSV());
      document.getElementById('downloadJSON').addEventListener('click', () => this.downloadJSON());
      document.getElementById('downloadPDF').addEventListener('click', () => this.downloadPDF());
    
      // 보기 모드 변경
      document.getElementById('viewMode').addEventListener('change', (e) => this.changeViewMode(e.target.value));
    
      // 엔터 키 검색
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.performSearch();
        }
      });
    
      // ★ API 키 불러오기/초기화 버튼
      const loadBtn = document.getElementById('loadApiKeyBtn');
      const clearBtn = document.getElementById('clearApiKeyBtn');
      const fileInput = document.getElementById('apiKeyFile');
      if (loadBtn && fileInput) {
        loadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleApiKeyFile(e));
      }
      if (clearBtn) {
        clearBtn.addEventListener('click', () => this.clearSavedApiKey());
      }
    }

    
    // 초기 메시지 표시
    showInitialMessage() {
        const videoResults = document.getElementById('videoResults');
        videoResults.style.display = 'block';
        
        document.getElementById('videosList').innerHTML = `
            <div class="initial-message">
                <div class="welcome-card">
                    <i class="fas fa-rocket"></i>
                    <h3>시니어 YouTube 트렌드 분석기에 오신 것을 환영합니다!</h3>
                    <p>원하는 카테고리를 선택하고 <strong>"트렌드 분석하기"</strong> 버튼을 클릭하세요.</p>
                    <div class="feature-list">
                        <div class="feature-item">
                            <i class="fas fa-file-excel"></i>
                            <span>Excel 다운로드로 상세한 데이터 분석</span>
                        </div>
                        <div class="feature-item">
                            <i class="fas fa-chart-bar"></i>
                            <span>시각적 차트와 통계</span>
                        </div>
                        <div class="feature-item">
                            <i class="fas fa-filter"></i>
                            <span>시니어 특화 콘텐츠 필터링</span>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                .initial-message {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 300px;
                }
                .welcome-card {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 48px;
                    border-radius: 20px;
                    text-align: center;
                    max-width: 600px;
                    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
                }
                .welcome-card i {
                    font-size: 4rem;
                    margin-bottom: 24px;
                    opacity: 0.9;
                }
                .welcome-card h3 {
                    font-size: 1.8rem;
                    margin-bottom: 16px;
                    font-weight: 700;
                }
                .welcome-card p {
                    font-size: 1.1rem;
                    margin-bottom: 32px;
                    opacity: 0.9;
                    line-height: 1.6;
                }
                .feature-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-top: 24px;
                }
                .feature-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(255,255,255,0.1);
                    padding: 16px;
                    border-radius: 10px;
                    backdrop-filter: blur(10px);
                }
                .feature-item i {
                    font-size: 1.5rem;
                    color: #fbbf24;
                }
                .feature-item span {
                    font-size: 1rem;
                    font-weight: 500;
                }
                @media (max-width: 768px) {
                    .welcome-card {
                        padding: 32px 24px;
                        margin: 16px;
                    }
                    .welcome-card h3 {
                        font-size: 1.5rem;
                    }
                }
            </style>
        `;
    }
    
    // 검색 실행
    async performSearch() {
        const category = document.getElementById('categorySelect').value;
        const sortBy = document.getElementById('sortBy').value;
        const videoCount = parseInt(document.getElementById('videoCount').value);
        
        console.log(`🔍 트렌드 검색 시작: 카테고리=${category}, 정렬=${sortBy}, 개수=${videoCount}`);
        
        this.showLoading();
        
        try {
            // 데이터 로드 (실제 API 또는 모의 데이터)
            if (this.apiKey === 'DEMO_MODE') {
                this.currentData = await this.generateEnhancedMockData(category, videoCount);
            } else {
                this.currentData = await this.fetchRealYoutubeData(category, videoCount);
            }
            
            // 정렬 적용
            this.applySorting(sortBy);
            
            // 결과 표시
            this.displayResults();
            this.updateDashboard();
            this.updateCharts();
            this.showDownloadSection();
            
            this.hideLoading();
            console.log('✅ 검색 완료:', this.currentData.length, '개 영상');
            
        } catch (error) {
            console.error('❌ 검색 오류:', error);
            this.showError();
        }
    }
    
    // 향상된 모의 데이터 생성
    async generateEnhancedMockData(category, count) {
        // 로딩 시뮬레이션
        await this.simulateLoading(2000);
        
        const videoTemplates = this.getVideoTemplatesByCategory(category);
        const videos = [];
        
        for (let i = 0; i < count; i++) {
            const template = videoTemplates[Math.floor(Math.random() * videoTemplates.length)];
            const titleIndex = Math.floor(Math.random() * template.titles.length);
            const channelIndex = Math.floor(Math.random() * template.channels.length);
            
            videos.push({
                id: `video_${Date.now()}_${i}`,
                rank: i + 1,
                title: template.titles[titleIndex],
                channel: template.channels[channelIndex],
                category: template.category,
                categoryName: this.getCategoryName(template.category),
                views: this.generateRandomViews(),
                likes: this.generateRandomLikes(),
                comments: this.generateRandomComments(),
                duration: this.generateRandomDuration(),
                publishTime: this.generateRandomPublishTime(),
                growthRate: this.generateGrowthRate(),
                thumbnail: this.generateThumbnail(template.category),
                engagement: this.calculateEngagement(),
                tags: this.generateTags(template.category),
                description: this.generateDescription(template.category),
                publishedAt: this.generatePublishedDate(),
                videoId: this.generateVideoId()
            });
        }
        
        return videos;
    }
    
    // 카테고리별 비디오 템플릿
    getVideoTemplatesByCategory(selectedCategory) {
        const allTemplates = {
            health: {
                titles: [
                    "60대도 쉽게 따라하는 무릎 건강 운동 5가지",
                    "시니어를 위한 혈압 낮추는 생활습관",
                    "중년 이후 반드시 알아야 할 건강 관리법",
                    "실버 요가로 관절 건강 지키기",
                    "70대도 할 수 있는 홈트레이닝",
                    "당뇨 예방하는 시니어 식단과 운동",
                    "치매 예방을 위한 두뇌 운동법",
                    "시니어를 위한 척추 건강 스트레칭",
                    "갱년기 이후 건강 관리 완전 가이드",
                    "실버세대를 위한 면역력 높이는 방법"
                ],
                channels: ["실버헬스TV", "건강한노년", "시니어웰빙", "실버운동방", "헬시에이징", "노인건강연구소", "시니어피트니스", "건강백세"],
                category: "health"
            },
            tech: {
                titles: [
                    "시니어를 위한 카카오톡 완전정복 가이드",
                    "스마트폰 기초부터 고급기능까지",
                    "AI 시대, 시니어도 할 수 있는 디지털 활용법",
                    "온라인 쇼핑 안전하게 하는 방법",
                    "유튜브 보는 법부터 채널 만들기까지",
                    "시니어를 위한 인터넷 뱅킹 완전 가이드",
                    "스마트워치 활용법 시니어 버전",
                    "화상통화로 손자 손녀와 소통하기",
                    "시니어도 쉬운 온라인 병원 예약",
                    "안전한 와이파이 사용법"
                ],
                channels: ["디지털시니어", "스마트실버", "시니어IT교육", "디지털라이프", "실버테크", "시니어앱연구소", "디지털할머니"],
                category: "tech"
            },
            cooking: {
                titles: [
                    "50대 이후 건강한 식단 한 주 레시피",
                    "당뇨 환자를 위한 맛있는 저당 요리",
                    "혈압에 좋은 나트륨 줄인 김치 담그기",
                    "중년 다이어트를 위한 든든한 한 끼",
                    "시니어를 위한 영양 만점 간식 만들기",
                    "관절에 좋은 콜라겐 요리법",
                    "소화가 잘 되는 시니어 반찬 10가지",
                    "혈관 건강을 위한 오메가3 요리",
                    "면역력 강화 시니어 보양식",
                    "간편하게 만드는 영양 죽 레시피"
                ],
                channels: ["건강한실버요리", "시니어쿠킹", "웰빙레시피", "실버키친", "건강식단연구소", "영양사할머니", "시니어셰프"],
                category: "cooking"
            },
            travel: {
                titles: [
                    "시니어 추천 국내 여행지 BEST 10",
                    "60대 부모님과 함께하는 제주도 3박4일",
                    "실버세대를 위한 유럽 패키지여행 후기",
                    "중년 부부 캠핑 첫 도전기",
                    "기차 여행으로 즐기는 전국 맛집 투어",
                    "시니어 버스투어 완전 가이드",
                    "효도 여행 베스트 코스 추천",
                    "실버세대를 위한 온천 여행",
                    "시니어 해외여행 준비 체크리스트",
                    "걸으면서 즐기는 시니어 도보여행"
                ],
                channels: ["시니어트래블", "실버여행가", "중년여행클럽", "여행하는할머니", "실버투어", "효도여행TV", "시니어버스투어"],
                category: "travel"
            },
            hobby: {
                titles: [
                    "60대에 시작하는 서예, 마음이 편해지는 시간",
                    "시니어 합창단, 함께 부르는 추억의 노래",
                    "정원 가꾸기로 즐기는 시니어 라이프",
                    "뜨개질로 만드는 손자 손녀 선물",
                    "실버 댄스로 건강하고 즐겁게",
                    "시니어를 위한 사진 취미 시작하기",
                    "중년 이후 배우는 악기 연주",
                    "실버세대 독서 모임 운영법",
                    "시니어 봉사활동 참여 가이드",
                    "노년기 새로운 취미 찾기"
                ],
                channels: ["실버문화센터", "시니어취미방", "중년의품격", "실버아트", "시니어클럽", "취미생활TV", "실버라이프"],
                category: "hobby"
            },
            life: {
                titles: [
                    "시니어를 위한 연금 수령 완전 가이드",
                    "은퇴 후 재정 관리 노하우",
                    "실버타운 선택 시 체크포인트",
                    "시니어를 위한 보험 정리법",
                    "노후 준비 체크리스트",
                    "시니어 패션 스타일링 팁",
                    "중년 이후 인간관계 관리법",
                    "시니어를 위한 안전한 집 만들기",
                    "노인 돌봄 서비스 이용 가이드",
                    "실버세대를 위한 법적 준비사항"
                ],
                channels: ["실버라이프코치", "시니어정보방", "노후설계전문가", "실버컨설팅", "시니어라이프", "은퇴설계TV"],
                category: "life"
            }
        };
        
        if (selectedCategory === 'all') {
            return Object.values(allTemplates);
        } else {
            return [allTemplates[selectedCategory]];
        }
    }
    
    // 데이터 생성 유틸리티 함수들
    generateRandomViews() {
        const ranges = [
            { min: 10000, max: 50000, weight: 30 },
            { min: 50000, max: 150000, weight: 40 },
            { min: 150000, max: 500000, weight: 25 },
            { min: 500000, max: 1000000, weight: 5 }
        ];
        
        const random = Math.random() * 100;
        let cumulative = 0;
        
        for (const range of ranges) {
            cumulative += range.weight;
            if (random <= cumulative) {
                return Math.floor(Math.random() * (range.max - range.min) + range.min).toLocaleString();
            }
        }
        
        return (50000).toLocaleString();
    }
    
    generateRandomLikes() {
        const viewCount = parseInt(this.generateRandomViews().replace(/,/g, ''));
        const likeRate = Math.random() * 0.08 + 0.02; // 2-10% 좋아요율
        return Math.floor(viewCount * likeRate).toLocaleString();
    }
    
    generateRandomComments() {
        const viewCount = parseInt(this.generateRandomViews().replace(/,/g, ''));
        const commentRate = Math.random() * 0.003 + 0.001; // 0.1-0.4% 댓글률
        return Math.floor(viewCount * commentRate).toLocaleString();
    }
    
    generateRandomDuration() {
        const minutes = Math.floor(Math.random() * 25) + 3; // 3-28분
        const seconds = Math.floor(Math.random() * 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    generateRandomPublishTime() {
        const hours = Math.floor(Math.random() * 72) + 1; // 1-72시간 전
        if (hours < 24) {
            return `${hours}시간 전`;
        } else {
            const days = Math.floor(hours / 24);
            return `${days}일 전`;
        }
    }
    
    generateGrowthRate() {
        // 가중치를 적용한 성장률 생성
        const weights = [
            { min: 1, max: 5, weight: 40 },
            { min: 5, max: 15, weight: 35 },
            { min: 15, max: 30, weight: 20 },
            { min: 30, max: 50, weight: 5 }
        ];
        
        const random = Math.random() * 100;
        let cumulative = 0;
        
        for (const weight of weights) {
            cumulative += weight.weight;
            if (random <= cumulative) {
                return (Math.random() * (weight.max - weight.min) + weight.min).toFixed(1);
            }
        }
        
        return (10).toFixed(1);
    }
    
    calculateEngagement() {
        return (Math.random() * 8 + 2).toFixed(1); // 2-10% 참여도
    }
    
    generateTags(category) {
        const tagMap = {
            health: ['시니어건강', '실버운동', '노인체조', '건강관리', '관절건강'],
            tech: ['시니어IT', '스마트폰', '디지털교육', '온라인', '앱사용법'],
            cooking: ['시니어요리', '건강식단', '간편요리', '영양관리', '레시피'],
            travel: ['시니어여행', '국내여행', '해외여행', '패키지여행', '효도여행'],
            hobby: ['시니어취미', '문화활동', '여가생활', '평생교육', '동호회'],
            life: ['시니어라이프', '노후준비', '은퇴설계', '연금', '실버타운']
        };
        
        return tagMap[category] || ['시니어', '노년', '실버'];
    }
    
    generateDescription(category) {
        const descriptions = {
            health: '시니어를 위한 건강 관리 정보와 운동법을 제공합니다.',
            tech: '시니어도 쉽게 따라할 수 있는 디지털 기기 활용법을 알려드립니다.',
            cooking: '건강하고 맛있는 시니어를 위한 요리 레시피를 소개합니다.',
            travel: '시니어를 위한 안전하고 편안한 여행 정보를 제공합니다.',
            hobby: '시니어의 활기찬 여가 생활을 위한 취미 활동을 소개합니다.',
            life: '시니어의 풍요로운 생활을 위한 유용한 정보를 제공합니다.'
        };
        
        return descriptions[category] || '시니어를 위한 유용한 정보를 제공합니다.';
    }
    
    generatePublishedDate() {
        const daysAgo = Math.floor(Math.random() * 30) + 1;
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString().split('T')[0];
    }
    
    generateVideoId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        let result = '';
        for (let i = 0; i < 11; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    generateThumbnail(category) {
        const colors = {
            health: '10b981/ffffff',
            tech: '3b82f6/ffffff',
            cooking: 'f59e0b/ffffff',
            travel: 'ef4444/ffffff',
            hobby: '8b5cf6/ffffff',
            life: '06b6d4/ffffff'
        };
        
        const categoryNames = {
            health: '건강',
            tech: '테크',
            cooking: '요리',
            travel: '여행',
            hobby: '취미',
            life: '라이프'
        };
        
        return `https://via.placeholder.com/480x270/${colors[category]}?text=${categoryNames[category] || '시니어'}`;
    }
    
    // 카테고리명 변환
    getCategoryName(category) {
        const names = {
            health: '건강 & 운동',
            tech: '시니어 테크',
            cooking: '요리 & 레시피',
            travel: '여행',
            hobby: '취미 & 여가',
            life: '생활 정보'
        };
        return names[category] || '기타';
    }
    
    // 정렬 적용
    applySorting(sortBy) {
        switch (sortBy) {
            case 'growth':
                this.currentData.sort((a, b) => parseFloat(b.growthRate) - parseFloat(a.growthRate));
                break;
            case 'views':
                this.currentData.sort((a, b) => 
                    parseInt(b.views.replace(/,/g, '')) - parseInt(a.views.replace(/,/g, ''))
                );
                break;
            case 'likes':
                this.currentData.sort((a, b) => 
                    parseInt(b.likes.replace(/,/g, '')) - parseInt(a.likes.replace(/,/g, ''))
                );
                break;
            case 'recent':
                this.currentData.sort((a, b) => {
                    const aHours = this.parseTimeToHours(a.publishTime);
                    const bHours = this.parseTimeToHours(b.publishTime);
                    return aHours - bHours;
                });
                break;
        }
        
        // 순위 재설정
        this.currentData.forEach((video, index) => {
            video.rank = index + 1;
        });
    }
    
    // 시간을 시간 단위로 변환
    parseTimeToHours(timeString) {
        if (timeString.includes('시간 전')) {
            return parseInt(timeString.replace('시간 전', ''));
        } else if (timeString.includes('일 전')) {
            return parseInt(timeString.replace('일 전', '')) * 24;
        }
        return 0;
    }
    
    // 결과 표시
    displayResults() {
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('chartsSection').style.display = 'block';
        document.getElementById('videoResults').style.display = 'block';
        
        const viewMode = document.getElementById('viewMode').value;
        this.renderVideos(viewMode);
    }
    
    // 비디오 렌더링
    renderVideos(mode) {
        const container = document.getElementById('videosList');
        container.className = `videos-container ${mode}-view`;
        
        if (mode === 'card') {
            this.renderCardView(container);
        } else {
            this.renderTableView(container);
        }
    }
    
    // 카드 뷰 렌더링
    renderCardView(container) {
        container.innerHTML = this.currentData.map(video => `
            <div class="video-card" onclick="window.open('https://www.youtube.com/results?search_query=${encodeURIComponent(video.title)}', '_blank')">
                <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail" loading="lazy">
                <div class="video-info">
                    <div class="video-rank">#${video.rank}</div>
                    <h4 class="video-title">${video.title}</h4>
                    <div class="video-channel">📺 ${video.channel}</div>
                    <div class="video-stats">
                        <div class="stat-item-video">
                            <i class="fas fa-eye"></i>
                            <span>${video.views}</span>
                        </div>
                        <div class="stat-item-video">
                            <i class="fas fa-thumbs-up"></i>
                            <span>${video.likes}</span>
                        </div>
                        <div class="stat-item-video">
                            <i class="fas fa-comments"></i>
                            <span>${video.comments}</span>
                        </div>
                        <div class="stat-item-video">
                            <i class="fas fa-clock"></i>
                            <span>${video.duration}</span>
                        </div>
                    </div>
                    <div class="growth-rate">
                        ↗ ${video.growthRate}% 성장률
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // 테이블 뷰 렌더링
    renderTableView(container) {
        container.innerHTML = `
            <div class="table-responsive">
                <table class="video-table">
                    <thead>
                        <tr>
                            <th>순위</th>
                            <th>제목</th>
                            <th>채널</th>
                            <th>카테고리</th>
                            <th>조회수</th>
                            <th>좋아요</th>
                            <th>댓글</th>
                            <th>성장률</th>
                            <th>게시시간</th>
                            <th>영상길이</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.currentData.map(video => `
                            <tr onclick="window.open('https://www.youtube.com/results?search_query=${encodeURIComponent(video.title)}', '_blank')" style="cursor: pointer;">
                                <td class="rank-cell">${video.rank}</td>
                                <td class="title-cell" title="${video.title}">${video.title}</td>
                                <td>${video.channel}</td>
                                <td>${video.categoryName}</td>
                                <td>${video.views}</td>
                                <td>${video.likes}</td>
                                <td>${video.comments}</td>
                                <td class="growth-cell">${video.growthRate}%</td>
                                <td>${video.publishTime}</td>
                                <td>${video.duration}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    // 대시보드 업데이트
    updateDashboard() {
        const totalViews = this.currentData.reduce((sum, video) => 
            sum + parseInt(video.views.replace(/,/g, '')), 0);
            
        const avgGrowthRate = (this.currentData.reduce((sum, video) => 
            sum + parseFloat(video.growthRate), 0) / this.currentData.length).toFixed(1);
            
        const avgEngagement = (this.currentData.reduce((sum, video) => 
            sum + parseFloat(video.engagement), 0) / this.currentData.length).toFixed(1);
        
        document.getElementById('totalVideos').textContent = this.currentData.length.toLocaleString();
        document.getElementById('totalViews').textContent = totalViews.toLocaleString();
        document.getElementById('avgEngagement').textContent = `${avgEngagement}%`;
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('ko-KR');
    }
    
    // 차트 업데이트
    updateCharts() {
        this.createCategoryChart();
        this.createGrowthChart();
    }
    
    // 카테고리 차트 생성
    createCategoryChart() {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        
        if (this.charts.categoryChart) {
            this.charts.categoryChart.destroy();
        }
        
        const categoryData = this.currentData.reduce((acc, video) => {
            acc[video.categoryName] = (acc[video.categoryName] || 0) + 1;
            return acc;
        }, {});
        
        this.charts.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    data: Object.values(categoryData),
                    backgroundColor: [
                        '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
                    ],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: { size: 14 },
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
    
    // 성장률 차트 생성
    createGrowthChart() {
        const ctx = document.getElementById('growthChart').getContext('2d');
        
        if (this.charts.growthChart) {
            this.charts.growthChart.destroy();
        }
        
        const topVideos = this.currentData.slice(0, 10);
        
        this.charts.growthChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topVideos.map((v, i) => `#${i + 1}`),
                datasets: [{
                    label: '성장률 (%)',
                    data: topVideos.map(v => parseFloat(v.growthRate)),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: '#10b981',
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
    
    // 다운로드 섹션 표시
    showDownloadSection() {
        document.getElementById('downloadSection').style.display = 'block';
        
        const totalViews = this.currentData.reduce((sum, video) => 
            sum + parseInt(video.views.replace(/,/g, '')), 0);
            
        const avgGrowthRate = (this.currentData.reduce((sum, video) => 
            sum + parseFloat(video.growthRate), 0) / this.currentData.length).toFixed(1);
        
        document.getElementById('downloadVideosCount').textContent = this.currentData.length.toLocaleString();
        document.getElementById('downloadTotalViews').textContent = totalViews.toLocaleString();
        document.getElementById('downloadAvgGrowth').textContent = `${avgGrowthRate}%`;
    }
    
    // Excel 다운로드 - 핵심 기능!
    downloadExcel() {
        console.log('📊 Excel 파일 생성 시작...');
        
        try {
            const workbook = XLSX.utils.book_new();
            
            // 요약 시트
            const summaryData = this.createSummaryData();
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(workbook, summarySheet, "요약");
            
            // 상세 데이터 시트
            const detailData = this.createDetailData();
            const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
            XLSX.utils.book_append_sheet(workbook, detailSheet, "상세데이터");
            
            // 카테고리별 분석 시트
            const categoryData = this.createCategoryAnalysis();
            const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
            XLSX.utils.book_append_sheet(workbook, categorySheet, "카테고리분석");
            
            // 스타일링 적용
            this.applyExcelStyling(detailSheet);
            
            // 파일 다운로드
            const filename = this.generateFilename('시니어_YouTube_트렌드', 'xlsx');
            XLSX.writeFile(workbook, filename);
            
            console.log('✅ Excel 파일 다운로드 완료:', filename);
            this.showDownloadSuccess('Excel');
            
        } catch (error) {
            console.error('❌ Excel 다운로드 오류:', error);
            this.showDownloadError('Excel');
        }
    }
    
    // Excel 요약 데이터 생성
    createSummaryData() {
        const totalViews = this.currentData.reduce((sum, video) => 
            sum + parseInt(video.views.replace(/,/g, '')), 0);
        const avgGrowthRate = (this.currentData.reduce((sum, video) => 
            sum + parseFloat(video.growthRate), 0) / this.currentData.length).toFixed(1);
        
        return [
            ['시니어 YouTube 트렌드 분석 보고서'],
            ['생성일시', new Date().toLocaleString('ko-KR')],
            [''],
            ['📊 전체 통계'],
            ['분석된 영상 수', this.currentData.length],
            ['총 조회수', totalViews.toLocaleString()],
            ['평균 성장률', avgGrowthRate + '%'],
            [''],
            ['🏆 TOP 5 영상'],
            ['순위', '제목', '채널', '성장률'],
            ...this.currentData.slice(0, 5).map(video => [
                video.rank,
                video.title,
                video.channel,
                video.growthRate + '%'
            ]),
            [''],
            ['📈 카테고리별 분포'],
            ['카테고리', '영상 수', '비율'],
            ...this.getCategoryDistribution()
        ];
    }
    
    // Excel 상세 데이터 생성
    createDetailData() {
        const headers = [
            '순위', '제목', '채널', '카테고리', '조회수', '좋아요', '댓글수',
            '성장률(%)', '참여도(%)', '게시시간', '영상길이', '태그', 
            '게시일', '비디오ID', '썸네일URL'
        ];
        
        const data = this.currentData.map(video => [
            video.rank,
            video.title,
            video.channel,
            video.categoryName,
            video.views,
            video.likes,
            video.comments,
            video.growthRate,
            video.engagement,
            video.publishTime,
            video.duration,
            video.tags.join(', '),
            video.publishedAt,
            video.videoId,
            video.thumbnail
        ]);
        
        return [headers, ...data];
    }
    
    // 카테고리별 분석 데이터 생성
    createCategoryAnalysis() {
        const categories = [...new Set(this.currentData.map(v => v.categoryName))];
        
        const analysisData = [
            ['카테고리별 상세 분석'],
            [''],
            ['카테고리', '영상수', '평균조회수', '평균성장률', '평균참여도', 'TOP 영상']
        ];
        
        categories.forEach(category => {
            const categoryVideos = this.currentData.filter(v => v.categoryName === category);
            const avgViews = Math.floor(categoryVideos.reduce((sum, v) => 
                sum + parseInt(v.views.replace(/,/g, '')), 0) / categoryVideos.length);
            const avgGrowth = (categoryVideos.reduce((sum, v) => 
                sum + parseFloat(v.growthRate), 0) / categoryVideos.length).toFixed(1);
            const avgEngagement = (categoryVideos.reduce((sum, v) => 
                sum + parseFloat(v.engagement), 0) / categoryVideos.length).toFixed(1);
            const topVideo = categoryVideos.sort((a, b) => 
                parseFloat(b.growthRate) - parseFloat(a.growthRate))[0];
            
            analysisData.push([
                category,
                categoryVideos.length,
                avgViews.toLocaleString(),
                avgGrowth + '%',
                avgEngagement + '%',
                topVideo ? topVideo.title : '-'
            ]);
        });
        
        return analysisData;
    }
    
    // 카테고리 분포 데이터
    getCategoryDistribution() {
        const distribution = this.currentData.reduce((acc, video) => {
            acc[video.categoryName] = (acc[video.categoryName] || 0) + 1;
            return acc;
        }, {});
        
        const total = this.currentData.length;
        
        return Object.entries(distribution).map(([category, count]) => [
            category,
            count,
            ((count / total) * 100).toFixed(1) + '%'
        ]);
    }
    
    // Excel 스타일링 적용
    applyExcelStyling(sheet) {
        // 열 너비 설정
        const colWidths = [
            { wch: 6 },   // 순위
            { wch: 60 },  // 제목
            { wch: 20 },  // 채널
            { wch: 15 },  // 카테고리
            { wch: 12 },  // 조회수
            { wch: 10 },  // 좋아요
            { wch: 8 },   // 댓글수
            { wch: 10 },  // 성장률
            { wch: 10 },  // 참여도
            { wch: 12 },  // 게시시간
            { wch: 10 },  // 영상길이
            { wch: 30 },  // 태그
            { wch: 12 },  // 게시일
            { wch: 15 },  // 비디오ID
            { wch: 40 }   // 썸네일URL
        ];
        
        sheet['!cols'] = colWidths;
    }
    
    // CSV 다운로드
    downloadCSV() {
        console.log('📄 CSV 파일 생성 시작...');
        
        try {
            const headers = [
                '순위', '제목', '채널', '카테고리', '조회수', '좋아요', '댓글수',
                '성장률(%)', '참여도(%)', '게시시간', '영상길이', '게시일'
            ];
            
            let csvContent = headers.join(',') + '\n';
            
            this.currentData.forEach(video => {
                const row = [
                    video.rank,
                    `"${video.title.replace(/"/g, '""')}"`,  // 제목 따옴표 처리
                    `"${video.channel}"`,
                    `"${video.categoryName}"`,
                    video.views,
                    video.likes,
                    video.comments,
                    video.growthRate,
                    video.engagement,
                    `"${video.publishTime}"`,
                    video.duration,
                    video.publishedAt
                ];
                csvContent += row.join(',') + '\n';
            });
            
            // BOM 추가 (Excel에서 한글 깨짐 방지)
            const blob = new Blob(['\uFEFF' + csvContent], { 
                type: 'text/csv;charset=utf-8;' 
            });
            
            const filename = this.generateFilename('시니어_YouTube_트렌드', 'csv');
            this.downloadBlob(blob, filename);
            
            console.log('✅ CSV 파일 다운로드 완료:', filename);
            this.showDownloadSuccess('CSV');
            
        } catch (error) {
            console.error('❌ CSV 다운로드 오류:', error);
            this.showDownloadError('CSV');
        }
    }
    
    // JSON 다운로드
    downloadJSON() {
        console.log('📋 JSON 파일 생성 시작...');
        
        try {
            const exportData = {
                metadata: {
                    title: '시니어 YouTube 트렌드 분석 데이터',
                    generatedAt: new Date().toISOString(),
                    totalVideos: this.currentData.length,
                    categories: [...new Set(this.currentData.map(v => v.categoryName))],
                    summary: {
                        totalViews: this.currentData.reduce((sum, video) => 
                            sum + parseInt(video.views.replace(/,/g, '')), 0),
                        avgGrowthRate: (this.currentData.reduce((sum, video) => 
                            sum + parseFloat(video.growthRate), 0) / this.currentData.length).toFixed(1)
                    }
                },
                data: this.currentData.map(video => ({
                    ...video,
                    viewsNumeric: parseInt(video.views.replace(/,/g, '')),
                    likesNumeric: parseInt(video.likes.replace(/,/g, '')),
                    commentsNumeric: parseInt(video.comments.replace(/,/g, '')),
                    growthRateNumeric: parseFloat(video.growthRate),
                    engagementNumeric: parseFloat(video.engagement)
                }))
            };
            
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            const filename = this.generateFilename('시니어_YouTube_트렌드', 'json');
            this.downloadBlob(blob, filename);
            
            console.log('✅ JSON 파일 다운로드 완료:', filename);
            this.showDownloadSuccess('JSON');
            
        } catch (error) {
            console.error('❌ JSON 다운로드 오류:', error);
            this.showDownloadError('JSON');
        }
    }
    
    // PDF 리포트 다운로드 (간단한 HTML → PDF)
    downloadPDF() {
        console.log('📄 PDF 리포트 생성 시작...');
        
        try {
            // PDF 생성을 위한 HTML 콘텐츠 생성
            const htmlContent = this.generatePDFContent();
            
            // 새 창에서 HTML을 열고 인쇄 다이얼로그 호출
            const printWindow = window.open('', '_blank');
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            // 약간의 지연 후 인쇄 다이얼로그 호출
            setTimeout(() => {
                printWindow.print();
            }, 500);
            
            console.log('✅ PDF 리포트 생성 완료');
            this.showDownloadSuccess('PDF');
            
        } catch (error) {
            console.error('❌ PDF 생성 오류:', error);
            this.showDownloadError('PDF');
        }
    }
    
    // PDF용 HTML 콘텐츠 생성
    generatePDFContent() {
        const totalViews = this.currentData.reduce((sum, video) => 
            sum + parseInt(video.views.replace(/,/g, '')), 0);
        const avgGrowthRate = (this.currentData.reduce((sum, video) => 
            sum + parseFloat(video.growthRate), 0) / this.currentData.length).toFixed(1);
        
        return `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <title>시니어 YouTube 트렌드 분석 보고서</title>
                <style>
                    @page { margin: 2cm; }
                    body { font-family: 'Malgun Gothic', sans-serif; font-size: 12px; line-height: 1.4; color: #333; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; }
                    .header h1 { color: #3b82f6; font-size: 24px; margin-bottom: 10px; }
                    .header .date { color: #666; font-size: 14px; }
                    .summary { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
                    .summary h2 { color: #1e293b; margin-bottom: 15px; }
                    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
                    .stat-item { text-align: center; }
                    .stat-value { font-size: 18px; font-weight: bold; color: #3b82f6; display: block; }
                    .stat-label { font-size: 12px; color: #666; }
                    .video-list { margin-top: 30px; }
                    .video-list h2 { color: #1e293b; margin-bottom: 20px; }
                    .video-table { width: 100%; border-collapse: collapse; font-size: 10px; }
                    .video-table th { background: #3b82f6; color: white; padding: 8px; text-align: left; }
                    .video-table td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
                    .video-table tr:nth-child(even) { background: #f8fafc; }
                    .rank { font-weight: bold; color: #f59e0b; text-align: center; }
                    .title { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                    .growth { font-weight: bold; color: #10b981; text-align: right; }
                    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 10px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📊 시니어 YouTube 트렌드 분석 보고서</h1>
                    <div class="date">생성일시: ${new Date().toLocaleString('ko-KR')}</div>
                </div>
                
                <div class="summary">
                    <h2>📈 분석 요약</h2>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-value">${this.currentData.length}</span>
                            <span class="stat-label">분석된 영상</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${totalViews.toLocaleString()}</span>
                            <span class="stat-label">총 조회수</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${avgGrowthRate}%</span>
                            <span class="stat-label">평균 성장률</span>
                        </div>
                    </div>
                </div>
                
                <div class="video-list">
                    <h2>🔥 트렌드 영상 TOP ${Math.min(20, this.currentData.length)}</h2>
                    <table class="video-table">
                        <thead>
                            <tr>
                                <th>순위</th>
                                <th>제목</th>
                                <th>채널</th>
                                <th>카테고리</th>
                                <th>조회수</th>
                                <th>좋아요</th>
                                <th>성장률</th>
                                <th>게시시간</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.currentData.slice(0, 20).map(video => `
                                <tr>
                                    <td class="rank">${video.rank}</td>
                                    <td class="title" title="${video.title}">${video.title}</td>
                                    <td>${video.channel}</td>
                                    <td>${video.categoryName}</td>
                                    <td>${video.views}</td>
                                    <td>${video.likes}</td>
                                    <td class="growth">${video.growthRate}%</td>
                                    <td>${video.publishTime}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="footer">
                    <p>본 보고서는 시니어 YouTube 트렌드 분석기에 의해 자동 생성되었습니다.</p>
                    <p>문의: GitHub - Senior YouTube Trends Analyzer</p>
                </div>
            </body>
            </html>
        `;
    }
    
    // 파일명 생성
    generateFilename(prefix, extension) {
        const now = new Date();
        const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
        const timeStr = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
        return `${prefix}_${dateStr}_${timeStr}.${extension}`;
    }
    
    // Blob 다운로드
    downloadBlob(blob, filename) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    // 다운로드 성공 메시지
    showDownloadSuccess(type) {
        this.showToast(`✅ ${type} 파일이 성공적으로 다운로드되었습니다!`, 'success');
    }
    
    // 다운로드 실패 메시지
    showDownloadError(type) {
        this.showToast(`❌ ${type} 파일 다운로드 중 오류가 발생했습니다.`, 'error');
    }
    
    // 토스트 메시지 표시
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // 토스트 스타일
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            zIndex: '9999',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease'
        });
        
        document.body.appendChild(toast);
        
        // 애니메이션
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // 자동 제거
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
    
    // 기타 유틸리티 함수들
    simulateLoading(duration) {
        return new Promise(resolve => setTimeout(resolve, duration));
    }
    
    showLoading() {
        document.getElementById('loadingSpinner').style.display = 'flex';
        document.getElementById('errorMessage').style.display = 'none';
    }
    
    hideLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }
    
    showError() {
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'flex';
    }
    
    changeViewMode(mode) {
        this.renderVideos(mode);
    }
    
    refreshData() {
        location.reload();
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 시니어 YouTube 트렌드 분석기 (엑셀 다운로드) 시작!');
    window.seniorTrendsExcel = new SeniorYoutubeTrendsExcel();
});

// 글로벌 유틸리티 함수
window.formatNumber = function(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('클립보드에 복사됨:', text);
    });
};
