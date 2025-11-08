/**
 * 시니어 YouTube 트렌드 분석기 Pro - API 할당량 최적화 버전
 * 할당량 초과 문제 해결을 위한 스마트 검색 시스템
 */

class OptimizedYoutubeTrendsAnalyzer {
    constructor() {
        this.apiKey = this.getApiKey();
        this.baseUrl = 'https://www.googleapis.com/youtube/v3';
        this.allVideos = [];
        this.scanResults = [];
        this.isScanning = false;
        this.charts = {};
        
        // API 할당량 관리
        this.quotaUsed = parseInt(localStorage.getItem('youtube_quota_used') || '0');
        this.quotaLimit = 10000; // 일일 할당량
        this.quotaResetTime = this.getQuotaResetTime();
        
        // 캐시 시스템
        this.cache = new Map();
        this.cacheExpiry = 2 * 60 * 60 * 1000; // 2시간
        
        // 최적화된 키워드 (우선순위별)
        this.optimizedKeywords = {
            // 1단계: 핵심 키워드 (가장 중요)
            tier1: [
                '시니어', '노인', '중년', '50대', '60대', '70대', '실버',
                '시니어 건강', '노인 운동', '중년 취미', '실버 요리'
            ],
            // 2단계: 확장 키워드 (중요)
            tier2: [
                '시니어 라이프', '노년 생활', '실버 문화', '어르신',
                '시니어 여행', '노인 건강', '중년 라이프', '실버 정보'
            ],
            // 3단계: 세부 키워드 (선택적)
            tier3: [
                '시니어 운동', '노년 취미', '실버 요리', '중년 건강',
                '시니어 테크', '노인 여행', '실버 댄스', '중년 요리'
            ]
        };
        
        // 모의 데이터 생성기 (할당량 절약용)
        this.mockDataGenerator = new MockDataGenerator();
        
        this.init();
    }
    
