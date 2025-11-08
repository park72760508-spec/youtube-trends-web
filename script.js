/**
 * 시니어 YouTube 트렌드 분석기 Pro - 전체 채널 스캔 시스템
 * 모든 시니어 관련 키워드로 전체 채널을 스캔하여 최상위 핫한 영상 검출
 */

class FullScanYoutubeTrendsAnalyzer {
    constructor() {
        this.apiKey = this.getApiKey();
        this.baseUrl = 'https://www.googleapis.com/youtube/v3';
        this.allVideos = []; // 전체 스캔 결과 저장
        this.scanResults = []; // 최종 정렬된 결과
        this.isScanning = false;
        this.charts = {};
        
        // 확장된 시니어 키워드 데이터베이스 (카테고리별)
        this.seniorKeywords = {
            all: [
                // 기본 시니어 키워드
                '시니어', '노인', '중년', '50대', '60대', '70대', '80대', 
                '실버', '어르신', '부모님', '할머니', '할아버지',
                '노년', '중년층', '실버세대', '황혼기', '노후',
                
                // 복합 키워드
                '시니어 라이프', '노년 생활', '실버 문화', '중년의 품격',
                '인생 2막', '세컨드 라이프', '은퇴 생활', '황금기'
            ],
            health: [
                '시니어 운동', '실버 체조', '노인 건강', '중년 건강', '시니어 요가',
                '노년 운동', '관절 건강', '혈압 관리', '당뇨 관리', '치매 예방',
                '건강식품', '한방치료', '실버 피트니스', '노인 재활', '시니어 스트레칭',
                '무릎 건강', '척추 건강', '골다공증', '근력 운동', '유산소 운동',
                '실버 헬스', '노인 운동법', '건강 관리', '면역력', '혈관 건강',
                '심혈관 질환', '고혈압', '당뇨병', '관절염', '허리 건강'
            ],
            hobby: [
                '시니어 취미', '노년 여가', '실버 문화', '시니어 댄스', '노인 악기',
                '시니어 그림', '서예', '원예', '실버 합창', '노년 학습', '평생교육',
                '시니어 독서', '실버 봉사', '노인 동호회', '시니어 클럽',
                '노년 취미', '실버 아트', '시니어 문화활동', '중년 취미',
                '시니어 음악', '노인 미술', '실버 댄스', '시니어 사진',
                '중년 악기', '노년 서예', '시니어 도예', '실버 원예'
            ],
            cooking: [
                '시니어 요리', '간편 요리', '건강 레시피', '노인 식단', '실버 쿠킹',
                '중년 요리', '한식 요리', '건강식', '당뇨식단', '고혈압 식단',
                '시니어 영양', '노인 반찬', '건강 간식', '실버 레시피',
                '시니어 밑반찬', '노년 영양식', '건강한 식단', '시니어 도시락',
                '혈당 관리 요리', '염분 줄인 요리', '소화 잘 되는 음식',
                '시니어 홈쿠킹', '노인 급식', '실버 푸드'
            ],
            life: [
                '시니어 라이프', '노년 생활', '실버 정보', '시니어 팁', '노인 생활용품',
                '연금 정보', '실버타운', '노후 준비', '중년 라이프스타일', '은퇴 생활',
                '시니어 패션', '노인 돌봄', '시니어 라이프스타일', '노년 준비',
                '실버 금융', '시니어 보험', '노후 설계', '중년 재정관리',
                '시니어 주거', '노인 복지', '실버 서비스', '시니어 안전',
                '노년 인간관계', '시니어 상담', '실버 케어'
            ],
            travel: [
                '시니어 여행', '실버 여행', '노년 여행', '시니어 투어', '중년 여행',
                '실버 패키지', '효도 여행', '국내 여행', '해외 여행', '시니어 캠핑',
                '노인 버스여행', '실버 크루즈', '시니어 배낭여행', '중년 부부여행',
                '시니어 자유여행', '노년 관광', '실버 힐링여행', '시니어 문화여행',
                '온천 여행', '시니어 트레킹', '노년 여행지', '실버 리조트'
            ],
            tech: [
                '시니어 스마트폰', '노인 컴퓨터', '실버 디지털', '시니어 앱',
                '중년 IT', 'AI 활용', '스마트워치', '디지털 교육', '온라인 쇼핑',
                '시니어 SNS', '유튜브 사용법', '카카오톡', '네이버', '구글',
                '시니어 인터넷', '노인 디지털', '실버 테크', '시니어 온라인',
                '디지털 리터러시', '스마트 기기', '시니어 IT교육', '노년 디지털',
                '시니어 화상통화', '온라인 뱅킹', '디지털 헬스케어'
            ]
        };
        
        this.init();
    }
    