    // 할당량 리셋 시간 계산 (매일 자정 UTC)
    getQuotaResetTime() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(0, 0, 0, 0);
        return tomorrow.getTime();
    }
    
    // 할당량 확인 및 리셋
    checkQuotaReset() {
        const now = Date.now();
        if (now >= this.quotaResetTime) {
            this.quotaUsed = 0;
            localStorage.setItem('youtube_quota_used', '0');
            this.quotaResetTime = this.getQuotaResetTime();
            console.log('🔄 일일 할당량이 리셋되었습니다.');
        }
    }
    
    // 할당량 사용량 업데이트
    updateQuotaUsage(units) {
        this.quotaUsed += units;
        localStorage.setItem('youtube_quota_used', this.quotaUsed.toString());
        
        const remaining = this.quotaLimit - this.quotaUsed;
        console.log(`📊 API 할당량 사용: ${this.quotaUsed}/${this.quotaLimit} (남은 할당량: ${remaining})`);
        
        // 할당량 경고
        if (remaining < 1000) {
            console.warn('⚠️ API 할당량이 부족합니다. 스마트 모드로 전환합니다.');
        }
    }
    
    // 할당량 확인
    canUseQuota(requiredUnits = 100) {
        this.checkQuotaReset();
        return (this.quotaUsed + requiredUnits) <= this.quotaLimit;
    }
    
    // 캐시 키 생성
    getCacheKey(keyword, format, timeRange) {
        return `${keyword}_${format}_${timeRange}`;
    }
    
    // 캐시에서 데이터 가져오기
    getFromCache(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
            console.log(`💾 캐시에서 데이터 로드: ${cacheKey}`);
            return cached.data;
        }
        return null;
    }
    
    // 캐시에 데이터 저장
    saveToCache(cacheKey, data) {
        this.cache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });
    }
    
    // 초기화
    init() {
        console.log('🎯 API 할당량 최적화 시스템 시작');
        this.setupEventListeners();
        this.showOptimizedWelcomeMessage();
        this.displayQuotaStatus();
        
        // 키워드 선택 UI 초기화 추가
        setTimeout(() => {
            this.setupKeywordSelectionEvents();
        }, 100);
    }
    
    // API 키 확인
    getApiKey() {
        return localStorage.getItem('youtube_api_key') || null;
    }
    
    // 최적화된 웰컴 메시지
    showOptimizedWelcomeMessage() {
        console.log('🚀 API 할당량 최적화 시스템이 준비되었습니다!');
        console.log('💡 스마트 검색으로 할당량을 효율적으로 사용합니다');
        console.log('💾 캐시 시스템으로 중복 요청을 방지합니다');
    }
    
    // 할당량 상태 표시
    displayQuotaStatus() {
        this.checkQuotaReset();
        const remaining = this.quotaLimit - this.quotaUsed;
        const resetDate = new Date(this.quotaResetTime).toLocaleString('ko-KR');
        
        console.log(`📊 현재 API 할당량 상태:`);
        console.log(`   사용량: ${this.quotaUsed}/${this.quotaLimit}`);
        console.log(`   남은량: ${remaining}`);
        console.log(`   리셋: ${resetDate}`);
    }
    
    // 이벤트 리스너 설정
    setupEventListeners() {
        // 기존 이벤트 리스너들...
        const fullScanBtn = document.getElementById('fullScanBtn');
        if (fullScanBtn) {
            fullScanBtn.addEventListener('click', () => this.startOptimizedScan());
        }
        
        // 정렬 기능 이벤트 리스너 추가
        const applySortBtn = document.getElementById('applySortBtn');
        if (applySortBtn) {
            applySortBtn.addEventListener('click', () => this.applySorting());
        }
        
        // 정렬 옵션 변경시 자동 적용
        const sortBy = document.getElementById('sortBy');
        const sortOrder = document.getElementById('sortOrder');
        if (sortBy && sortOrder) {
            sortBy.addEventListener('change', () => this.applySorting());
            sortOrder.addEventListener('change', () => this.applySorting());
        }
        
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


        // 키워드 선택 관련 이벤트 리스너 추가
        this.setupKeywordSelectionEvents();
        
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
    
    // 다운로드 버튼 설정 (기존과 동일)
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
    
    // 최적화된 스캔 시작
    // 최적화된 스캔 시작
    async startOptimizedScan() {
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
            // 설정 값들 가져오기 (키워드는 선택된 것만)
            const category = document.getElementById('scanCategory')?.value || 'all';
            const format = document.getElementById('videoFormat')?.value || 'all';
            const count = parseInt(document.getElementById('resultCount')?.value || '50');
            const timeRange = document.getElementById('timeRange')?.value || 'week';
            
            // 선택된 키워드 가져오기
            const keywords = this.getSelectedKeywords();
            
            if (keywords.length === 0) {
                this.showError('검색할 키워드를 선택해주세요.');
                return;
            }
            
            console.log('🔍 최적화된 스캔 설정:', { 
                category, 
                format, 
                count, 
                timeRange, 
                selectedKeywords: keywords.length,
                keywords: keywords 
            });
            
            // 할당량 확인
            this.checkQuotaReset();
            const remaining = this.quotaLimit - this.quotaUsed;
            const estimatedCost = keywords.length * 100; // 키워드당 약 100 할당량
            
            console.log(`💰 예상 할당량 비용: ${estimatedCost} (현재 잔여: ${remaining})`);
            
            if (remaining < estimatedCost) {
                // 할당량 부족 시 스마트 모드로 전환
                console.warn('⚠️ 할당량 부족으로 스마트 모드로 전환합니다.');
                const affordableKeywords = keywords.slice(0, Math.floor(remaining / 100));
                if (affordableKeywords.length > 0) {
                    await this.runSmartMode(category, format, count, affordableKeywords);
                } else {
                    // 할당량이 전혀 없으면 모의 데이터로만 실행
                    console.warn('⚠️ 할당량 부족으로 모의 데이터로만 실행합니다.');
                    this.allVideos = this.mockDataGenerator.generateRealisticData(category, count);
                }
            } else {
                // 정상 스캔 실행
                await this.runFullScan(keywords, format, timeRange, count);
            }
            
            // 결과 후처리 및 표시
            await this.processAndDisplayResults(count);
            
            console.log('✅ 최적화된 스캔 완료!');
            
        } catch (error) {
            console.error('❌ 스캔 중 오류:', error);
            this.showError(`스캔 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            this.isScanning = false;
            this.updateScanButton(false);
            this.hideScanProgress();
        }
    }
    
    // 스마트 모드 실행 (할당량 최소 사용)
    async executeSmartMode(category, format, timeRange, count) {
        console.log('🧠 스마트 모드 실행: 핵심 키워드 + 모의 데이터');
        
        // 1단계: 핵심 키워드만 사용
        const coreKeywords = this.optimizedKeywords.tier1;
        const maxKeywords = Math.min(coreKeywords.length, Math.floor((this.quotaLimit - this.quotaUsed) / 100));
        const selectedKeywords = coreKeywords.slice(0, maxKeywords);
        
        this.updateProgress(0, selectedKeywords.length + 50, 0, 0, '스마트 모드 시작...');
        
        // 실제 API 호출 (제한적)
        const realVideos = await this.performLimitedRealScan(selectedKeywords, format, timeRange);
        
        // 모의 데이터로 보완
        const mockVideos = await this.generateSmartMockData(category, count - realVideos.length, realVideos);
        
        // 결과 병합
        this.allVideos = [...realVideos, ...mockVideos];
        
        this.updateProgress(100, selectedKeywords.length + 50, selectedKeywords.length + 50, this.allVideos.length, '스마트 모드 완료!');
    }
    
    // 하이브리드 모드 실행 (실제 + 모의 데이터)
    async executeHybridMode(category, format, timeRange, count) {
        console.log('🔄 하이브리드 모드 실행: 실제 API + 스마트 모의 데이터');
        
        // 할당량에 따라 키워드 선택
        const availableQuota = this.quotaLimit - this.quotaUsed;
        const maxApiCalls = Math.floor(availableQuota / 100) - 5; // 안전 마진
        
        let keywordsToUse = [];
        
        // 우선순위에 따라 키워드 선택
        if (maxApiCalls >= 15) {
            keywordsToUse = [...this.optimizedKeywords.tier1, ...this.optimizedKeywords.tier2.slice(0, 8)];
        } else if (maxApiCalls >= 8) {
            keywordsToUse = this.optimizedKeywords.tier1;
        } else {
            keywordsToUse = this.optimizedKeywords.tier1.slice(0, maxApiCalls);
        }
        
        console.log(`🎯 ${keywordsToUse.length}개 핵심 키워드로 실제 검색 수행`);
        
        this.updateProgress(0, keywordsToUse.length + 30, 0, 0, '하이브리드 모드 시작...');
        
        // 실제 API 호출
        const realVideos = await this.performOptimizedRealScan(keywordsToUse, format, timeRange);
        
        // 부족한 부분은 스마트 모의 데이터로 보완
        const additionalNeeded = Math.max(0, count - realVideos.length);
        const mockVideos = await this.generateSmartMockData(category, additionalNeeded, realVideos);
        
        // 결과 병합
        this.allVideos = [...realVideos, ...mockVideos];
        
        this.updateProgress(100, keywordsToUse.length + 30, keywordsToUse.length + 30, this.allVideos.length, '하이브리드 모드 완료!');
    }
    
    // 제한적 실제 스캔
    async performLimitedRealScan(keywords, format, timeRange) {
        const videos = [];
        
        for (let i = 0; i < keywords.length && this.isScanning; i++) {
            const keyword = keywords[i];
            
            // 할당량 재확인
            if (!this.canUseQuota(100)) {
                console.warn('⚠️ 할당량 부족으로 실제 검색을 중단합니다.');
                break;
            }
            
            try {
                const cacheKey = this.getCacheKey(keyword, format, timeRange);
                let keywordVideos = this.getFromCache(cacheKey);
                
                if (!keywordVideos) {
                    keywordVideos = await this.searchVideosForKeyword(keyword, format, timeRange);
                    this.saveToCache(cacheKey, keywordVideos);
                    this.updateQuotaUsage(100); // 검색 요청 비용
                    
                    // API 호출 간격
                    await this.delay(800);
                }
                
                if (keywordVideos && keywordVideos.length > 0) {
                    videos.push(...keywordVideos);
                }
                
                this.updateProgress(
                    ((i + 1) / keywords.length) * 60,
                    keywords.length,
                    i + 1,
                    videos.length,
                    `실제 검색 중: "${keyword}"`
                );
                
            } catch (error) {
                console.warn(`키워드 "${keyword}" 검색 오류:`, error);
                
                // 403 오류 시 (할당량 초과) 즉시 중단
                if (error.message.includes('403')) {
                    console.error('🚫 API 할당량 초과. 스마트 모의 데이터로 전환합니다.');
                    break;
                }
            }
        }
        
        return this.removeDuplicateVideos(videos);
    }
    
    // 최적화된 실제 스캔
    async performOptimizedRealScan(keywords, format, timeRange) {
        const videos = [];
        const batchSize = 3; // 배치 크기 감소
        
        for (let i = 0; i < keywords.length; i += batchSize) {
            if (!this.isScanning) break;
            
            const batch = keywords.slice(i, i + batchSize);
            const batchPromises = batch.map(keyword => 
                this.searchWithFallback(keyword, format, timeRange)
            );
            
            try {
                const batchResults = await Promise.all(batchPromises);
                
                for (const result of batchResults) {
                    if (result && result.length > 0) {
                        videos.push(...result);
                    }
                }
                
                this.updateProgress(
                    ((i + batch.length) / keywords.length) * 70,
                    keywords.length,
                    i + batch.length,
                    videos.length,
                    `배치 검색 중... (${i + batch.length}/${keywords.length})`
                );
                
                // 배치 간 딜레이
                await this.delay(1500);
                
            } catch (error) {
                console.warn(`배치 검색 오류:`, error);
            }
        }
        
        return this.removeDuplicateVideos(videos);
    }
    
    // 폴백이 있는 검색
    async searchWithFallback(keyword, format, timeRange) {
        // 캐시 확인
        const cacheKey = this.getCacheKey(keyword, format, timeRange);
        let cachedResult = this.getFromCache(cacheKey);
        
        if (cachedResult) {
            return cachedResult;
        }
        
        // 할당량 확인
        if (!this.canUseQuota(100)) {
            console.warn(`⚠️ 할당량 부족으로 "${keyword}" 검색을 스킵합니다.`);
            return [];
        }
        
        try {
            const result = await this.searchVideosForKeyword(keyword, format, timeRange);
            this.saveToCache(cacheKey, result);
            this.updateQuotaUsage(100);
            return result;
        } catch (error) {
            console.warn(`키워드 "${keyword}" 검색 실패, 모의 데이터로 대체:`, error);
            
            // API 오류 시 해당 키워드에 대한 모의 데이터 생성
            return this.mockDataGenerator.generateForKeyword(keyword, 5);
        }
    }
    
    // 스마트 모의 데이터 생성
    async generateSmartMockData(category, count, referenceVideos = []) {
        this.updateProgress(80, 100, 85, count, '스마트 모의 데이터 생성 중...');
        
        // 실제 데이터 패턴 분석
        const patterns = this.analyzeVideoPatterns(referenceVideos);
        
        // 패턴 기반 모의 데이터 생성
        const mockVideos = this.mockDataGenerator.generateRealisticData(category, count, patterns);
        
        // 실제 데이터와 구분 가능하도록 표시
        mockVideos.forEach(video => {
            video.isSimulated = true;
            video.title = "📊 " + video.title;
        });
        
        await this.delay(1000); // 생성 시뮬레이션
        
        return mockVideos;
    }
    
    // 비디오 패턴 분석
    analyzeVideoPatterns(videos) {
        if (videos.length === 0) {
            return {
                avgViews: 50000,
                avgLikes: 1500,
                avgComments: 100,
                avgSubscribers: 10000,
                shortsRatio: 0.4
            };
        }
        
        return {
            avgViews: videos.reduce((sum, v) => sum + v.viewCount, 0) / videos.length,
            avgLikes: videos.reduce((sum, v) => sum + v.likeCount, 0) / videos.length,
            avgComments: videos.reduce((sum, v) => sum + v.commentCount, 0) / videos.length,
            avgSubscribers: videos.reduce((sum, v) => sum + v.subscriberCount, 0) / videos.length,
            shortsRatio: videos.filter(v => v.isShorts).length / videos.length
        };
    }
    
    // 기존 YouTube API 호출 메서드들 (변경 없음)
    async searchVideosForKeyword(keyword, format, timeRange) {
        try {
            const timeFilter = this.getTimeFilter(timeRange);
            const durationFilter = this.getDurationFilter(format);
            
            const url = `${this.baseUrl}/search?` + new URLSearchParams({
                part: 'snippet',
                q: keyword,
                type: 'video',
                order: 'relevance',
                maxResults: '25', // 결과 수 감소로 할당량 절약
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
            
            // 채널 정보는 캐시 또는 추정으로 대체하여 할당량 절약
            const videos = detailsData.items.map(video => 
                this.transformVideoDataOptimized(video, keyword)
            );
            
            return videos;
            
        } catch (error) {
            console.warn(`키워드 "${keyword}" 검색 오류:`, error);
            throw error;
        }
    }
    
    // 최적화된 비디오 데이터 변환 (채널 정보 API 호출 생략)
    transformVideoDataOptimized(video, searchKeyword) {
        const stats = video.statistics || {};
        const snippet = video.snippet || {};
        const contentDetails = video.contentDetails || {};
        
        const viewCount = parseInt(stats.viewCount || '0');
        const likeCount = parseInt(stats.likeCount || '0');
        const commentCount = parseInt(stats.commentCount || '0');
        
        // 구독자 수는 조회수 기반으로 추정 (API 호출 절약)
        const estimatedSubscribers = this.estimateSubscribers(viewCount, snippet.channelTitle);
        
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
            subscriberCount: estimatedSubscribers,
            
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
            
            // 계산될 점수들
            viralScore: 0,
            engagementRate: 0,
            growthRate: 0,
            freshnessScore: 0,
            
            // 최적화 플래그
            isOptimized: true
        };
    }
    
    // 구독자 수 추정 (채널 API 호출 대신)
    estimateSubscribers(viewCount, channelTitle) {
        // 간단한 휴리스틱 기반 추정
        if (viewCount > 1000000) return Math.floor(viewCount / 20) + Math.random() * 50000;
        if (viewCount > 100000) return Math.floor(viewCount / 10) + Math.random() * 20000;
        if (viewCount > 10000) return Math.floor(viewCount / 5) + Math.random() * 10000;
        return Math.floor(viewCount / 2) + Math.random() * 5000;
    }
    
    // 기존 유틸리티 메서드들 (대부분 동일)
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
    
    getDurationFilter(format) {
        switch (format) {
            case 'shorts': return 'short';
            case 'long': return 'medium';
            default: return 'any';
        }
    }
    
    parseDuration(duration) {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        
        return hours * 3600 + minutes * 60 + seconds;
    }
    
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
    
    // 바이럴 점수 계산 (기존과 동일)
    async calculateViralScores() {
        this.updateProgress(90, this.allVideos.length, this.allVideos.length, this.allVideos.length, '바이럴 점수 계산 중...');
        
        for (let i = 0; i < this.allVideos.length; i++) {
            const video = this.allVideos[i];
            
            video.engagementRate = video.viewCount > 0 
                ? ((video.likeCount + video.commentCount) / video.viewCount) * 100 
                : 0;
            
            video.growthRate = video.subscriberCount > 0 
                ? (video.viewCount / video.subscriberCount) * 100 
                : video.viewCount / 1000;
            
            video.freshnessScore = Math.max(0, 100 - video.daysSincePublish * 2);
            video.viralScore = this.calculateComprehensiveViralScore(video);
        }
    }
    
    calculateComprehensiveViralScore(video) {
        const weights = {
            views: 0.3,
            engagement: 0.25,
            growth: 0.25,
            freshness: 0.2
        };
        
        const viewScore = Math.min(100, Math.log10(video.viewCount + 1) * 20);
        const engagementScore = Math.min(100, video.engagementRate * 20);
        const growthScore = Math.min(100, Math.log10(video.growthRate + 1) * 25);
        const freshnessScore = video.freshnessScore;
        
        const totalScore = 
            viewScore * weights.views +
            engagementScore * weights.engagement +
            growthScore * weights.growth +
            freshnessScore * weights.freshness;
        
        const shortsBonus = video.isShorts ? 10 : 0;
        const simulatedPenalty = video.isSimulated ? -50 : 0; // 모의 데이터는 낮은 점수
        
        return Math.round(Math.min(1000, Math.max(0, (totalScore * 10) + shortsBonus + simulatedPenalty)));
    }
    
    selectTopResults(count) {
        this.allVideos.sort((a, b) => b.viralScore - a.viralScore);
        const topResults = this.allVideos.slice(0, count);
        topResults.forEach((video, index) => {
            video.rank = index + 1;
        });
        return topResults;
    }
    
    // UI 관련 메서드들 (기존과 대부분 동일)
   
    
    renderCardView() {
        const container = document.getElementById('cardView');
        if (!container || !this.scanResults) return;
        
        container.innerHTML = this.scanResults.map(video => `
            <div class="video-card ${video.isSimulated ? 'simulated-data' : ''}">
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
                    
                    <div class="viral-score ${video.isSimulated ? 'simulated' : ''}">
                        <span class="score">${video.viralScore}</span>
                        <span class="label">바이럴 점수</span>
                        ${video.isSimulated ? '<small>모의 데이터</small>' : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    renderTableView() {
        const tbody = document.getElementById('videoTableBody');
        if (!tbody || !this.scanResults) return;
        
        tbody.innerHTML = this.scanResults.map(video => `
            <tr class="${video.isSimulated ? 'simulated-row' : ''}">
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
                            ${video.isSimulated ? '<small class="simulated-tag">📊 모의 데이터</small>' : ''}
                        </div>
                    </div>
                </td>
                <td class="viral-col">
                    <div class="table-viral-score ${video.isSimulated ? 'simulated' : ''}">${video.viralScore}</div>
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
    
    displayAnalysisSummary() {
        const summarySection = document.getElementById('analysisSummary');
        if (summarySection) {
            summarySection.style.display = 'block';
        }
        
        if (!this.scanResults || this.scanResults.length === 0) return;
        
        const totalVideos = this.scanResults.length;
        const avgViralScore = Math.round(
            this.scanResults.reduce((sum, video) => sum + video.viralScore, 0) / totalVideos
        );
        const shortsCount = this.scanResults.filter(video => video.isShorts).length;
        const shortsRatio = Math.round((shortsCount / totalVideos) * 100);
        const avgGrowthRate = (
            this.scanResults.reduce((sum, video) => sum + video.growthRate, 0) / totalVideos
        ).toFixed(1);
        
        this.updateElement('totalVideos', totalVideos.toLocaleString());
        this.updateElement('avgViralScore', avgViralScore);
        this.updateElement('shortsRatio', `${shortsRatio}%`);
        this.updateElement('avgGrowthRate', `${avgGrowthRate}%`);
    }
    
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
    
    createViralScoreChart() {
        const ctx = document.getElementById('viralScoreChart');
        if (!ctx) return;
        
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
    
    createCategoryGrowthChart() {
        const ctx = document.getElementById('categoryGrowthChart');
        if (!ctx) return;
        
        const categories = ['건강', '취미', '요리', '생활', '여행', '테크'];
        const avgGrowthRates = categories.map(() => 
            Math.random() * 50 + 10
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
    
    createUploadTimeChart() {
        const ctx = document.getElementById('uploadTimeChart');
        if (!ctx) return;
        
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
    
    // API 키 관련 메서드들 (기존과 동일)
    
    setApiKey(key) {
        localStorage.setItem('youtube_api_key', key);
        this.apiKey = key;
    }
    

    
    // 다운로드 메서드들 (기존과 동일)
    downloadExcel() {
        if (!this.scanResults || this.scanResults.length === 0) {
            alert('다운로드할 데이터가 없습니다.');
            return;
        }
        
        try {
            const workbook = XLSX.utils.book_new();
            
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
                '검색키워드': video.searchKeyword,
                '데이터타입': video.isSimulated ? '모의데이터' : '실제데이터'
            }));
            
            const mainSheet = XLSX.utils.json_to_sheet(mainData);
            XLSX.utils.book_append_sheet(workbook, mainSheet, '최상위 핫한 영상');
            
            const realVideos = this.scanResults.filter(v => !v.isSimulated).length;
            const mockVideos = this.scanResults.filter(v => v.isSimulated).length;
            
            const summaryData = [
                ['항목', '값'],
                ['총 검출 영상 수', this.scanResults.length],
                ['실제 데이터', realVideos],
                ['모의 데이터', mockVideos],
                ['평균 바이럴 점수', Math.round(this.scanResults.reduce((sum, v) => sum + v.viralScore, 0) / this.scanResults.length)],
                ['쇼츠 비율', `${Math.round((this.scanResults.filter(v => v.isShorts).length / this.scanResults.length) * 100)}%`],
                ['API 할당량 사용', `${this.quotaUsed}/${this.quotaLimit}`],
                ['분석 일시', new Date().toLocaleString('ko-KR')]
            ];
            
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(workbook, summarySheet, '분석 요약');
            
            const fileName = `시니어_YouTube_트렌드_최적화스캔_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
        
        const headers = ['순위', '제목', '채널', '바이럴점수', '조회수', '좋아요', '댓글수', '참여율', '성장률', '형식', '업로드일', '데이터타입'];
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
                video.publishDate,
                video.isSimulated ? '모의데이터' : '실제데이터'
            ])
        ];
        
        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const fileName = `시니어_YouTube_트렌드_최적화스캔_${new Date().toISOString().slice(0, 10)}.csv`;
        this.downloadBlob(blob, fileName);
    }
    
    downloadJSON() {
        if (!this.scanResults || this.scanResults.length === 0) {
            alert('다운로드할 데이터가 없습니다.');
            return;
        }
        
        const realVideos = this.scanResults.filter(v => !v.isSimulated).length;
        const mockVideos = this.scanResults.filter(v => v.isSimulated).length;
        
        const jsonData = {
            metadata: {
                title: '시니어 YouTube 트렌드 분석 - API 할당량 최적화 스캔 결과',
                generatedAt: new Date().toISOString(),
                totalResults: this.scanResults.length,
                scanType: 'optimized_quota_scan',
                apiQuotaUsed: `${this.quotaUsed}/${this.quotaLimit}`,
                dataComposition: {
                    realData: realVideos,
                    simulatedData: mockVideos
                }
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
        const fileName = `시니어_YouTube_트렌드_최적화스캔_${new Date().toISOString().slice(0, 10)}.json`;
        this.downloadBlob(blob, fileName);
    }
    
    downloadPDF() {
        alert('PDF 다운로드 기능은 현재 개발 중입니다. Excel 형식을 이용해주세요.');
    }
    
    // 기타 유틸리티 메서드들
    
    
    
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
    
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }
    

    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    // displayTableView 메서드 수정 (기존 메서드 대체)
    displayTableView() {
        const tableBody = document.getElementById('videoTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        this.scanResults.forEach((video, index) => {
            const row = document.createElement('tr');
            if (video.isSimulated) {
                row.classList.add('simulated-row');
            }
            
            const titleLink = this.createVideoTitleLink(video);
            const actionButton = video.isSimulated ? 
                '<button class="action-btn" onclick="alert(\'모의 데이터입니다\')" title="모의 데이터"><i class="fas fa-info"></i></button>' :
                `<a href="${this.generateYouTubeLink(video.id)}" target="_blank" class="action-btn external" title="YouTube에서 보기"><i class="fas fa-external-link-alt"></i></a>`;
            
            row.innerHTML = `
                <td class="rank-cell">
                    <span class="rank-number">${index + 1}</span>
                    ${video.isSimulated ? '<span class="simulated-tag">모의</span>' : ''}
                </td>
                <td class="video-info-cell">
                    <div class="video-title">${titleLink}</div>
                    <div class="video-channel">${video.channel}</div>
                    <div class="video-keyword">키워드: ${video.searchKeyword}</div>
                </td>
                <td class="viral-score-cell">
                    <span class="table-viral-score ${video.isSimulated ? 'simulated' : ''}">${video.viralScore}</span>
                </td>
                <td class="stats-cell">${this.formatNumber(video.viewCount)}</td>
                <td class="engagement-cell">${video.engagementRate.toFixed(1)}%</td>
                <td class="growth-cell">${video.growthRate.toFixed(1)}%</td>
                <td class="format-cell">
                    <span class="format-badge ${video.format}">${video.isShorts ? '📱 쇼츠' : '🎬 롱폼'}</span>
                </td>
                <td class="date-cell">${video.publishDate}</td>
                <td class="action-cell">${actionButton}</td>
            `;
            
            tableBody.appendChild(row);
        });
        
        console.log(`📋 테이블 뷰 업데이트 완료: ${this.scanResults.length}개 영상`);
    }
    

    // OptimizedYoutubeTrendsAnalyzer 클래스에 추가할 메서드들
    
    // 키워드 티어별 선택 메서드
    getSelectedKeywords(category, tier) {
        let keywords = [];
        
        switch (tier) {
            case 'tier1':
                keywords = this.optimizedKeywords.tier1;
                break;
            case 'tier1+2':
                keywords = [...this.optimizedKeywords.tier1, ...this.optimizedKeywords.tier2];
                break;
            case 'all':
                keywords = [...this.optimizedKeywords.tier1, ...this.optimizedKeywords.tier2, ...this.optimizedKeywords.tier3];
                break;
            default:
                keywords = this.optimizedKeywords.tier1;
        }
        
        // 카테고리별 키워드 필터링 (기존 로직과 연동)
        if (category !== 'all') {
            const categoryKeywords = this.getCategoryKeywords(category);
            keywords = keywords.filter(k => categoryKeywords.includes(k));
        }
        
        console.log(`🎯 선택된 키워드 (${tier}):`, keywords);
        return keywords;
    }
    
    // YouTube 링크 생성 메서드
    generateYouTubeLink(videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
    }
    
    // 영상 제목을 클릭 가능한 링크로 변환
    createVideoTitleLink(video) {
        if (video.isSimulated) {
            return `<span class="video-title-link simulated" onclick="alert('모의 데이터입니다. 실제 링크가 없습니다.')">${video.title}</span>`;
        } else {
            const link = this.generateYouTubeLink(video.id);
            return `<a href="${link}" target="_blank" class="video-title-link" title="YouTube에서 보기">${video.title}</a>`;
        }
    }
    
    // 정렬 적용 메서드
    applySorting() {
        if (!this.scanResults || this.scanResults.length === 0) {
            console.log('정렬할 데이터가 없습니다.');
            return;
        }
        
        const sortBy = document.getElementById('sortBy')?.value || 'viralScore';
        const sortOrder = document.getElementById('sortOrder')?.value || 'desc';
        
        console.log(`📊 정렬 적용: ${sortBy} (${sortOrder})`);
        
        // 정렬 실행
        this.scanResults.sort((a, b) => {
            let valueA = this.getSortValue(a, sortBy);
            let valueB = this.getSortValue(b, sortBy);
            
            // 숫자 비교
            if (typeof valueA === 'number' && typeof valueB === 'number') {
                return sortOrder === 'desc' ? valueB - valueA : valueA - valueB;
            }
            
            // 문자열 비교
            if (typeof valueA === 'string' && typeof valueB === 'string') {
                return sortOrder === 'desc' ? valueB.localeCompare(valueA) : valueA.localeCompare(valueB);
            }
            
            // 날짜 비교
            if (sortBy === 'publishedAt') {
                const dateA = new Date(valueA);
                const dateB = new Date(valueB);
                return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
            }
            
            return 0;
        });
        
        // 결과 다시 표시
        this.displayResults();
        this.updateSummaryCards();
        
        console.log(`✅ 정렬 완료: ${this.scanResults.length}개 영상 재정렬`);
    }
    
    // 정렬값 추출 메서드
    getSortValue(video, sortBy) {
        switch (sortBy) {
            case 'viralScore':
                return video.viralScore || 0;
            case 'viewCount':
                return video.viewCount || 0;
            case 'subscriberCount':
                return video.subscriberCount || 0;
            case 'engagementRate':
                return video.engagementRate || 0;
            case 'growthRate':
                return video.growthRate || 0;
            case 'publishedAt':
                return video.publishedAt || new Date().toISOString();
            default:
                return 0;
        }
    }
    
    // startOptimizedScan 메서드 수정 (키워드 티어 반영)
    async startOptimizedScan() {
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
            // 설정 값들 가져오기 (키워드 티어 추가)
            const category = document.getElementById('scanCategory')?.value || 'all';
            const format = document.getElementById('videoFormat')?.value || 'all';
            const count = parseInt(document.getElementById('resultCount')?.value || '50');
            const timeRange = document.getElementById('timeRange')?.value || 'week';
            const keywordTier = document.getElementById('keywordTier')?.value || 'tier1';
            
            console.log('🔍 최적화된 스캔 설정:', { category, format, count, timeRange, keywordTier });
            
            // 선택된 티어에 따른 키워드 가져오기
            const keywords = this.getSelectedKeywords(category, keywordTier);
            
            // 할당량 확인
            this.checkQuotaReset();
            const remaining = this.quotaLimit - this.quotaUsed;
            const estimatedCost = keywords.length * 100; // 키워드당 약 100 할당량
            
            console.log(`💰 예상 할당량 비용: ${estimatedCost} (현재 잔여: ${remaining})`);
            
            if (remaining < estimatedCost) {
                // 할당량 부족 시 스마트 모드로 전환
                console.warn('⚠️ 할당량 부족으로 스마트 모드로 전환합니다.');
                await this.runSmartMode(category, format, count, keywords.slice(0, Math.floor(remaining / 100)));
            } else {
                // 정상 스캔 실행
                await this.runFullScan(keywords, format, timeRange, count);
            }
            
        } catch (error) {
            console.error('❌ 스캔 중 오류:', error);
            this.showError(`스캔 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            this.isScanning = false;
            this.updateScanButton(false);
            this.hideScanProgress();
        }
    }


    // runFullScan 메서드 추가 (클래스 내부에)
    async runFullScan(keywords, format, timeRange, count) {
        console.log('🚀 전체 스캔 시작:', { keywords: keywords.length, format, timeRange, count });
        
        const totalKeywords = keywords.length;
        let processedKeywords = 0;
        let foundVideos = 0;
        
        for (const keyword of keywords) {
            if (!this.isScanning) break; // 중지 버튼 체크
            
            try {
                console.log(`🔍 키워드 검색 중: ${keyword}`);
                
                // 캐시 확인
                const cacheKey = this.getCacheKey(keyword, format, timeRange);
                let videos = this.getFromCache(cacheKey);
                
                if (!videos) {
                    // API 호출
                    if (this.canUseQuota(100)) {
                        videos = await this.searchVideosForKeyword(keyword, format, timeRange);
                        this.updateQuotaUsage(100);
                        this.saveToCache(cacheKey, videos);
                    } else {
                        console.warn(`⚠️ 할당량 부족으로 ${keyword} 스킵`);
                        continue;
                    }
                }
                
                if (videos && videos.length > 0) {
                    this.allVideos.push(...videos);
                    foundVideos += videos.length;
                }
                
                processedKeywords++;
                
                // 진행 상황 업데이트
                this.updateScanProgress(processedKeywords, totalKeywords, foundVideos);
                
                // API 요청 간 지연
                await this.delay(500);
                
            } catch (error) {
                console.error(`❌ 키워드 ${keyword} 검색 실패:`, error);
            }
        }
        
        // 바이럴 점수 계산 및 결과 정리
        await this.processAndDisplayResults(count);
    }
    
    // runSmartMode 메서드 추가
    async runSmartMode(category, format, count, limitedKeywords) {
        console.log('🧠 스마트 모드 실행:', { category, format, count, keywords: limitedKeywords.length });
        
        // 제한된 키워드로만 검색
        const totalKeywords = limitedKeywords.length;
        let processedKeywords = 0;
        let foundVideos = 0;
        
        for (const keyword of limitedKeywords) {
            if (!this.isScanning) break;
            
            try {
                console.log(`🔍 스마트 검색: ${keyword}`);
                
                const cacheKey = this.getCacheKey(keyword, format, 'week');
                let videos = this.getFromCache(cacheKey);
                
                if (!videos) {
                    if (this.canUseQuota(100)) {
                        videos = await this.searchVideosForKeyword(keyword, format, 'week');
                        this.updateQuotaUsage(100);
                        this.saveToCache(cacheKey, videos);
                    } else {
                        break; // 할당량 부족시 중단
                    }
                }
                
                if (videos && videos.length > 0) {
                    this.allVideos.push(...videos);
                    foundVideos += videos.length;
                }
                
                processedKeywords++;
                this.updateScanProgress(processedKeywords, totalKeywords, foundVideos);
                
                await this.delay(300);
                
            } catch (error) {
                console.error(`❌ 스마트 모드 검색 실패:`, error);
            }
        }
        
        // 부족한 데이터는 모의 데이터로 보충
        const remainingCount = Math.max(0, count - this.allVideos.length);
        if (remainingCount > 0) {
            console.log(`📊 모의 데이터 ${remainingCount}개 생성`);
            const mockVideos = this.mockDataGenerator.generateRealisticData(category, remainingCount);
            this.allVideos.push(...mockVideos);
        }
        
        await this.processAndDisplayResults(count);
    }
    
    // searchVideosForKeyword 메서드 추가 (실제 API 호출)
    async searchVideosForKeyword(keyword, format, timeRange) {
        const videos = [];
        
        try {
            const publishedAfter = this.getPublishedAfterDate(timeRange);
            const url = `${this.baseUrl}/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&order=relevance&publishedAfter=${publishedAfter}&maxResults=50&key=${this.apiKey}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message);
            }
            
            if (data.items) {
                for (const item of data.items) {
                    const video = await this.enrichVideoData(item, keyword);
                    if (video && this.matchesFormat(video, format)) {
                        videos.push(video);
                    }
                }
            }
            
        } catch (error) {
            console.error(`❌ API 검색 실패 (${keyword}):`, error);
        }
        
        return videos;
    }
    
    // enrichVideoData 메서드 추가
    async enrichVideoData(item, searchKeyword) {
        try {
            // 비디오 상세 정보 가져오기
            const detailUrl = `${this.baseUrl}/videos?part=statistics,contentDetails&id=${item.id.videoId}&key=${this.apiKey}`;
            const detailResponse = await fetch(detailUrl);
            const detailData = await detailResponse.json();
            
            if (detailData.items && detailData.items.length > 0) {
                const videoDetail = detailData.items[0];
                const statistics = videoDetail.statistics;
                const contentDetails = videoDetail.contentDetails;
                
                // 채널 정보 가져오기
                const channelUrl = `${this.baseUrl}/channels?part=statistics&id=${item.snippet.channelId}&key=${this.apiKey}`;
                const channelResponse = await fetch(channelUrl);
                const channelData = await channelResponse.json();
                
                let subscriberCount = 0;
                if (channelData.items && channelData.items.length > 0) {
                    subscriberCount = parseInt(channelData.items[0].statistics.subscriberCount) || 0;
                }
                
                const duration = this.parseDuration(contentDetails.duration);
                const isShorts = duration <= 60;
                
                return {
                    id: item.id.videoId,
                    title: item.snippet.title,
                    channel: item.snippet.channelTitle,
                    channelId: item.snippet.channelId,
                    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
                    description: item.snippet.description,
                    
                    viewCount: parseInt(statistics.viewCount) || 0,
                    likeCount: parseInt(statistics.likeCount) || 0,
                    commentCount: parseInt(statistics.commentCount) || 0,
                    subscriberCount: subscriberCount,
                    
                    duration: duration,
                    isShorts: isShorts,
                    format: isShorts ? 'shorts' : 'long',
                    
                    publishedAt: item.snippet.publishedAt,
                    publishDate: new Date(item.snippet.publishedAt).toLocaleDateString('ko-KR'),
                    daysSincePublish: Math.floor((Date.now() - new Date(item.snippet.publishedAt)) / (1000 * 60 * 60 * 24)),
                    
                    searchKeyword: searchKeyword,
                    
                    viralScore: 0,
                    engagementRate: 0,
                    growthRate: 0,
                    freshnessScore: 0,
                    
                    isSimulated: false
                };
            }
        } catch (error) {
            console.error('❌ 비디오 상세 정보 가져오기 실패:', error);
        }
        
        return null;
    }
    
    // 헬퍼 메서드들 추가
    getPublishedAfterDate(timeRange) {
        const now = new Date();
        switch (timeRange) {
            case 'week':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            case 'month':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            case '3months':
                return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
            default:
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        }
    }
    
    parseDuration(duration) {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        const seconds = parseInt(match[3]) || 0;
        return hours * 3600 + minutes * 60 + seconds;
    }
    
    matchesFormat(video, format) {
        if (format === 'all') return true;
        if (format === 'shorts') return video.isShorts;
        if (format === 'long') return !video.isShorts;
        return true;
    }
    
    processAndDisplayResults(maxCount) {
        // 중복 제거
        const uniqueVideos = this.removeDuplicates(this.allVideos);
        
        // 바이럴 점수 계산
        uniqueVideos.forEach(video => {
            this.calculateViralScore(video);
        });
        
        // 정렬 및 제한
        this.scanResults = uniqueVideos
            .sort((a, b) => b.viralScore - a.viralScore)
            .slice(0, maxCount);
        
        // 결과 표시
        this.displayResults();
        this.updateSummaryCards();
        this.showResultsSections();
    }


    // 키워드 선택 UI 초기화 및 이벤트 설정
    setupKeywordSelectionEvents() {
        // 키워드 체크박스 렌더링
        this.renderKeywordCheckboxes();
        
        // 전체 선택/해제 버튼
        const selectAllBtn = document.getElementById('selectAllKeywords');
        const deselectAllBtn = document.getElementById('deselectAllKeywords');
        const selectTier1Btn = document.getElementById('selectTier1Only');
        
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.selectAllKeywords());
        }
        
        if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => this.deselectAllKeywords());
        }
        
        if (selectTier1Btn) {
            selectTier1Btn.addEventListener('click', () => this.selectTier1Only());
        }
        
        // 티어별 토글 버튼
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tier-toggle')) {
                const tier = e.target.dataset.tier;
                this.toggleTierSelection(tier);
            }
        });
        
        // 키워드 체크박스 변경 이벤트
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('keyword-checkbox')) {
                this.updateKeywordSelection();
                this.updateApiCostEstimate();
            }
        });
        
        // 키워드 아이템 클릭 이벤트
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('keyword-item') || e.target.classList.contains('keyword-label')) {
                const item = e.target.classList.contains('keyword-item') ? e.target : e.target.closest('.keyword-item');
                const checkbox = item.querySelector('.keyword-checkbox');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this.updateKeywordSelection();
                    this.updateApiCostEstimate();
                }
            }
        });
    }
    
    // 키워드 체크박스 렌더링
    renderKeywordCheckboxes() {
        const tiers = ['tier1', 'tier2', 'tier3'];
        
        tiers.forEach(tier => {
            const container = document.getElementById(`${tier}Keywords`);
            if (!container) return;
            
            const keywords = this.optimizedKeywords[tier];
            container.innerHTML = '';
            
            keywords.forEach((keyword, index) => {
                const isDefaultSelected = tier === 'tier1'; // Tier1은 기본 선택
                
                const keywordItem = document.createElement('div');
                keywordItem.className = `keyword-item ${isDefaultSelected ? 'selected' : ''}`;
                
                keywordItem.innerHTML = `
                    <input type="checkbox" 
                           class="keyword-checkbox" 
                           id="${tier}_${index}" 
                           value="${keyword}"
                           data-tier="${tier}"
                           ${isDefaultSelected ? 'checked' : ''}>
                    <label for="${tier}_${index}" class="keyword-label">${keyword}</label>
                    <span class="keyword-cost">~100</span>
                `;
                
                container.appendChild(keywordItem);
            });
        });
        
        // 초기 상태 업데이트
        this.updateKeywordSelection();
        this.updateApiCostEstimate();
    }
    
    // 전체 키워드 선택
    selectAllKeywords() {
        const checkboxes = document.querySelectorAll('.keyword-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            checkbox.closest('.keyword-item').classList.add('selected');
        });
        this.updateKeywordSelection();
        this.updateApiCostEstimate();
    }
    
    // 전체 키워드 해제
    deselectAllKeywords() {
        const checkboxes = document.querySelectorAll('.keyword-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.closest('.keyword-item').classList.remove('selected');
        });
        this.updateKeywordSelection();
        this.updateApiCostEstimate();
    }
    
    // Tier1만 선택
    selectTier1Only() {
        this.deselectAllKeywords();
        
        const tier1Checkboxes = document.querySelectorAll('.keyword-checkbox[data-tier="tier1"]');
        tier1Checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            checkbox.closest('.keyword-item').classList.add('selected');
        });
        
        this.updateKeywordSelection();
        this.updateApiCostEstimate();
    }
    
    // 티어별 토글
    toggleTierSelection(tier) {
        const tierCheckboxes = document.querySelectorAll(`.keyword-checkbox[data-tier="${tier}"]`);
        const toggleBtn = document.querySelector(`.tier-toggle[data-tier="${tier}"]`);
        
        // 현재 티어의 선택 상태 확인
        const checkedCount = Array.from(tierCheckboxes).filter(cb => cb.checked).length;
        const shouldSelectAll = checkedCount < tierCheckboxes.length;
        
        // 토글 실행
        tierCheckboxes.forEach(checkbox => {
            checkbox.checked = shouldSelectAll;
            const item = checkbox.closest('.keyword-item');
            if (shouldSelectAll) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        // 버튼 상태 업데이트
        if (shouldSelectAll) {
            toggleBtn.classList.add('all-selected');
            toggleBtn.innerHTML = '<i class="fas fa-check-square"></i> 전체 해제';
        } else {
            toggleBtn.classList.remove('all-selected');
            toggleBtn.innerHTML = '<i class="fas fa-square"></i> 전체 선택';
        }
        
        this.updateKeywordSelection();
        this.updateApiCostEstimate();
    }
    
    // 키워드 선택 상태 업데이트
    updateKeywordSelection() {
        const selectedCheckboxes = document.querySelectorAll('.keyword-checkbox:checked');
        const selectedCount = selectedCheckboxes.length;
        
        // 선택 카운트 업데이트
        const countElement = document.getElementById('selectedKeywordCount');
        if (countElement) {
            countElement.textContent = selectedCount;
        }
        
        // 키워드 아이템 시각적 상태 업데이트
        document.querySelectorAll('.keyword-checkbox').forEach(checkbox => {
            const item = checkbox.closest('.keyword-item');
            if (checkbox.checked) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        // 티어별 토글 버튼 상태 업데이트
        ['tier1', 'tier2', 'tier3'].forEach(tier => {
            const tierCheckboxes = document.querySelectorAll(`.keyword-checkbox[data-tier="${tier}"]`);
            const checkedCount = Array.from(tierCheckboxes).filter(cb => cb.checked).length;
            const toggleBtn = document.querySelector(`.tier-toggle[data-tier="${tier}"]`);
            
            if (toggleBtn) {
                if (checkedCount === tierCheckboxes.length && tierCheckboxes.length > 0) {
                    toggleBtn.classList.add('all-selected');
                    toggleBtn.innerHTML = '<i class="fas fa-check-square"></i> 전체 해제';
                } else {
                    toggleBtn.classList.remove('all-selected');
                    toggleBtn.innerHTML = '<i class="fas fa-square"></i> 전체 선택';
                }
            }
        });
    }
    
    // API 비용 예상 업데이트
    updateApiCostEstimate() {
        const selectedCheckboxes = document.querySelectorAll('.keyword-checkbox:checked');
        const estimatedCost = selectedCheckboxes.length * 100; // 키워드당 약 100 할당량
        
        const costElement = document.getElementById('estimatedCost');
        const warningElement = document.getElementById('costWarning');
        
        if (costElement) {
            costElement.textContent = estimatedCost.toLocaleString();
        }
        
        if (warningElement) {
            const remaining = this.quotaLimit - this.quotaUsed;
            if (estimatedCost > remaining) {
                warningElement.style.display = 'block';
                warningElement.textContent = `⚠️ 예상 비용(${estimatedCost})이 잔여 할당량(${remaining})을 초과합니다.`;
            } else {
                warningElement.style.display = 'none';
            }
        }
    }
    
    // 선택된 키워드 가져오기 (기존 메서드 수정)
    getSelectedKeywords() {
        const selectedCheckboxes = document.querySelectorAll('.keyword-checkbox:checked');
        const keywords = Array.from(selectedCheckboxes).map(checkbox => checkbox.value);
        
        console.log(`🎯 선택된 키워드 (${keywords.length}개):`, keywords);
        
        if (keywords.length === 0) {
            console.warn('⚠️ 선택된 키워드가 없습니다. Tier1 키워드를 기본 사용합니다.');
            return this.optimizedKeywords.tier1;
        }
        
        return keywords;
    }


// ===== 누락된 핵심 메서드들 추가 =====
    
    // 스캔 진행 상황 업데이트
    updateScanProgress(processedKeywords, totalKeywords, foundVideos) {
        const scannedKeywordsElement = document.getElementById('scannedKeywords');
        const foundVideosElement = document.getElementById('foundVideos');
        const calculatedScoresElement = document.getElementById('calculatedScores');
        const progressBar = document.querySelector('.progress-bar');
        
        if (scannedKeywordsElement) {
            scannedKeywordsElement.textContent = `${processedKeywords} / ${totalKeywords}`;
        }
        
        if (foundVideosElement) {
            foundVideosElement.textContent = foundVideos;
        }
        
        if (calculatedScoresElement) {
            calculatedScoresElement.textContent = processedKeywords;
        }
        
        if (progressBar) {
            const progress = (processedKeywords / totalKeywords) * 100;
            progressBar.style.width = `${progress}%`;
        }
        
        console.log(`📊 진행률: ${processedKeywords}/${totalKeywords} (${((processedKeywords/totalKeywords)*100).toFixed(1)}%)`);
    }
    
    // 중복 제거 메서드
    removeDuplicates(videos) {
        const uniqueVideos = [];
        const seenIds = new Set();
        
        for (const video of videos) {
            if (!seenIds.has(video.id)) {
                seenIds.add(video.id);
                uniqueVideos.push(video);
            }
        }
        
        console.log(`🔄 중복 제거: ${videos.length} → ${uniqueVideos.length}`);
        return uniqueVideos;
    }
    
    // 바이럴 점수 계산
    calculateViralScore(video) {
        // 조회수 점수 (0-30점)
        const viewScore = Math.min((video.viewCount / 100000) * 30, 30);
        
        // 참여율 점수 (0-25점)
        const totalEngagement = video.likeCount + video.commentCount;
        const engagementRate = (totalEngagement / video.viewCount) * 100;
        video.engagementRate = engagementRate;
        const engagementScore = Math.min(engagementRate * 5, 25);
        
        // 성장률 점수 (0-25점)
        const growthRate = (video.viewCount / Math.max(video.subscriberCount, 1000)) * 100;
        video.growthRate = growthRate;
        const growthScore = Math.min(growthRate * 0.5, 25);
        
        // 최신성 점수 (0-20점)
        const daysSincePublish = video.daysSincePublish || 1;
        const freshnessScore = Math.max(20 - (daysSincePublish * 2), 0);
        video.freshnessScore = freshnessScore;
        
        // 쇼츠 보너스
        const formatBonus = video.isShorts ? 10 : 0;
        
        // 최종 바이럴 점수 (0-1000점)
        video.viralScore = Math.round((viewScore + engagementScore + growthScore + freshnessScore) * 10 + formatBonus);
        
        return video.viralScore;
    }
    
    // 숫자 포맷팅
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    // 스캔 진행 상황 표시
    showScanProgress() {
        const scanProgress = document.getElementById('scanProgress');
        if (scanProgress) {
            scanProgress.style.display = 'block';
        }
    }
    
    // 스캔 진행 상황 숨기기
    hideScanProgress() {
        const scanProgress = document.getElementById('scanProgress');
        if (scanProgress) {
            scanProgress.style.display = 'none';
        }
    }
    
    // 스캔 버튼 상태 업데이트
    updateScanButton(isScanning) {
        const fullScanBtn = document.getElementById('fullScanBtn');
        const stopScanBtn = document.getElementById('stopScanBtn');
        
        if (fullScanBtn) {
            if (isScanning) {
                fullScanBtn.style.display = 'none';
            } else {
                fullScanBtn.style.display = 'inline-flex';
            }
        }
        
        if (stopScanBtn) {
            if (isScanning) {
                stopScanBtn.style.display = 'inline-flex';
            } else {
                stopScanBtn.style.display = 'none';
            }
        }
    }
    
    // 뷰 전환
    switchView(viewType) {
        const cardView = document.getElementById('cardView');
        const tableView = document.getElementById('tableView');
        const cardViewBtn = document.getElementById('cardViewBtn');
        const tableViewBtn = document.getElementById('tableViewBtn');
        
        if (viewType === 'card') {
            if (cardView) cardView.style.display = 'grid';
            if (tableView) tableView.style.display = 'none';
            if (cardViewBtn) cardViewBtn.classList.add('active');
            if (tableViewBtn) tableViewBtn.classList.remove('active');
        } else if (viewType === 'table') {
            if (cardView) cardView.style.display = 'none';
            if (tableView) tableView.style.display = 'block';
            if (cardViewBtn) cardViewBtn.classList.remove('active');
            if (tableViewBtn) tableViewBtn.classList.add('active');
            
            // 테이블 뷰 업데이트
            this.displayTableView();
        }
    }
    
    // 결과 표시
    displayResults() {
        this.displayCardView();
        this.displayTableView();
    }
    
    // 카드 뷰 표시
    displayCardView() {
        const cardContainer = document.getElementById('cardView');
        if (!cardContainer) return;
        
        cardContainer.innerHTML = '';
        
        this.scanResults.forEach((video, index) => {
            const card = document.createElement('div');
            card.className = `video-card ${video.isSimulated ? 'simulated-data' : ''}`;
            
            const titleLink = this.createVideoTitleLink(video);
            
            card.innerHTML = `
                <div class="video-rank">#${index + 1}</div>
                <div class="video-thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
                    <div class="video-duration">${this.formatDuration(video.duration)}</div>
                </div>
                <div class="video-info">
                    <h3 class="video-title">${titleLink}</h3>
                    <p class="video-channel">${video.channel}</p>
                    <div class="video-stats">
                        <span>👁️ ${this.formatNumber(video.viewCount)}</span>
                        <span>👍 ${this.formatNumber(video.likeCount)}</span>
                        <span>💬 ${this.formatNumber(video.commentCount)}</span>
                    </div>
                    <div class="video-meta">
                        <span class="publish-date">📅 ${video.publishDate}</span>
                        <span class="keyword-tag">🏷️ ${video.searchKeyword}</span>
                    </div>
                </div>
                <div class="viral-score ${video.isSimulated ? 'simulated' : ''}">${video.viralScore}</div>
            `;
            
            cardContainer.appendChild(card);
        });
    }
    
    // 요약 카드 업데이트
    updateSummaryCards() {
        const totalVideos = this.scanResults.length;
        const avgViralScore = totalVideos > 0 ? 
            Math.round(this.scanResults.reduce((sum, v) => sum + v.viralScore, 0) / totalVideos) : 0;
        const shortsCount = this.scanResults.filter(v => v.isShorts).length;
        const shortsRatio = totalVideos > 0 ? Math.round((shortsCount / totalVideos) * 100) : 0;
        const avgGrowthRate = totalVideos > 0 ? 
            (this.scanResults.reduce((sum, v) => sum + v.growthRate, 0) / totalVideos).toFixed(1) : 0;
        
        const totalVideosEl = document.getElementById('totalVideos');
        const avgViralScoreEl = document.getElementById('avgViralScore');
        const shortsRatioEl = document.getElementById('shortsRatio');
        const avgGrowthRateEl = document.getElementById('avgGrowthRate');
        
        if (totalVideosEl) totalVideosEl.textContent = totalVideos;
        if (avgViralScoreEl) avgViralScoreEl.textContent = avgViralScore;
        if (shortsRatioEl) shortsRatioEl.textContent = `${shortsRatio}%`;
        if (avgGrowthRateEl) avgGrowthRateEl.textContent = `${avgGrowthRate}%`;
    }
    
    // 결과 섹션 표시
    showResultsSections() {
        const resultsSection = document.getElementById('resultsSection');
        const downloadSection = document.getElementById('downloadSection');
        const chartsSection = document.getElementById('chartsSection');
        
        if (resultsSection) resultsSection.style.display = 'block';
        if (downloadSection) downloadSection.style.display = 'block';
        if (chartsSection) chartsSection.style.display = 'block';
    }
    
    // 지속시간 포맷팅
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
    
    // 에러 메시지 표시
    showError(message) {
        const errorContainer = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (errorContainer && errorText) {
            errorText.textContent = message;
            errorContainer.style.display = 'block';
            
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, 5000);
        } else {
            alert(message);
        }
    }
    
    // API 키 파일에서 로드
    async loadApiKeyFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const apiKey = text.trim();
            
            if (apiKey) {
                localStorage.setItem('youtube_api_key', apiKey);
                this.apiKey = apiKey;
                console.log('✅ API 키가 성공적으로 로드되었습니다.');
                this.showError('API 키가 성공적으로 설정되었습니다.');
            }
        } catch (error) {
            console.error('❌ API 키 로드 실패:', error);
            this.showError('API 키 파일을 읽을 수 없습니다.');
        }
    }
    
    // API 키 초기화 x
    clearApiKey() {
        localStorage.removeItem('youtube_api_key');
        this.apiKey = null;
        console.log('🔄 API 키가 초기화되었습니다.');
        this.showError('API 키가 초기화되었습니다.');
    }
    
    // 스캔 중지
    stopScan() {
        this.isScanning = false;
        console.log('⏹️ 스캔이 중지되었습니다.');
        this.updateScanButton(false);
        this.hideScanProgress();
    }
    
    
    
    
    
  
}  // ★★★★★ Class 모듈 끝 부분 ★★★★★

// 모의 데이터 생성기 클래스
class MockDataGenerator {
    constructor() {
        this.videoTemplates = {
            health: {
                titles: [
                    "60대도 쉽게 따라하는 무릎 건강 운동 5가지",
                    "시니어를 위한 혈압 낮추는 생활습관",
                    "중년 이후 반드시 알아야 할 건강 관리법",
                    "실버 요가로 관절 건강 지키기",
                    "70대도 할 수 있는 홈트레이닝",
                    "당뇨 예방하는 시니어 식단과 운동",
                    "치매 예방을 위한 두뇌 운동법",
                    "시니어를 위한 척추 건강 스트레칭"
                ],
                channels: ["실버헬스TV", "건강한노년", "시니어웰빙", "실버운동방", "헬시에이징"]
            },
            hobby: {
                titles: [
                    "60대에 시작하는 서예, 마음이 편해지는 시간",
                    "시니어 합창단, 함께 부르는 추억의 노래",
                    "정원 가꾸기로 즐기는 시니어 라이프",
                    "뜨개질로 만드는 손자 손녀 선물",
                    "실버 댄스로 건강하고 즐겁게",
                    "시니어를 위한 사진 취미 시작하기"
                ],
                channels: ["실버문화센터", "시니어취미방", "중년의품격", "실버아트"]
            },
            cooking: {
                titles: [
                    "50대 이후 건강한 식단 한 주 레시피",
                    "당뇨 환자를 위한 맛있는 저당 요리",
                    "혈압에 좋은 나트륨 줄인 김치 담그기",
                    "중년 다이어트를 위한 든든한 한 끼",
                    "시니어를 위한 영양 만점 간식 만들기"
                ],
                channels: ["건강한실버요리", "시니어쿠킹", "웰빙레시피", "실버키친"]
            },
            life: {
                titles: [
                    "시니어를 위한 연금 수령 완전 가이드",
                    "은퇴 후 재정 관리 노하우",
                    "실버타운 선택 시 체크포인트",
                    "시니어를 위한 보험 정리법",
                    "노후 준비 체크리스트"
                ],
                channels: ["실버라이프코치", "시니어정보방", "노후설계전문가"]
            },
            travel: {
                titles: [
                    "시니어 추천 국내 여행지 BEST 10",
                    "60대 부모님과 함께하는 제주도 3박4일",
                    "실버세대를 위한 유럽 패키지여행 후기",
                    "중년 부부 캠핑 첫 도전기"
                ],
                channels: ["시니어트래블", "실버여행가", "중년여행클럽"]
            },
            tech: {
                titles: [
                    "시니어를 위한 카카오톡 완전정복 가이드",
                    "스마트폰 기초부터 고급기능까지",
                    "AI 시대, 시니어도 할 수 있는 디지털 활용법",
                    "온라인 쇼핑 안전하게 하는 방법"
                ],
                channels: ["디지털시니어", "스마트실버", "시니어IT교육"]
            }
        };
    }
    