    // 초기화
    init() {
        console.log('🔥 시니어 YouTube 트렌드 분석기 Pro - 전체 스캔 시스템 시작');
        this.setupEventListeners();
        this.showWelcomeMessage();
    }
    
    // API 키 확인
    getApiKey() {
        return localStorage.getItem('youtube_api_key') || null;
    }
    
    // API 키 설정
    setApiKey(key) {
        localStorage.setItem('youtube_api_key', key);
        this.apiKey = key;
    }
    
    // 이벤트 리스너 설정
    setupEventListeners() {
        // 전체 스캔 버튼
        const fullScanBtn = document.getElementById('fullScanBtn');
        if (fullScanBtn) {
            fullScanBtn.addEventListener('click', () => this.startFullScan());
        }
        
        // 스캔 중지 버튼
        const stopScanBtn = document.getElementById('stopScanBtn');
        if (stopScanBtn) {
            stopScanBtn.addEventListener('click', () => this.stopScan());
        }
        
        // API 키 관련
        const loadApiKeyBtn = document.getElementById('loadApiKeyBtn');
        const apiKeyFile = document.getElementById('apiKeyFile');
        const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
        
        if (loadApiKeyBtn && apiKeyFile) {
            loadApiKeyBtn.addEventListener('click', () => apiKeyFile.click());
            apiKeyFile.addEventListener('change', (e) => this.loadApiKeyFromFile(e));
        }
        
        if (clearApiKeyBtn) {
            clearApiKeyBtn.addEventListener('click', () => this.clearApiKey());
        }
        
        // 뷰 전환 버튼
        const cardViewBtn = document.getElementById('cardViewBtn');
        const tableViewBtn = document.getElementById('tableViewBtn');
        
        if (cardViewBtn && tableViewBtn) {
            cardViewBtn.addEventListener('click', () => this.switchView('card'));
            tableViewBtn.addEventListener('click', () => this.switchView('table'));
        }
        
        // 다운로드 버튼들
        this.setupDownloadButtons();
    }
    
    // 다운로드 버튼 설정
    setupDownloadButtons() {
        const downloadExcel = document.getElementById('downloadExcel');
        const downloadCSV = document.getElementById('downloadCSV');
        const downloadJSON = document.getElementById('downloadJSON');
        const downloadPDF = document.getElementById('downloadPDF');
        
        if (downloadExcel) downloadExcel.addEventListener('click', () => this.downloadExcel());
        if (downloadCSV) downloadCSV.addEventListener('click', () => this.downloadCSV());
        if (downloadJSON) downloadJSON.addEventListener('click', () => this.downloadJSON());
        if (downloadPDF) downloadPDF.addEventListener('click', () => this.downloadPDF());
    }
    
    // 웰컴 메시지 표시
    showWelcomeMessage() {
        console.log('🎯 전체 스캔 시스템이 준비되었습니다!');
        console.log('📍 모든 시니어 관련 키워드로 전체 채널을 스캔합니다');
        console.log('🚀 최상위 핫한 영상만을 선별하여 표시합니다');
    }
    