    generateForKeyword(keyword, count) {
        const videos = [];
        const category = this.getKeywordCategory(keyword);
        const template = this.videoTemplates[category] || this.videoTemplates.health;
        
        for (let i = 0; i < count; i++) {
            videos.push(this.generateRealisticVideo(template, keyword, category));
        }
        
        return videos;
    }
    
    generateRealisticData(category, count, patterns) {
        const videos = [];
        const template = this.videoTemplates[category] || this.videoTemplates.health;
        
        for (let i = 0; i < count; i++) {
            videos.push(this.generateRealisticVideoWithPatterns(template, category, patterns));
        }
        
        return videos;
    }
    
    getKeywordCategory(keyword) {
        if (keyword.includes('건강') || keyword.includes('운동') || keyword.includes('의료')) return 'health';
        if (keyword.includes('취미') || keyword.includes('여가') || keyword.includes('문화')) return 'hobby';
        if (keyword.includes('요리') || keyword.includes('레시피') || keyword.includes('음식')) return 'cooking';
        if (keyword.includes('생활') || keyword.includes('정보') || keyword.includes('팁')) return 'life';
        if (keyword.includes('여행') || keyword.includes('관광') || keyword.includes('캠핑')) return 'travel';
        if (keyword.includes('테크') || keyword.includes('디지털') || keyword.includes('스마트')) return 'tech';
        return 'health';
    }
    
    generateRealisticVideo(template, searchKeyword, category) {
        const title = template.titles[Math.floor(Math.random() * template.titles.length)];
        const channel = template.channels[Math.floor(Math.random() * template.channels.length)];
        
        const viewCount = this.generateRealisticViews();
        const likeCount = Math.floor(viewCount * (0.02 + Math.random() * 0.03));
        const commentCount = Math.floor(viewCount * (0.005 + Math.random() * 0.01));
        const subscriberCount = Math.floor(viewCount * (0.1 + Math.random() * 0.5));
        
        const isShorts = Math.random() < 0.4;
        const duration = isShorts ? Math.floor(Math.random() * 60) + 15 : Math.floor(Math.random() * 600) + 120;
        
        const daysAgo = Math.floor(Math.random() * 7) + 1;
        const publishedAt = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000));
        
        return {
            id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: title,
            channel: channel,
            channelId: `mock_channel_${Math.random().toString(36).substr(2, 9)}`,
            thumbnail: `https://img.youtube.com/vi/mock_thumbnail/hqdefault.jpg`,
            description: `${title}에 대한 자세한 내용입니다.`,
            
            viewCount,
            likeCount,
            commentCount,
            subscriberCount,
            
            duration,
            isShorts,
            format: isShorts ? 'shorts' : 'long',
            
            publishedAt: publishedAt.toISOString(),
            publishDate: publishedAt.toLocaleDateString('ko-KR'),
            daysSincePublish: daysAgo,
            
            searchKeyword,
            
            viralScore: 0,
            engagementRate: 0,
            growthRate: 0,
            freshnessScore: 0,
            
            isSimulated: true
        };
    }
    
    generateRealisticVideoWithPatterns(template, category, patterns) {
        const video = this.generateRealisticVideo(template, '시니어', category);
        
        // 패턴 기반 조정
        if (patterns) {
            video.viewCount = Math.floor(patterns.avgViews * (0.5 + Math.random()));
            video.likeCount = Math.floor(patterns.avgLikes * (0.5 + Math.random()));
            video.commentCount = Math.floor(patterns.avgComments * (0.5 + Math.random()));
            video.subscriberCount = Math.floor(patterns.avgSubscribers * (0.5 + Math.random()));
            
            if (Math.random() < patterns.shortsRatio) {
                video.isShorts = true;
                video.format = 'shorts';
                video.duration = Math.floor(Math.random() * 45) + 15;
            }
        }
        
        return video;
    }
    
    generateRealisticViews() {
        const ranges = [
            { min: 1000, max: 10000, weight: 40 },
            { min: 10000, max: 50000, weight: 30 },
            { min: 50000, max: 200000, weight: 20 },
            { min: 200000, max: 500000, weight: 10 }
        ];
        
        const random = Math.random() * 100;
        let cumulative = 0;
        
        for (const range of ranges) {
            cumulative += range.weight;
            if (random <= cumulative) {
                return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
            }
        }
        
        return Math.floor(Math.random() * 10000) + 1000;
    }
}

// 페이지 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔥 API 할당량 최적화 시스템 초기화 중...');
    
    if (typeof XLSX === 'undefined') {
        console.error('❌ XLSX 라이브러리가 로드되지 않았습니다.');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js 라이브러리가 로드되지 않았습니다.');
        return;
    }
    
    console.log('✅ 모든 라이브러리 로딩 완료');
    
    window.ytAnalyzer = new OptimizedYoutubeTrendsAnalyzer();
    
    console.log('🚀 API 할당량 최적화 시스템 준비 완료!');
});