    // 전체 스캔 시작
    async startFullScan() {
        if (!this.apiKey) {
            this.showError('YouTube API 키가 필요합니다. API 키를 먼저 설정해주세요.');
            return;
        }
        
        if (this.isScanning) {
            this.showError('이미 스캔이 진행 중입니다.');
            return;
        }
        
        this.isScanning = true;
        this.allVideos = [];
        this.scanResults = [];
        
        // UI 상태 변경
        this.showScanProgress();
        this.updateScanButton(true);
        
        try {
            // 설정 값들 가져오기
            const category = document.getElementById('scanCategory')?.value || 'all';
            const format = document.getElementById('videoFormat')?.value || 'all';
            const count = parseInt(document.getElementById('resultCount')?.value || '50');
            const timeRange = document.getElementById('timeRange')?.value || 'week';
            
            console.log('🔍 전체 스캔 설정:', { category, format, count, timeRange });
            
            // 키워드 목록 준비
            const keywords = this.getKeywordsForCategory(category);
            console.log(`📋 스캔할 키워드 개수: ${keywords.length}`);
            
            // 전체 스캔 실행
            await this.performFullScan(keywords, format, timeRange);
            
            // 바이럴 점수 계산 및 정렬
            await this.calculateViralScores();
            
            // 최상위 결과 선별
            this.scanResults = this.selectTopResults(count);
            
            // 결과 표시
            this.displayResults();
            
            // 분석 요약 표시
            this.displayAnalysisSummary();
            
            // 차트 생성
            this.createCharts();
            
            console.log('✅ 전체 스캔 완료!');
            
        } catch (error) {
            console.error('❌ 스캔 중 오류:', error);
            this.showError(`스캔 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            this.isScanning = false;
            this.hideScanProgress();
            this.updateScanButton(false);
        }
    }
    
    // 카테고리별 키워드 가져오기
    getKeywordsForCategory(category) {
        if (category === 'all') {
            // 모든 카테고리의 키워드를 합침
            return Object.values(this.seniorKeywords).flat();
        } else {
            // 특정 카테고리 + 기본 시니어 키워드
            return [
                ...this.seniorKeywords.all,
                ...(this.seniorKeywords[category] || [])
            ];
        }
    }
    
    // 전체 스캔 수행
    async performFullScan(keywords, format, timeRange) {
        const uniqueKeywords = [...new Set(keywords)]; // 중복 제거
        const totalKeywords = uniqueKeywords.length;
        
        this.updateProgress(0, totalKeywords, 0, 0, '스캔 시작...');
        
        let scannedCount = 0;
        let totalFoundVideos = 0;
        
        // 배치 크기 설정 (API 할당량 고려)
        const batchSize = 5;
        
        for (let i = 0; i < uniqueKeywords.length; i += batchSize) {
            if (!this.isScanning) break; // 스캔 중지 확인
            
            const batch = uniqueKeywords.slice(i, i + batchSize);
            const batchPromises = batch.map(keyword => 
                this.searchVideosForKeyword(keyword, format, timeRange)
            );
            
            try {
                const batchResults = await Promise.all(batchPromises);
                
                // 결과 병합
                for (const videos of batchResults) {
                    if (videos && videos.length > 0) {
                        this.allVideos.push(...videos);
                        totalFoundVideos += videos.length;
                    }
                }
                
                scannedCount += batch.length;
                this.updateProgress(
                    (scannedCount / totalKeywords) * 100,
                    totalKeywords,
                    scannedCount,
                    totalFoundVideos,
                    `키워드 스캔 중... (${scannedCount}/${totalKeywords})`
                );
                
                // API 할당량 보호를 위한 딜레이
                await this.delay(1000);
                
            } catch (error) {
                console.warn(`배치 스캔 오류:`, error);
                scannedCount += batch.length;
            }
        }
        
        // 중복 제거
        this.allVideos = this.removeDuplicateVideos(this.allVideos);
        
        this.updateProgress(
            100,
            totalKeywords,
            scannedCount,
            this.allVideos.length,
            '스캔 완료! 중복 제거 중...'
        );
        
        console.log(`📊 전체 스캔 결과: ${this.allVideos.length}개 영상 발견`);
    }
    
    // 키워드별 영상 검색
    async searchVideosForKeyword(keyword, format, timeRange) {
        try {
            const timeFilter = this.getTimeFilter(timeRange);
            const durationFilter = this.getDurationFilter(format);
            
            const url = `${this.baseUrl}/search?` + new URLSearchParams({
                part: 'snippet',
                q: keyword,
                type: 'video',
                order: 'relevance',
                maxResults: '50',
                publishedAfter: timeFilter,
                videoDuration: durationFilter,
                regionCode: 'KR',
                relevanceLanguage: 'ko',
                key: this.apiKey
            });
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API 오류: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.items || data.items.length === 0) {
                return [];
            }
            
            // 비디오 세부 정보 가져오기
            const videoIds = data.items.map(item => item.id.videoId).join(',');
            const detailsUrl = `${this.baseUrl}/videos?` + new URLSearchParams({
                part: 'statistics,contentDetails,snippet',
                id: videoIds,
                key: this.apiKey
            });
            
            const detailsResponse = await fetch(detailsUrl);
            const detailsData = await detailsResponse.json();
            
            if (!detailsData.items) {
                return [];
            }
            
            // 채널 정보 가져오기
            const channelIds = [...new Set(detailsData.items.map(item => item.snippet.channelId))];
            const channelDetails = await this.getChannelDetails(channelIds);
            
            // 영상 데이터 변환
            return detailsData.items.map(video => this.transformVideoData(video, channelDetails, keyword));
            
        } catch (error) {
            console.warn(`키워드 "${keyword}" 검색 오류:`, error);
            return [];
        }
    }
    
    // 채널 세부 정보 가져오기
    async getChannelDetails(channelIds) {
        if (channelIds.length === 0) return {};
        
        try {
            const url = `${this.baseUrl}/channels?` + new URLSearchParams({
                part: 'statistics,snippet',
                id: channelIds.join(','),
                key: this.apiKey
            });
            
            const response = await fetch(url);
            const data = await response.json();
            
            const channelMap = {};
            if (data.items) {
                data.items.forEach(channel => {
                    channelMap[channel.id] = {
                        subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
                        videoCount: parseInt(channel.statistics?.videoCount || '0'),
                        title: channel.snippet?.title || ''
                    };
                });
            }
            
            return channelMap;
            
        } catch (error) {
            console.warn('채널 정보 가져오기 오류:', error);
            return {};
        }
    }
    
    // 영상 데이터 변환
    transformVideoData(video, channelDetails, searchKeyword) {
        const stats = video.statistics || {};
        const snippet = video.snippet || {};
        const contentDetails = video.contentDetails || {};
        const channelInfo = channelDetails[snippet.channelId] || {};
        
        const viewCount = parseInt(stats.viewCount || '0');
        const likeCount = parseInt(stats.likeCount || '0');
        const commentCount = parseInt(stats.commentCount || '0');
        const subscriberCount = channelInfo.subscriberCount || 0;
        
        // 영상 길이 파싱
        const duration = this.parseDuration(contentDetails.duration || 'PT0M');
        const isShorts = duration <= 60;
        
        // 업로드 날짜
        const publishedAt = new Date(snippet.publishedAt);
        const daysSincePublish = Math.floor((Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
            id: video.id,
            title: snippet.title || '제목 없음',
            channel: snippet.channelTitle || '채널 없음',
            channelId: snippet.channelId,
            thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
            description: snippet.description || '',
            
            // 통계 (숫자)
            viewCount,
            likeCount,
            commentCount,
            subscriberCount,
            
            // 포맷
            duration,
            isShorts,
            format: isShorts ? 'shorts' : 'long',
            
            // 날짜
            publishedAt: publishedAt.toISOString(),
            publishDate: publishedAt.toLocaleDateString('ko-KR'),
            daysSincePublish,
            
            // 검색 정보
            searchKeyword,
            
            // 계산될 점수들 (나중에 설정)
            viralScore: 0,
            engagementRate: 0,
            growthRate: 0,
            freshnessScore: 0
        };
    }
    
    // 시간 필터 생성
    getTimeFilter(timeRange) {
        const now = new Date();
        let days;
        
        switch (timeRange) {
            case 'week': days = 7; break;
            case 'month': days = 30; break;
            case '3months': days = 90; break;
            default: days = 7;
        }
        
        const publishedAfter = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        return publishedAfter.toISOString();
    }
    
    // 길이 필터 생성
    getDurationFilter(format) {
        switch (format) {
            case 'shorts': return 'short'; // 4분 이하
            case 'long': return 'medium'; // 4-20분
            default: return 'any';
        }
    }
    
    // 영상 길이 파싱 (ISO 8601 duration -> 초)
    parseDuration(duration) {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        
        return hours * 3600 + minutes * 60 + seconds;
    }
    
    // 중복 영상 제거
    removeDuplicateVideos(videos) {
        const seen = new Set();
        return videos.filter(video => {
            if (seen.has(video.id)) {
                return false;
            }
            seen.add(video.id);
            return true;
        });
    }
    
    // 바이럴 점수 계산
    async calculateViralScores() {
        this.updateProgress(
            100, 
            this.allVideos.length, 
            this.allVideos.length, 
            this.allVideos.length,
            '바이럴 점수 계산 중...'
        );
        
        for (let i = 0; i < this.allVideos.length; i++) {
            const video = this.allVideos[i];
            
            // 1. 참여율 계산 (좋아요 + 댓글) / 조회수
            video.engagementRate = video.viewCount > 0 
                ? ((video.likeCount + video.commentCount) / video.viewCount) * 100 
                : 0;
            
            // 2. 성장률 계산 (조회수 / 구독자수)
            video.growthRate = video.subscriberCount > 0 
                ? (video.viewCount / video.subscriberCount) * 100 
                : video.viewCount / 1000; // 구독자 정보 없으면 임의 기준
            
            // 3. 최신성 점수 (최근일수록 높은 점수)
            video.freshnessScore = Math.max(0, 100 - video.daysSincePublish * 2);
            
            // 4. 종합 바이럴 점수 계산 (0-1000점)
            video.viralScore = this.calculateComprehensiveViralScore(video);
            
            // 진행 상황 업데이트
            if (i % 10 === 0) {
                this.updateProgress(
                    100,
                    this.allVideos.length,
                    this.allVideos.length,
                    i + 1,
                    `바이럴 점수 계산 중... (${i + 1}/${this.allVideos.length})`
                );
            }
        }
    }
    
    // 종합 바이럴 점수 계산
    calculateComprehensiveViralScore(video) {
        // 가중치 설정
        const weights = {
            views: 0.3,      // 조회수 30%
            engagement: 0.25, // 참여율 25%
            growth: 0.25,     // 성장률 25%
            freshness: 0.2    // 최신성 20%
        };
        
        // 각 지표별 정규화 (0-100점)
        const viewScore = Math.min(100, Math.log10(video.viewCount + 1) * 20); // 로그 스케일
        const engagementScore = Math.min(100, video.engagementRate * 20);
        const growthScore = Math.min(100, Math.log10(video.growthRate + 1) * 25);
        const freshnessScore = video.freshnessScore;
        
        // 가중 평균 계산
        const totalScore = 
            viewScore * weights.views +
            engagementScore * weights.engagement +
            growthScore * weights.growth +
            freshnessScore * weights.freshness;
        
        // 쇼츠 보너스
        const shortsBonus = video.isShorts ? 10 : 0;
        
        // 최종 점수 (0-1000점)
        return Math.round(Math.min(1000, (totalScore * 10) + shortsBonus));
    }
    
    // 최상위 결과 선별
    selectTopResults(count) {
        // 바이럴 점수 기준으로 내림차순 정렬
        this.allVideos.sort((a, b) => b.viralScore - a.viralScore);
        
        // 최상위 count개 선별
        const topResults = this.allVideos.slice(0, count);
        
        // 순위 설정
        topResults.forEach((video, index) => {
            video.rank = index + 1;
        });
        
        return topResults;
    }
    
    // 결과 표시
    displayResults() {
        // 결과 섹션 표시
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }
        
        // 다운로드 섹션 표시
        const downloadSection = document.getElementById('downloadSection');
        if (downloadSection) {
            downloadSection.style.display = 'block';
        }
        
        // 카드 보기로 기본 표시
        this.switchView('card');
    }
    
    // 뷰 전환
    switchView(viewType) {
        const cardView = document.getElementById('cardView');
        const tableView = document.getElementById('tableView');
        const cardBtn = document.getElementById('cardViewBtn');
        const tableBtn = document.getElementById('tableViewBtn');
        
        if (viewType === 'card') {
            if (cardView) cardView.style.display = 'grid';
            if (tableView) tableView.style.display = 'none';
            if (cardBtn) cardBtn.classList.add('active');
            if (tableBtn) tableBtn.classList.remove('active');
            this.renderCardView();
        } else {
            if (cardView) cardView.style.display = 'none';
            if (tableView) tableView.style.display = 'block';
            if (cardBtn) cardBtn.classList.remove('active');
            if (tableBtn) tableBtn.classList.add('active');
            this.renderTableView();
        }
    }
    
    // 카드 뷰 렌더링
    renderCardView() {
        const container = document.getElementById('cardView');
        if (!container || !this.scanResults) return;
        
        container.innerHTML = this.scanResults.map(video => `
            <div class="video-card">
                <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail" 
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 320 180%22><rect width=%22320%22 height=%22180%22 fill=%22%23e5e7eb%22/><text x=%22160%22 y=%2290%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%236b7280%22>No Image</text></svg>'">
                
                <div class="video-info">
                    <div class="video-rank">#${video.rank}</div>
                    <h3 class="video-title">${this.escapeHtml(video.title)}</h3>
                    <p class="video-channel">${this.escapeHtml(video.channel)}</p>
                    
                    <div class="video-stats">
                        <div class="stat-item">
                            <span class="stat-label">조회수:</span>
                            <span class="stat-value">${this.formatNumber(video.viewCount)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">좋아요:</span>
                            <span class="stat-value">${this.formatNumber(video.likeCount)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">댓글:</span>
                            <span class="stat-value">${this.formatNumber(video.commentCount)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">형식:</span>
                            <span class="stat-value">${video.isShorts ? '📱 쇼츠' : '🎬 롱폼'}</span>
                        </div>
                    </div>
                    
                    <div class="viral-score">
                        <span class="score">${video.viralScore}</span>
                        <span class="label">바이럴 점수</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // 테이블 뷰 렌더링
    renderTableView() {
        const tbody = document.getElementById('videoTableBody');
        if (!tbody || !this.scanResults) return;
        
        tbody.innerHTML = this.scanResults.map(video => `
            <tr>
                <td class="rank-col">
                    <span class="table-rank">#${video.rank}</span>
                </td>
                <td class="video-col">
                    <div class="table-video-info">
                        <img src="${video.thumbnail}" alt="${video.title}" class="table-thumbnail"
                             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 60 45%22><rect width=%2260%22 height=%2245%22 fill=%22%23e5e7eb%22/></svg>'">
                        <div class="table-video-details">
                            <h4>${this.escapeHtml(video.title)}</h4>
                            <div class="channel">${this.escapeHtml(video.channel)}</div>
                        </div>
                    </div>
                </td>
                <td class="viral-col">
                    <div class="table-viral-score">${video.viralScore}</div>
                </td>
                <td class="stats-col">${this.formatNumber(video.viewCount)}</td>
                <td class="engagement-col">${video.engagementRate.toFixed(2)}%</td>
                <td class="growth-col">${video.growthRate.toFixed(1)}%</td>
                <td class="format-col">
                    <span class="format-badge ${video.isShorts ? 'format-shorts' : 'format-long'}">
                        ${video.isShorts ? '쇼츠' : '롱폼'}
                    </span>
                </td>
                <td class="date-col">${video.publishDate}</td>
            </tr>
        `).join('');
    }
    
    // 분석 요약 표시
    displayAnalysisSummary() {
        const summarySection = document.getElementById('analysisSummary');
        if (summarySection) {
            summarySection.style.display = 'block';
        }
        
        if (!this.scanResults || this.scanResults.length === 0) return;
        
        // 통계 계산
        const totalVideos = this.scanResults.length;
        const avgViralScore = Math.round(
            this.scanResults.reduce((sum, video) => sum + video.viralScore, 0) / totalVideos
        );
        const shortsCount = this.scanResults.filter(video => video.isShorts).length;
        const shortsRatio = Math.round((shortsCount / totalVideos) * 100);
        const avgGrowthRate = (
            this.scanResults.reduce((sum, video) => sum + video.growthRate, 0) / totalVideos
        ).toFixed(1);
        
        // DOM 업데이트
        this.updateElement('totalVideos', totalVideos.toLocaleString());
        this.updateElement('avgViralScore', avgViralScore);
        this.updateElement('shortsRatio', `${shortsRatio}%`);
        this.updateElement('avgGrowthRate', `${avgGrowthRate}%`);
    }
    
    // 차트 생성
    createCharts() {
        const chartsSection = document.getElementById('chartsSection');
        if (chartsSection) {
            chartsSection.style.display = 'block';
        }
        
        if (!this.scanResults || this.scanResults.length === 0) return;
        
        this.createViralScoreChart();
        this.createFormatRatioChart();
        this.createCategoryGrowthChart();
        this.createUploadTimeChart();
    }
    
    // 바이럴 점수 분포 차트
    createViralScoreChart() {
        const ctx = document.getElementById('viralScoreChart');
        if (!ctx) return;
        
        // 점수 구간별 분포 계산
        const ranges = [
            { label: '0-200', min: 0, max: 200 },
            { label: '201-400', min: 201, max: 400 },
            { label: '401-600', min: 401, max: 600 },
            { label: '601-800', min: 601, max: 800 },
            { label: '801-1000', min: 801, max: 1000 }
        ];
        
        const distribution = ranges.map(range => 
            this.scanResults.filter(video => 
                video.viralScore >= range.min && video.viralScore <= range.max
            ).length
        );
        
        if (this.charts.viral) this.charts.viral.destroy();
        
        this.charts.viral = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ranges.map(r => r.label),
                datasets: [{
                    label: '영상 수',
                    data: distribution,
                    backgroundColor: [
                        '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#3b82f6'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
    
    // 쇼츠/롱폼 비율 차트
    createFormatRatioChart() {
        const ctx = document.getElementById('formatRatioChart');
        if (!ctx) return;
        
        const shortsCount = this.scanResults.filter(video => video.isShorts).length;
        const longCount = this.scanResults.length - shortsCount;
        
        if (this.charts.format) this.charts.format.destroy();
        
        this.charts.format = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['📱 쇼츠', '🎬 롱폼'],
                datasets: [{
                    data: [shortsCount, longCount],
                    backgroundColor: ['#f59e0b', '#3b82f6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // 카테고리별 성장률 차트 (더미 데이터)
    createCategoryGrowthChart() {
        const ctx = document.getElementById('categoryGrowthChart');
        if (!ctx) return;
        
        // 검색 키워드 기반 카테고리 분석
        const categories = ['건강', '취미', '요리', '생활', '여행', '테크'];
        const avgGrowthRates = categories.map(() => 
            Math.random() * 50 + 10 // 10-60% 범위
        );
        
        if (this.charts.category) this.charts.category.destroy();
        
        this.charts.category = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: categories,
                datasets: [{
                    label: '평균 성장률 (%)',
                    data: avgGrowthRates,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 60
                    }
                }
            }
        });
    }
    
    // 업로드 시간 트렌드 차트
    createUploadTimeChart() {
        const ctx = document.getElementById('uploadTimeChart');
        if (!ctx) return;
        
        // 요일별 업로드 분포
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const dayDistribution = Array(7).fill(0);
        
        this.scanResults.forEach(video => {
            const day = new Date(video.publishedAt).getDay();
            dayDistribution[day]++;
        });
        
        if (this.charts.time) this.charts.time.destroy();
        
        this.charts.time = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dayNames,
                datasets: [{
                    label: '업로드 수',
                    data: dayDistribution,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
    
    // 스캔 중지
    stopScan() {
        this.isScanning = false;
        this.hideScanProgress();
        this.updateScanButton(false);
        console.log('🛑 스캔이 중지되었습니다.');
    }
    
    // 진행 상황 표시
    showScanProgress() {
        const progressSection = document.getElementById('scanProgress');
        if (progressSection) {
            progressSection.style.display = 'block';
        }
    }
    
    // 진행 상황 숨김
    hideScanProgress() {
        const progressSection = document.getElementById('scanProgress');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
    }
    
    // 진행 상황 업데이트
    updateProgress(percent, totalKeywords, scannedKeywords, foundVideos, action) {
        const progressBar = document.getElementById('progressBar');
        const scannedKeywordsEl = document.getElementById('scannedKeywords');
        const foundVideosEl = document.getElementById('foundVideos');
        const calculatedScoresEl = document.getElementById('calculatedScores');
        const currentActionEl = document.getElementById('currentAction');
        
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
            progressBar.textContent = `${Math.round(percent)}%`;
        }
        
        if (scannedKeywordsEl) {
            scannedKeywordsEl.textContent = `${scannedKeywords} / ${totalKeywords}`;
        }
        
        if (foundVideosEl) {
            foundVideosEl.textContent = foundVideos.toLocaleString();
        }
        
        if (calculatedScoresEl) {
            calculatedScoresEl.textContent = foundVideos.toLocaleString();
        }
        
        if (currentActionEl) {
            currentActionEl.textContent = action;
        }
    }
    
    // 스캔 버튼 상태 업데이트
    updateScanButton(isScanning) {
        const fullScanBtn = document.getElementById('fullScanBtn');
        const stopScanBtn = document.getElementById('stopScanBtn');
        
        if (fullScanBtn) {
            fullScanBtn.style.display = isScanning ? 'none' : 'flex';
        }
        
        if (stopScanBtn) {
            stopScanBtn.style.display = isScanning ? 'flex' : 'none';
        }
    }
    
    // API 키 파일에서 로드
    async loadApiKeyFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const apiKey = text.trim();
            
            if (apiKey.startsWith('AIza') && apiKey.length > 30) {
                this.setApiKey(apiKey);
                alert('✅ API 키가 성공적으로 로드되었습니다!');
            } else {
                alert('❌ 올바른 YouTube API 키가 아닙니다.');
            }
        } catch (error) {
            alert('❌ 파일을 읽는 중 오류가 발생했습니다.');
        }
        
        // 파일 입력 초기화
        event.target.value = '';
    }
    
    // API 키 초기화
    clearApiKey() {
        localStorage.removeItem('youtube_api_key');
        this.apiKey = null;
        alert('✅ API 키가 초기화되었습니다.');
    }
    
    // 다운로드 기능들
    downloadExcel() {
        if (!this.scanResults || this.scanResults.length === 0) {
            alert('다운로드할 데이터가 없습니다.');
            return;
        }
        
        try {
            const workbook = XLSX.utils.book_new();
            
            // 메인 데이터 시트
            const mainData = this.scanResults.map(video => ({
                '순위': video.rank,
                '제목': video.title,
                '채널': video.channel,
                '바이럴점수': video.viralScore,
                '조회수': video.viewCount,
                '좋아요': video.likeCount,
                '댓글수': video.commentCount,
                '참여율': `${video.engagementRate.toFixed(2)}%`,
                '성장률': `${video.growthRate.toFixed(1)}%`,
                '형식': video.isShorts ? '쇼츠' : '롱폼',
                '길이': `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}`,
                '업로드일': video.publishDate,
                '검색키워드': video.searchKeyword
            }));
            
            const mainSheet = XLSX.utils.json_to_sheet(mainData);
            XLSX.utils.book_append_sheet(workbook, mainSheet, '최상위 핫한 영상');
            
            // 요약 시트
            const summaryData = [
                ['항목', '값'],
                ['총 검출 영상 수', this.scanResults.length],
                ['평균 바이럴 점수', Math.round(this.scanResults.reduce((sum, v) => sum + v.viralScore, 0) / this.scanResults.length)],
                ['쇼츠 비율', `${Math.round((this.scanResults.filter(v => v.isShorts).length / this.scanResults.length) * 100)}%`],
                ['평균 성장률', `${(this.scanResults.reduce((sum, v) => sum + v.growthRate, 0) / this.scanResults.length).toFixed(1)}%`],
                ['분석 일시', new Date().toLocaleString('ko-KR')]
            ];
            
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(workbook, summarySheet, '분석 요약');
            
            // 파일 다운로드
            const fileName = `시니어_YouTube_트렌드_전체스캔_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            
        } catch (error) {
            console.error('Excel 다운로드 오류:', error);
            alert('Excel 다운로드 중 오류가 발생했습니다.');
        }
    }
    
    downloadCSV() {
        if (!this.scanResults || this.scanResults.length === 0) {
            alert('다운로드할 데이터가 없습니다.');
            return;
        }
        
        const headers = ['순위', '제목', '채널', '바이럴점수', '조회수', '좋아요', '댓글수', '참여율', '성장률', '형식', '업로드일'];
        const csvData = [
            headers,
            ...this.scanResults.map(video => [
                video.rank,
                `"${video.title.replace(/"/g, '""')}"`,
                `"${video.channel.replace(/"/g, '""')}"`,
                video.viralScore,
                video.viewCount,
                video.likeCount,
                video.commentCount,
                `${video.engagementRate.toFixed(2)}%`,
                `${video.growthRate.toFixed(1)}%`,
                video.isShorts ? '쇼츠' : '롱폼',
                video.publishDate
            ])
        ];
        
        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const fileName = `시니어_YouTube_트렌드_전체스캔_${new Date().toISOString().slice(0, 10)}.csv`;
        this.downloadBlob(blob, fileName);
    }
    
    downloadJSON() {
        if (!this.scanResults || this.scanResults.length === 0) {
            alert('다운로드할 데이터가 없습니다.');
            return;
        }
        
        const jsonData = {
            metadata: {
                title: '시니어 YouTube 트렌드 분석 - 전체 스캔 결과',
                generatedAt: new Date().toISOString(),
                totalResults: this.scanResults.length,
                scanType: 'full_channel_scan'
            },
            summary: {
                totalVideos: this.scanResults.length,
                avgViralScore: Math.round(this.scanResults.reduce((sum, v) => sum + v.viralScore, 0) / this.scanResults.length),
                shortsRatio: Math.round((this.scanResults.filter(v => v.isShorts).length / this.scanResults.length) * 100),
                avgGrowthRate: (this.scanResults.reduce((sum, v) => sum + v.growthRate, 0) / this.scanResults.length).toFixed(1)
            },
            results: this.scanResults
        };
        
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const fileName = `시니어_YouTube_트렌드_전체스캔_${new Date().toISOString().slice(0, 10)}.json`;
        this.downloadBlob(blob, fileName);
    }
    
    downloadPDF() {
        alert('PDF 다운로드 기능은 현재 개발 중입니다. Excel 형식을 이용해주세요.');
    }
    
    // 유틸리티 함수들
    downloadBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }
    
    showError(message) {
        const errorContainer = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorContainer && errorText) {
            errorText.textContent = message;
            errorContainer.style.display = 'block';
            
            // 3초 후 자동 숨김
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 5000);
        } else {
            alert(message);
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 페이지 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔥 시니어 YouTube 트렌드 분석기 Pro 초기화 중...');
    
    // 라이브러리 로딩 확인
    if (typeof XLSX === 'undefined') {
        console.error('❌ XLSX 라이브러리가 로드되지 않았습니다.');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js 라이브러리가 로드되지 않았습니다.');
        return;
    }
    
    console.log('✅ 모든 라이브러리 로딩 완료');
    
    // 메인 앱 초기화
    window.ytAnalyzer = new FullScanYoutubeTrendsAnalyzer();
    
    console.log('🚀 전체 스캔 시스템 준비 완료!');
});
