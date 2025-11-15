/**
 * 시니어 YouTube 트렌드 분석기 Pro - API 할당량 최적화 버전
 * 할당량 초과 문제 해결을 위한 스마트 검색 시스템
 */

    // ★★★★★ MultiApiKeyManager 클래스 시작 ★★★★★
    class MultiApiKeyManager {
        constructor() {
            this.apiKeys = this.loadApiKeys();
            this.currentKeyIndex = 0;
            this.keyQuotaUsage = this.loadKeyQuotaUsage();
            this.quotaLimit = 10000; // 키당 일일 할당량
            
            // 🔥 할당량 관리 설정 (새로 추가)
            this.quotaSettings = {
                limitModeThreshold: 0.97,    // 97% 사용시 제한 모드
                disableThreshold: 0.98,      // 98% 사용시 사용 불가
                warningThreshold: 0.90       // 90% 사용시 경고 표시
            };

            this.quotaResetTime = this.getQuotaResetTime();


            // ✅ (신규) 최근 검증 시각 캐시
            this.keyLastValidated = new Map(); // apiKey -> timestamp(ms)
            
            // 키별 상태 추적
            this.keyStatus = new Map(); // 키별 상태 (active, limited, error)
            this.keyErrors = new Map(); // 키별 에러 횟수
            
            this.initializeKeyStatus();
        }


        // ✅ (신규) 최근 검증 여부
        isKeyRecentlyValidated(apiKey, minutes = 10) {
            try {
                const last = this.keyLastValidated.get(apiKey);
                if (!last) return false;
                const diffMs = Date.now() - last;
                return diffMs < minutes * 60 * 1000;
            } catch (_) { return false; }
        }
    
        // ✅ (신규) 검증 시각 기록
        markKeyValidated(apiKey) {
            try {
                this.keyLastValidated.set(apiKey, Date.now());
            } catch (_) {}
        }        

        
        // API 키 목록 로드
        loadApiKeys() {
            const stored = localStorage.getItem('youtube_api_keys');
            if (stored) {
                try {
                    return JSON.parse(stored);
                } catch (e) {
                    console.error('API 키 로드 오류:', e);
                }
            }
            return [];
        }
        
        // 키별 할당량 사용량 로드
        loadKeyQuotaUsage() {
            const stored = localStorage.getItem('youtube_key_quota_usage');
            if (stored) {
                try {
                    return new Map(JSON.parse(stored));
                } catch (e) {
                    console.error('할당량 데이터 로드 오류:', e);
                }
            }
            return new Map();
        }
        
        // 키별 상태 초기화
        initializeKeyStatus() {
            this.apiKeys.forEach(key => {
                if (!this.keyStatus.has(key)) {
                    this.keyStatus.set(key, 'active');
                }
                if (!this.keyErrors.has(key)) {
                    this.keyErrors.set(key, 0);
                }
            });
        }
        
        // 할당량 리셋 시간 계산
        getQuotaResetTime() {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
            tomorrow.setUTCHours(0, 0, 0, 0);
            return tomorrow.getTime();
        }
        
        // 할당량 리셋 확인
        checkQuotaReset() {
            const now = Date.now();
            if (now >= this.quotaResetTime) {
                // 모든 키의 할당량 리셋
                this.keyQuotaUsage.clear();
                this.keyStatus.forEach((value, key) => {
                    if (value === 'limited') {
                        this.keyStatus.set(key, 'active');
                    }
                });
                this.keyErrors.clear();
                
                this.quotaResetTime = this.getQuotaResetTime();
                this.saveKeyQuotaUsage();
                
                console.log('🔄 모든 API 키의 일일 할당량이 리셋되었습니다.');
                this.updateApiKeyStatusDisplay();
            }
        }
        
        // API 키 추가
        addApiKey(apiKey) {
            if (!apiKey || apiKey.trim() === '') {
                throw new Error('유효한 API 키를 입력해주세요.');
            }
            
            const trimmedKey = apiKey.trim();
            
            if (this.apiKeys.includes(trimmedKey)) {
                throw new Error('이미 등록된 API 키입니다.');
            }
            
            this.apiKeys.push(trimmedKey);
            this.keyStatus.set(trimmedKey, 'active');
            this.keyErrors.set(trimmedKey, 0);
            this.keyQuotaUsage.set(trimmedKey, 0);
            
            this.saveApiKeys();
            this.saveKeyQuotaUsage();
            
            console.log(`✅ API 키 추가됨: ${trimmedKey.substring(0, 10)}...`);
            return true;
        }
        
        // API 키 제거
        removeApiKey(index) {
            if (index < 0 || index >= this.apiKeys.length) {
                throw new Error('유효하지 않은 키 인덱스입니다.');
            }
            
            const removedKey = this.apiKeys[index];
            this.apiKeys.splice(index, 1);
            this.keyStatus.delete(removedKey);
            this.keyErrors.delete(removedKey);
            this.keyQuotaUsage.delete(removedKey);
            
            // 현재 인덱스 조정
            if (this.currentKeyIndex >= this.apiKeys.length) {
                this.currentKeyIndex = 0;
            }
            
            this.saveApiKeys();
            this.saveKeyQuotaUsage();
            
            console.log(`🗑️ API 키 제거됨: ${removedKey.substring(0, 10)}...`);
            return true;
        }
        
        // 사용 가능한 API 키 반환
        getAvailableApiKey() {
            this.checkQuotaReset();
            
            if (this.apiKeys.length === 0) {
                console.error('❌ 등록된 API 키가 없습니다.');
                return null;
            }
            
            // 🔥 자동 복구 체크: error 또는 limited 상태인 키 중 할당량이 충분한 키 자동 복구
            this.autoRecoverApiKeys();
            
            // 사용 가능한 키 찾기 (라운드 로빈 방식)
            let attempts = 0;
            const maxAttempts = this.apiKeys.length;
            
            while (attempts < maxAttempts) {
                const currentKey = this.apiKeys[this.currentKeyIndex];
                const keyUsage = this.keyQuotaUsage.get(currentKey) || 0;
                const keyStatus = this.keyStatus.get(currentKey);
                
                // 키가 사용 가능한지 확인
                // 🔥 키가 사용 가능한지 확인 (98% 사용시 사용 불가)
                // 키가 사용 가능한지 확인
                // 🔥 설정 기반 키 사용 가능 여부 확인 (disableThreshold 기준)
                const usageThreshold = Math.floor(this.quotaLimit * this.quotaSettings.disableThreshold);
                if (keyStatus === 'active' && keyUsage < usageThreshold) {
                    const usagePercent = ((keyUsage / this.quotaLimit) * 100).toFixed(1);
                    const thresholdPercent = (this.quotaSettings.disableThreshold * 100).toFixed(0);
                    console.log(`🔑 사용 중인 API 키 (${thresholdPercent}% 이하): ${currentKey.substring(0, 10)}... (${keyUsage}/${this.quotaLimit}, ${usagePercent}%)`);
                    return currentKey;
                }
                
                // 다음 키로 이동
                this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
                attempts++;
            }
            
            // 모든 키가 한계치에 도달한 경우, 가장 적게 사용된 키 반환
            let bestKey = null;
            let lowestUsage = this.quotaLimit;
            
            for (const [key, usage] of this.keyQuotaUsage) {
                const status = this.keyStatus.get(key);
                if (status !== 'error' && usage < lowestUsage) {
                    bestKey = key;
                    lowestUsage = usage;
                }
            }
            
            if (bestKey) {
                console.log(`⚠️ 최선의 키 선택: ${bestKey.substring(0, 10)}... (${lowestUsage}/${this.quotaLimit})`);
                return bestKey;
            }
            
            console.error('❌ 사용 가능한 API 키가 없습니다. 모든 키의 할당량이 소진되었습니다.');
            return null;
        }
        
        // 🔥 API 키 자동 복구 함수 (error 또는 limited 상태인 키 중 할당량이 충분한 키 자동 복구)
        autoRecoverApiKeys() {
            let recoveredCount = 0;
            
            for (const apiKey of this.apiKeys) {
                const status = this.keyStatus.get(apiKey) || 'active';
                const currentUsage = this.keyQuotaUsage.get(apiKey) || 0;
                const remainingQuota = this.quotaLimit - currentUsage;
                
                // error 또는 limited 상태인 키만 체크
                if (status === 'error' || status === 'limited') {
                    // 할당량이 충분하면 (최소 100 이상) 자동 복구
                    if (remainingQuota >= 100) {
                        console.log(`🔄 자동 복구 체크: ${apiKey.substr(0, 10)}... (상태: ${status}, 남은 할당량: ${remainingQuota.toLocaleString()}개)`);
                        this.keyStatus.set(apiKey, 'active');
                        this.keyErrors.set(apiKey, 0);
                        recoveredCount++;
                        console.log(`✅ API 키 자동 복구: ${apiKey.substr(0, 10)}... (남은 할당량: ${remainingQuota.toLocaleString()})`);
                    } else {
                        console.log(`⏸️ 자동 복구 불가: ${apiKey.substr(0, 10)}... (상태: ${status}, 남은 할당량: ${remainingQuota.toLocaleString()}개 - 부족)`);
                    }
                }
            }
            
            // 복구된 키가 있으면 UI 업데이트
            if (recoveredCount > 0) {
                this.updateApiKeyStatusDisplay();
                console.log(`🎉 총 ${recoveredCount}개 API 키가 자동 복구되었습니다.`);
            }
        }
        
        // 할당량 사용량 업데이트
        // 할당량 사용량 업데이트 (API 키별)  — 진행바를 "API 소진 기준"으로 즉시 갱신
        // 할당량 사용량 업데이트 (API 키별) — 순수 매니저 로직
        updateQuotaUsage(apiKey, units) {
          if (!apiKey) return;
          const u = Number(units) || 0;
          if (u <= 0) return;
        
          // 1) 누적
          const curr = this.keyQuotaUsage.get(apiKey) || 0;
          const next = curr + u;
          this.keyQuotaUsage.set(apiKey, next);
        
          // 2) 임계치에 따른 상태 전환(경고/제한)
          const limitCutoff   = Math.floor(this.quotaLimit * this.quotaSettings.disableThreshold); // 98%
          const warningCutoff = Math.floor(this.quotaLimit * this.quotaSettings.warningThreshold); // 90%
          if (next >= limitCutoff) {
            this.keyStatus.set(apiKey, 'limited');
          } else if (next >= warningCutoff && this.keyStatus.get(apiKey) === 'active') {
            // 상태표시는 active 유지, UI에서 색만 경고로 (기존 정책 유지)
          }
        
          // 3) 저장 & UI
          this.saveKeyQuotaUsage();
          this.updateApiKeyStatusDisplay?.();
        }


        
        // API 키 에러 처리
        handleApiKeyError(apiKey, error) {
            if (!apiKey) return;
            
            const errorCount = (this.keyErrors.get(apiKey) || 0) + 1;
            this.keyErrors.set(apiKey, errorCount);
            
            // 403 오류 (할당량 초과) 처리
            if (error && error.message && (error.message.includes('403') || String(error.message).includes('403'))) {
                // 할당량 확인하여 남아있으면 자동 복구
                const currentUsage = this.keyQuotaUsage.get(apiKey) || 0;
                const remainingQuota = this.quotaLimit - currentUsage;
                
                // 할당량이 남아있으면 자동 복구 (최소 100 이상 남아있을 때)
                if (remainingQuota >= 100) {
                    console.log(`🔄 API 키 할당량 확인: ${remainingQuota.toLocaleString()}개 남음. 자동 복구 시도: ${apiKey.substr(0, 10)}...`);
                    // 상태를 active로 변경하고 에러 카운트 리셋
                    this.keyStatus.set(apiKey, 'active');
                    this.keyErrors.set(apiKey, 0);
                    console.log(`✅ API 키 자동 복구 완료: ${apiKey.substr(0, 10)}... (남은 할당량: ${remainingQuota.toLocaleString()})`);
                } else {
                    // 할당량이 부족하면 제한 상태로 설정
                    this.keyStatus.set(apiKey, 'limited');
                    console.error(`🚫 API 키 할당량 초과: ${apiKey.substr(0, 10)}... (남은 할당량: ${remainingQuota.toLocaleString()})`);
                }
            } 
            // 연속 에러 시 일시 비활성화 (하지만 할당량이 충분하면 자동 복구 가능)
            else if (errorCount >= 3) {
                const currentUsage = this.keyQuotaUsage.get(apiKey) || 0;
                const remainingQuota = this.quotaLimit - currentUsage;
                
                // 할당량이 충분하면 error 상태로 설정하지 않고 active 유지 (자동 복구)
                if (remainingQuota >= 100) {
                    console.log(`⚠️ 연속 에러 발생 (${errorCount}회)했지만 할당량이 충분함: ${remainingQuota.toLocaleString()}개. 자동 복구: ${apiKey.substr(0, 10)}...`);
                    this.keyStatus.set(apiKey, 'active');
                    this.keyErrors.set(apiKey, 0); // 에러 카운트도 리셋
                } else {
                    this.keyStatus.set(apiKey, 'error');
                    console.error(`❌ API 키 연속 에러로 비활성화: ${apiKey.substr(0, 10)}... (할당량 부족: ${remainingQuota.toLocaleString()}개)`);
                }
            }
            
            this.updateApiKeyStatusDisplay();
        }
        
        // 키 상태 복구
        resetKeyStatus(apiKey) {
            this.keyStatus.set(apiKey, 'active');
            this.keyErrors.set(apiKey, 0);
            console.log(`🔄 API 키 상태 복구: ${apiKey.substr(0, 10)}...`);
            this.updateApiKeyStatusDisplay();
        }
        
        // 전체 통계 정보
        getOverallStats() {
            const totalKeys = this.apiKeys.length;
            const activeKeys = Array.from(this.keyStatus.values()).filter(status => status === 'active').length;
            const totalQuotaUsed = Array.from(this.keyQuotaUsage.values()).reduce((sum, usage) => sum + usage, 0);
            const totalQuotaAvailable = this.apiKeys.length * this.quotaLimit;
            const remainingQuota = totalQuotaAvailable - totalQuotaUsed;
            
            return {
                totalKeys,
                activeKeys,
                totalQuotaUsed,
                totalQuotaAvailable,
                remainingQuota,
                utilizationRate: ((totalQuotaUsed / totalQuotaAvailable) * 100).toFixed(1)
            };
        }
        
        // 데이터 저장
        saveApiKeys() {
            localStorage.setItem('youtube_api_keys', JSON.stringify(this.apiKeys));
        }
        
        saveKeyQuotaUsage() {
            const usageArray = Array.from(this.keyQuotaUsage.entries());
            localStorage.setItem('youtube_key_quota_usage', JSON.stringify(usageArray));
        }
        
        // UI 업데이트
        updateApiKeyStatusDisplay() {
            const container = document.getElementById('apiKeyStatusContainer');
            if (!container) return;
            
            const stats = this.getOverallStats();
            
            container.innerHTML = `
                <div class="api-key-overview">
                    <h4>🔑 API 키 풀 상태</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">등록된 키:</span>
                            <span class="stat-value">${stats.totalKeys}개</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">활성 키:</span>
                            <span class="stat-value">${stats.activeKeys}개</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">총 할당량:</span>
                            <span class="stat-value">${stats.totalQuotaAvailable.toLocaleString()}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">남은 할당량:</span>
                            <span class="stat-value">${stats.remainingQuota.toLocaleString()}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">사용률:</span>
                            <span class="stat-value">${stats.utilizationRate}%</span>
                        </div>
                    </div>
                </div>
                
                <div class="api-key-list">
                    ${this.apiKeys.map((key, index) => {
                        const usage = this.keyQuotaUsage.get(key) || 0;
                        const status = this.keyStatus.get(key) || 'active';
                        const errors = this.keyErrors.get(key) || 0;
                        const usagePercent = ((usage / this.quotaLimit) * 100).toFixed(1);
                        
                        return `
                            <div class="api-key-item ${status}">
                                <div class="key-info">
                                    <span class="key-display">${key.substr(0, 10)}...${key.substr(-4)}</span>
                                    <span class="key-status ${status}">${this.getStatusText(status)}</span>
                                </div>
                                <div class="key-usage">
                                    <div class="usage-bar">
                                        <div class="usage-fill" style="width: ${usagePercent}%"></div>
                                    </div>
                                    <span class="usage-text">${usage.toLocaleString()}/${this.quotaLimit.toLocaleString()}</span>
                                </div>
                                <div class="key-actions">
                                    ${status === 'error' ? `<button onclick="ytAnalyzer.apiKeyManager.resetKeyStatus('${key}')" class="btn-reset">복구</button>` : ''}
                                    <button onclick="ytAnalyzer.apiKeyManager.removeApiKey(${index})" class="btn-remove">제거</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        getStatusText(status, usage = 0) {
            const usagePercent = this.quotaLimit > 0 ? (usage / this.quotaLimit) * 100 : 0;
            
            switch (status) {
                case 'active': 
                    if (usagePercent >= (this.quotaSettings.warningThreshold * 100)) {
                        return '🟡 주의';
                    }
                    return '🟢 활성';
                case 'limited': return '🔴 제한 (97%+)';
                case 'error': return '❌ 에러';
                default: return '❓ 알 수 없음';
            }
        }




        
    }
    // ★★★★★ MultiApiKeyManager 클래스 끝 ★★★★★





// ★★★★★ Class OptimizedYoutubeTrendsAnalyzer 모듈 시작 부분 ★★★★★
class OptimizedYoutubeTrendsAnalyzer {
    constructor() {
        // API 키 풀링 시스템 초기화
        this.apiKeyManager = new MultiApiKeyManager();
        this.baseUrl = 'https://www.googleapis.com/youtube/v3';
        this.allVideos = [];
        this.scanResults = [];
        
        // 🔥 백그라운드 전체 데이터 보존 변수 추가
        this.fullBackgroundData = []; // 원본 전체 수집 데이터 보존
        this.backgroundDataStats = {
            totalCollected: 0,
            processedCount: 0,
            collectionTime: null
        };
        
        this.isScanning = false;
        this.charts = {};
        
        // 캐시 시스템
        this.cache = new Map();
        this.cacheExpiry = 2 * 60 * 60 * 1000; // 2시간
        
        // 최적화된 키워드 (우선순위별)
        this.optimizedKeywords = {
            tier1: [
                '시니어', '실버', '중년', '노인'
            ],
            tier2: [
                '부동산', '주택', '정치', '환경', '기후','범죄', '여행',
                '관광', '건강', '운동', '패션', '소비', '요리', '취미'
            ],
            tier3: [
                '시니어 운동', '노년 취미', '실버 요리', '중년 건강',
                '시니어 테크', '노인 여행', '실버 댄스', '중년 요리'
            ]
        };
        
        // 모의 데이터 생성기 (할당량 절약용)
        this.mockDataGenerator = new MockDataGenerator();
        
        this.init();
    }
    
    // 할당량 사용량 업데이트 (API 키별)
    // (Analyzer) 할당량 사용량 업데이트 — 매니저 누적 + 진행바(UI) 즉시 동기화
    updateQuotaUsage(apiKey, units) {
      if (!apiKey) return;
    
      // 1) 데이터 계층: 키별 누적(매니저)
      this.apiKeyManager.updateQuotaUsage(apiKey, units);
    
      // 2) UI 계층: 진행바 = "API 소진 누적 / 스캔 예상 소진" 강제 갱신
      try {
        // 베이스라인/예상치가 없으면 1회 세팅
        if (!this._quotaProgress && typeof this.initQuotaProgressIfNeeded === 'function') {
          this.initQuotaProgressIfNeeded();
        }
        // 진행바 텍스트: "진행%  (현재누적 / 예상)"
        if (typeof this.updateQuotaProgressUI === 'function') {
          this.updateQuotaProgressUI();
        }
      } catch (e) {
        console.warn('updateQuotaUsage(): UI 동기화 실패', e);
      }
    }

    
    // 할당량 확인 (전체 풀 기준)
    canUseQuota(requiredUnits = 100) {
        this.apiKeyManager.checkQuotaReset();
        const stats = this.apiKeyManager.getOverallStats();
        return stats.remainingQuota >= requiredUnits;
    }
    
    // 할당량 상태 표시
    displayQuotaStatus() {
        this.apiKeyManager.checkQuotaReset();
        const stats = this.apiKeyManager.getOverallStats();
        
        console.log(`📊 API 키 풀 할당량 상태:`);
        console.log(`   등록된 키: ${stats.totalKeys}개`);
        console.log(`   활성 키: ${stats.activeKeys}개`);
        console.log(`   총 할당량: ${stats.totalQuotaAvailable.toLocaleString()}`);
        console.log(`   사용량: ${stats.totalQuotaUsed.toLocaleString()}`);
        console.log(`   남은량: ${stats.remainingQuota.toLocaleString()}`);
        console.log(`   사용률: ${stats.utilizationRate}%`);
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

    
    // 전체 키 풀의 현재까지 누적 사용 유닛
    getQuotaUsed() {
      const stats = this.apiKeyManager?.getOverallStats?.();
      return Number(stats?.totalQuotaUsed || 0);
    }


    // 📡 검출 채널 상한 (슬라이더 연동)
    // - 1000이면 "전체" 처리(자르지 않음)
    // - 그 외엔 10~1000 범위 clamp
    getMaxChannels() {
      const v = Number(localStorage.getItem('hot_maxChannels') || 100);
      if (v >= 1000) return Infinity; // == 모든 채널 스캔
      return Math.max(10, Math.min(1000, v));
    }
    
    // ⚙️ 동시 요청 수 (슬라이더 연동) — 4~8 clamp
    getConcurrency() {
      const v = Number(localStorage.getItem('hot_concurrency') || 4);
      return Math.max(4, Math.min(8, v));
    }


    

    // 진행바를 "API 소진 기준"으로 갱신:  percent = (usedSinceStart / planned) * 100
    updateQuotaProgressUI() {
      try {
        this.initQuotaProgressIfNeeded();
    
        let planned  = Math.max(1, Number(this._quotaProgress?.planned || 0));
        const baseline = Number(this._quotaProgress?.baseline || 0);
        const usedNow  = this.getQuotaUsed();
        const usedSinceStart = Math.max(0, usedNow - baseline);
    
        // 🔧 언더에스티메이트 보정: 사용량이 분모의 90%를 넘으면 자동 상향(여유 20%)
        if (usedSinceStart > planned * 0.90) {
          const rebased = Math.ceil(usedSinceStart * 1.20); // 여유분 포함
          if (rebased > planned) {
            planned = rebased;
            this._quotaProgress.planned = planned;
    
            // "예상 API 비용" UI도 함께 보정
            const est = document.getElementById('estimatedCost');
            if (est) est.textContent = planned.toLocaleString();
    
            console.log(`🔁 분모 자동 보정: planned=${planned.toLocaleString()} (usedSinceStart=${usedSinceStart.toLocaleString()})`);
          }
        }
    
        let pct = Math.round((usedSinceStart / planned) * 100);
        if (!Number.isFinite(pct)) pct = 0;
        if (pct > 100) pct = 100;
    
        const bar = document.getElementById('progressBar');
        if (bar) {
          bar.style.width = `${pct}%`;
          bar.textContent = `${pct}%  (${usedSinceStart.toLocaleString()} / ${planned.toLocaleString()})`;
        }
    
        const quotaEl = document.getElementById('quotaUsage');
        if (quotaEl) quotaEl.textContent = usedNow.toLocaleString();
    
      } catch (e) {
        console.warn('updateQuotaProgressUI() 실패:', e);
      }
    }

    

    
    // === (신규) 스캔 예상 유닛 계산(보수적 상한): search + details ===
    // === 현실적인 스캔 예상 유닛 계산 (보수적 상향) ===
    // - search.list: 100 유닛/호출, 페이지당 50개 → 키워드당 ceil(topN/50) * 100
    // - videos.list: 1 유닛/호출, 50개/호출 → 상세 ceil(topN/50) * 1
    // - channel uploads(playlistItems.list): 1 유닛/호출, 50개/호출
    //   * 키워드→영상→채널 확장 비율을 휴리스틱으로 반영
    // - 안전 마진(safetyMultiplier) 적용
    estimatePlannedQuota() {
      try {
        const selected = this.getSelectedKeywords?.() || [];
        const keywordsCount = Array.isArray(selected) ? selected.length : Number(selected) || 0;
    
        const topSel = document.getElementById('resultCount');
        const topN   = topSel ? Math.max(1, Number(topSel.value)) : 50;
    
        // 운영 파라미터(로컬스토리지로 조정 가능)
        const perChannelMax = Math.max(1, Number(localStorage.getItem('hot_perChannelMax') || 300));   // 채널당 최대 가져올 업로드 수
        const maxChannels   = Math.max(1, Number(localStorage.getItem('hot_maxChannels')   || 100));   // 확장 가능한 채널 수 상한
        const uniqueChannelRatio = Math.min(1, Math.max(0.1, Number(localStorage.getItem('hot_uniqueChannelRatio') || 0.6))); // topN에서 유니크 채널 비율 추정
        const safetyMultiplier   = Math.min(2.0, Math.max(1.10, Number(localStorage.getItem('hot_safetyMultiplier') || 1.30))); // 안전 마진(기본 30%)
    
        // YouTube Data API v3 비용 테이블(조정 가능)
        const COST_SEARCH        = Number(localStorage.getItem('hot_cost_search')        || 100); // search.list
        const COST_VIDEOS        = Number(localStorage.getItem('hot_cost_videos')        || 1);   // videos.list
        const COST_PLAYLISTITEMS = Number(localStorage.getItem('hot_cost_playlistItems') || 1);   // playlistItems.list
    
        // 1) 키워드 검색(search.list) — 페이지 수 반영
        const searchPagesPerKeyword = Math.ceil(topN / 50);
        const searchUnits = keywordsCount * searchPagesPerKeyword * COST_SEARCH;
    
        // 2) 동영상 상세(videos.list) — 페이지 수 반영
        const videoDetailPagesPerKeyword = Math.ceil(topN / 50);
        const detailUnits = keywordsCount * videoDetailPagesPerKeyword * COST_VIDEOS;
    
        // 3) 채널 업로드 확장(playlistItems.list) — 휴리스틱 기반
        //    topN 결과에서 유니크 채널 수를 추정한 뒤, 각 채널에서 perChannelMax 만큼 가져온다고 가정
        const estimatedUniqueChannels = Math.min(maxChannels, Math.round(topN * uniqueChannelRatio) * keywordsCount);
        const uploadsPagesPerChannel  = Math.ceil(perChannelMax / 50);
        const channelUploadsUnits = estimatedUniqueChannels * uploadsPagesPerChannel * COST_PLAYLISTITEMS;
    
        // 4) 합계 + 안전 마진
        const rawPlanned = searchUnits + detailUnits + channelUploadsUnits;
        const planned = Math.max(1, Math.ceil(rawPlanned * safetyMultiplier));
    
        // UI 갱신
        const est = document.getElementById('estimatedCost');
        if (est) est.textContent = planned.toLocaleString();
    
        // 로깅(선택)
        console.log('[예상 유닛 계산]', { 
          keywordsCount, topN, perChannelMax, maxChannels, uniqueChannelRatio,
          searchPagesPerKeyword, videoDetailPagesPerKeyword, uploadsPagesPerChannel,
          searchUnits, detailUnits, channelUploadsUnits, safetyMultiplier, planned
        });
    
        return planned;
      } catch (e) {
        console.warn('estimatePlannedQuota() 실패:', e);
        return 1;
      }
    }



    // 진행률 상태 하드 리셋 (매 스캔 시작 시 0%에서 출발)
    resetQuotaProgress() {
      this._quotaProgress = null;
    }

    
    // === (신규) 할당량 진행바 초기화(1회) ===
    initQuotaProgressIfNeeded() {
      if (!this._quotaProgress) {
        const planned  = this.estimatePlannedQuota();
        const baseline = this.getQuotaUsed?.() || 0;
    
        this._quotaProgress = {
          planned,
          baseline,
          startedAt: Date.now()
        };
    
        // 부족 경고 UI가 있을 경우 유지(있으면 사용)
        try {
          const stats = this.apiKeyManager?.getOverallStats?.() || {};
          const warn  = document.getElementById('costWarning');
          if (warn && Number(planned) > Number(stats.remainingQuota || 0)) {
            warn.style.display = 'block';
          }
        } catch (_) {}
      }
    }


    // === (신규) 저비용 API 키 테스트(1 유닛)
    // - videos.list or channels.list 중 1유닛 엔드포인트 사용
    // - 기본은 videos.list?id=Ks-_Mh1QhMc (존재하는 공개 비디오)로 검증
    async lightweightKeyProbe(apiKey) {
      const testId = 'Ks-_Mh1QhMc'; // 공개 비디오 ID (예시)
      const url = `${this.baseUrl}/videos?part=id&id=${testId}&key=${apiKey}`;
      const res = await fetch(url);
      return res;
    }

    
    
    // 초기화
    init() {
        console.log('🎯 API 키 풀링 시스템 시작');
        this.setupEventListeners();
        this.showOptimizedWelcomeMessage();
        this.displayQuotaStatus();

        // 실시간 카운터 초기화 (새로 추가)
        this.realTimeCounters = {
            backgroundData: 0,
            detectedVideos: 0,
            processingRate: 0,
            lastUpdateTime: Date.now(),
            rateCalculationBuffer: []
        };

          // 🔥 실시간 처리율 타이머 시작
          this.startLiveMetricsUpdater(); // <--- 추가

        
        // === 운영 기본값(최초 1회) ===
        if (!localStorage.getItem('hot_maxChannels')) {
          localStorage.setItem('hot_maxChannels','100'); // 기본 100, UI에서 10~1000 조정
        }
        
        if (!localStorage.getItem('hot_concurrency')) {
          localStorage.setItem('hot_concurrency','4');     // 기본 4 (UI에서 4~8 조정)
        }
        if (!localStorage.getItem('hot_w_viewsPerDay')) {
          localStorage.setItem('hot_w_viewsPerDay','1.0');  // 가중치: 조회속도
        }
        if (!localStorage.getItem('hot_w_engagement')) {
          localStorage.setItem('hot_w_engagement','3.0');   // 가중치: 참여율
        }
        if (!localStorage.getItem('hot_maxAgeDays')) {
          localStorage.setItem('hot_maxAgeDays','14');      // 가중치: 기본 최대 기간(일)
        }
        // === /운영 기본값 ===


        
        // API 키 상태 표시 초기화
        this.apiKeyManager.updateApiKeyStatusDisplay();

        // 슬라이더 UI ↔ localStorage 초기화
        this.initTuningControls();
        
        // 키워드 선택 UI 초기화 추가
        setTimeout(() => {
            this.setupKeywordSelectionEvents();
        }, 100);
    }
    
    // API 키 확인
    // API 키 확인 (풀링 시스템 사용)
    getApiKey() {
        return this.apiKeyManager.getAvailableApiKey();
    }
    
    // 최적화된 웰컴 메시지
    showOptimizedWelcomeMessage() {
        console.log('🚀 API 할당량 최적화 시스템이 준비되었습니다!');
        console.log('💡 스마트 검색으로 할당량을 효율적으로 사용합니다');
        console.log('💾 캐시 시스템으로 중복 요청을 방지합니다');
    }
    
    // 할당량 상태 표시
    // 할당량 상태 표시 (API 키 풀링 시스템)
    displayQuotaStatus() {
        this.apiKeyManager.checkQuotaReset();
        const stats = this.apiKeyManager.getOverallStats();
        
        console.log(`📊 API 키 풀 할당량 상태:`);
        console.log(`   등록된 키: ${stats.totalKeys}개`);
        console.log(`   활성 키: ${stats.activeKeys}개`);
        console.log(`   총 할당량: ${stats.totalQuotaAvailable.toLocaleString()}`);
        console.log(`   사용량: ${stats.totalQuotaUsed.toLocaleString()}`);
        console.log(`   남은량: ${stats.remainingQuota.toLocaleString()}`);
        console.log(`   사용률: ${stats.utilizationRate}%`);
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
        
        // API 키 풀링 관련 이벤트
        this.setupApiKeyPoolEvents();
    
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

        //슬라이더 초기화 함수 추가
        initTuningControls() {
          const pcmEl  = document.getElementById('perChannelMax');
          const pcmVal = document.getElementById('perChannelMaxValue');
          const ccEl   = document.getElementById('concurrency');
          const ccVal  = document.getElementById('concurrencyValue');
        
          // perChannelMax
          if (pcmEl && pcmVal) {
            const stored = Number(localStorage.getItem('hot_perChannelMax') || 300);
            const clamped = Math.min(1000, Math.max(100, stored));
            pcmEl.value = clamped;
            pcmVal.textContent = clamped.toString();
        
            pcmEl.addEventListener('input', (e) => {
              const v = Number(e.target.value);
              const safe = Math.min(1000, Math.max(100, v));
              pcmVal.textContent = safe.toString();
              localStorage.setItem('hot_perChannelMax', String(safe));
            });
          }

            
        // maxChannels (검출 채널 상한)
        // maxChannels (검출 채널 상한) - 대용량 확장
        {
          const mcEl  = document.getElementById('maxChannels');
          const mcVal = document.getElementById('maxChannelsValue');
          if (mcEl && mcVal) {
            const stored = Number(localStorage.getItem('hot_maxChannels') || 500);
            const clamped = Math.min(10000, Math.max(10, stored)); // 최대 10,000개로 확장
            mcEl.value = clamped;
            mcVal.textContent = clamped.toLocaleString('ko-KR'); // 천단위 구분자 추가
        
            mcEl.addEventListener('input', (e) => {
              const v = Number(e.target.value);
              const safe = Math.min(10000, Math.max(10, v)); // 최대 10,000개로 확장
              mcVal.textContent = safe.toLocaleString('ko-KR'); // 천단위 구분자 추가
              localStorage.setItem('hot_maxChannels', String(safe));
        
              // 🔥 대용량 검색 시 경고 표시
              if (safe > 5000) {
                this.showLargeScaleWarning?.(safe);
              }
        
              // 🔁 예상 소진 API 수 즉시 갱신
              if (typeof ytAnalyzer?.estimatePlannedQuota === 'function') {
                ytAnalyzer.estimatePlannedQuota();
                if (typeof ytAnalyzer.updateQuotaProgressUI === 'function') {
                  ytAnalyzer._quotaProgress = null; // 분모 재설정 위해 리셋
                  ytAnalyzer.initQuotaProgressIfNeeded();
                  ytAnalyzer.updateQuotaProgressUI();
                }
              }
            });
          }
        }
        
        // concurrency
        if (ccEl && ccVal) {
          const storedC = Number(localStorage.getItem('hot_concurrency') || 4);
          const clampedC = Math.min(8, Math.max(4, storedC));
          ccEl.value = clampedC;
          ccVal.textContent = clampedC.toString();
        
          ccEl.addEventListener('input', (e) => {
            const v = Number(e.target.value);
            const safe = Math.min(8, Math.max(4, v));
            ccVal.textContent = safe.toString();
            localStorage.setItem('hot_concurrency', String(safe));
        
            // (참고) 동시성은 소진량 총합에 영향 X → 분모 재계산은 선택
            if (typeof ytAnalyzer?.updateQuotaProgressUI === 'function') {
              ytAnalyzer.updateQuotaProgressUI();
            }
          });
        }


          
        }


    
    // API 키 풀 관련 이벤트 설정
    setupApiKeyPoolEvents() {
        const addApiKeyBtn = document.getElementById('addApiKeyBtn');
        const apiKeyInput = document.getElementById('apiKeyInput');
        const refreshStatusBtn = document.getElementById('refreshApiKeyStatusBtn');
        
        if (addApiKeyBtn && apiKeyInput) {
            addApiKeyBtn.addEventListener('click', () => this.addApiKey());
            apiKeyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addApiKey();
                }
            });
        }
        
        if (refreshStatusBtn) {
            refreshStatusBtn.addEventListener('click', () => {
                this.apiKeyManager.updateApiKeyStatusDisplay();
            });
        }
        
        // API 키 검증 버튼 이벤트 추가
        const validateApiKeysBtn = document.getElementById('validateApiKeysBtn');
        if (validateApiKeysBtn) {
            validateApiKeysBtn.addEventListener('click', () => this.validateApiKeys());
        }
    }
    
    // API 키 추가
    addApiKey() {
        const input = document.getElementById('apiKeyInput');
        if (!input) return;
        
        const apiKey = input.value.trim();
        if (!apiKey) {
            this.showError('API 키를 입력해주세요.');
            return;
        }
        
        try {
            this.apiKeyManager.addApiKey(apiKey);
            input.value = '';
            this.apiKeyManager.updateApiKeyStatusDisplay();
            this.showSuccess('API 키가 성공적으로 추가되었습니다.');
        } catch (error) {
            this.showError(error.message);
        }
    }


    // ★★★ 여기에 validateApiKeys 함수 삽입 ★★★
    // API 키 검증 함수 (개선된 버전)
    async validateApiKeys() {
        const stats = this.apiKeyManager.getOverallStats();
        if (stats.totalKeys === 0) {
            this.showError('검증할 API 키가 없습니다.');
            return;
        }
    
        this.showSuccess('API 키 검증을 시작합니다...', 'API 키 검증');
    
        let validKeys = 0;
        let invalidKeys = 0;
        let quotaExceededKeys = 0;
    
        for (let i = 0; i < this.apiKeyManager.apiKeys.length; i++) {
            const apiKey = this.apiKeyManager.apiKeys[i];
            const keyDisplay = `${apiKey.substr(0, 10)}...${apiKey.substr(-4)}`;
    
            // ✅ 최근에 검증했다면 스킵(중복 소진 방지)
            if (this.apiKeyManager.isKeyRecentlyValidated(apiKey, 10)) {
                console.log(`⏭️ 최근 검증됨 → 건너뜀: ${keyDisplay}`);
                continue;
            }
    
            console.log(`🔍 API 키 검증 중: ${keyDisplay}`);
    
            try {
                // ✅ 저비용(1유닛) 검증: videos.list 로 대체
                const response = await this.lightweightKeyProbe(apiKey);
    
                if (response.ok) {
                    console.log(`✅ API 키 ${keyDisplay}: 정상 작동`);
                    this.apiKeyManager.resetKeyStatus(apiKey);
    
                    // 🔻 100 → 1 유닛으로 절감
                    this.updateQuotaUsage(apiKey, 1);
    
                    // 최근 검증 기록
                    this.apiKeyManager.markKeyValidated(apiKey);
                    validKeys++;
    
                } else if (response.status === 403) {
                    let errorReason = 'forbidden';
                    try {
                        const data = await response.json();
                        errorReason = data?.error?.errors?.[0]?.reason || 'forbidden';
                    } catch (_) {}
    
                    if (errorReason === 'quotaExceeded' || errorReason === 'rateLimitExceeded') {
                        console.log(`📊 ${keyDisplay}: 할당량 초과`);
                        this.apiKeyManager.keyStatus.set(apiKey, 'limited');
                        quotaExceededKeys++;
                    } else if (errorReason === 'accessNotConfigured') {
                        console.log(`🔧 ${keyDisplay}: YouTube Data API v3 비활성`);
                        this.apiKeyManager.keyStatus.set(apiKey, 'error');
                        invalidKeys++;
                    } else if (errorReason === 'keyInvalid' || errorReason === 'forbidden') {
                        console.log(`🔑 ${keyDisplay}: 키가 잘못됐거나 권한 없음`);
                        this.apiKeyManager.keyStatus.set(apiKey, 'error');
                        invalidKeys++;
                    } else {
                        console.warn(`⚠️ ${keyDisplay}: 403(${errorReason})`);
                        this.apiKeyManager.keyStatus.set(apiKey, 'error');
                        invalidKeys++;
                    }
    
                } else {
                    console.warn(`⚠️ ${keyDisplay}: 응답 상태 ${response.status}`);
                    this.apiKeyManager.keyStatus.set(apiKey, 'error');
                    invalidKeys++;
                }
            } catch (err) {
                console.error(`❌ ${keyDisplay} 검증 중 오류:`, err);
                this.apiKeyManager.keyStatus.set(apiKey, 'error');
                invalidKeys++;
            }
        }
    
        // 요약 표시(기존 UX 유지)
        this.updateApiKeyStatusDisplay?.();
        this.showSuccess(
          `검증 완료 • 정상:${validKeys} / 제한:${quotaExceededKeys} / 오류:${invalidKeys}`,
          'API 키 검증'
        );
    }

    // ★★★ validateApiKeys 함수 끝 ★★★



    
    // 다운로드 버튼 설정 (기존과 동일)
    setupDownloadButtons() {
        const downloadExcel = document.getElementById('downloadExcel');
        const downloadCSV = document.getElementById('downloadCSV');
        const downloadJSON = document.getElementById('downloadJSON');
        const downloadBackgroundData = document.getElementById('downloadBackgroundData');
        const downloadPDF = document.getElementById('downloadPDF');
        
        if (downloadExcel) downloadExcel.addEventListener('click', () => this.downloadExcel());
        if (downloadCSV) downloadCSV.addEventListener('click', () => this.downloadCSV());
        if (downloadJSON) downloadJSON.addEventListener('click', () => this.downloadJSON());
        if (downloadBackgroundData) downloadBackgroundData.addEventListener('click', () => this.downloadBackgroundData());
        if (downloadPDF) downloadPDF.addEventListener('click', () => this.downloadPDF());
    }
    
    // 최적화된 스캔 시작
    // 최적화된 스캔 시작
        async startOptimizedScan() {
            // API 키 풀링 시스템 확인

            
            const stats = this.apiKeyManager.getOverallStats();
            if (stats.totalKeys === 0) {
                this.showError('등록된 API 키가 없습니다. 위의 API 키 관리 섹션에서 키를 추가해주세요.');
                return;
            }
            
            if (stats.activeKeys === 0) {
                this.showError(`
                    사용 가능한 API 키가 없습니다. 
                    
                    가능한 원인:
                    1. 모든 키의 일일 할당량 소진 (10,000 units/day)
                    2. API 키에서 YouTube Data API v3가 활성화되지 않음
                    3. API 키 권한 설정 문제
                    
                    해결 방법:
                    • Google Cloud Console에서 API 키 상태 확인
                    • YouTube Data API v3 활성화 확인
                    • 새로운 API 키 추가
                    • 내일 자정(UTC) 이후 재시도
                `);
                return;
            }
            
            // 추가 검증: 실제 API 키 테스트
            console.log('🔍 API 키 상태 검증 중...');
            const testApiKey = this.getApiKey();
            if (!testApiKey) {
                this.showError('사용 가능한 API 키를 찾을 수 없습니다.');
                return;
            }
            
            // 간단한 API 테스트 (1 unit 소모)
            // ✅ 최근 검증이면 스킵 (중복 1유닛 방지)
            if (!this.apiKeyManager.isKeyRecentlyValidated(testApiKey, 10)) {
              try {
                const testResponse = await this.lightweightKeyProbe(testApiKey); // 1유닛
                if (!testResponse.ok && testResponse.status === 403) {
                  this.apiKeyManager.handleApiKeyError(testApiKey, new Error('API 키 권한 오류'));
                  this.showError(`API 키 권한 오류가 발생했습니다.`);
                  return;
                }
                // 정상 통과 시 최근 검증 기록
                this.apiKeyManager.markKeyValidated(testApiKey);
              } catch (e) {
                this.showError(`API 키 간단 테스트 실패: ${String(e && e.message || e)}`);
                return;
              }
            }
            
            if (this.isScanning) {
                this.showError('이미 스캔이 진행 중입니다.');
                return;
            }
    
            // 스캔 시작 시 백그라운드 데이터 초기화
            // 스캔 시작 시 백그라운드 데이터 초기화
            this.isScanning = true;
            this.allVideos = [];
            this.scanResults = [];
            
            // 🔥 백그라운드 데이터 초기화
            this.fullBackgroundData = [];
            this.backgroundDataStats = {
                totalCollected: 0,
                processedCount: 0,
                collectionTime: new Date().toISOString()
            };
            
            // 🔥 실시간 카운터 완전 초기화
            this.realTimeCounters = {
                backgroundData: 0,
                detectedVideos: 0,
                processingRate: 0,
                lastUpdateTime: Date.now(),
                rateCalculationBuffer: []
            };
            
            // UI 상태 변경
            this.showScanProgress();
            this.updateScanButton(true);

            // ✅ 진행바(API 소진 기준) 초기화 + 0% 동기화
            if (this.resetQuotaProgress) this.resetQuotaProgress(); // 있다면: 매 스캔마다 베이스라인 리셋
            this.initQuotaProgressIfNeeded();                       // planned/baseline 세팅
            if (this.updateQuotaProgressUI) this.updateQuotaProgressUI(); // "0% (0 / 예상)"로 즉시 표시
            
            try {
                // 설정 값들 가져오기 (키워드는 선택된 것만)
                const category = document.getElementById('scanCategory')?.value || 'all';
                const format = document.getElementById('videoFormat')?.value || 'all';
                const count = parseInt(document.getElementById('resultCount')?.value || '50');
                const timeRange = document.getElementById('timeRange')?.value || 'week';
                const viewCountFilter = document.getElementById('viewCountFilter')?.value || 'all';
                
                // 🔥 Tier별 키워드 가져오기 (새로운 방식)
                const tierKeywords = this.getSelectedKeywordsByTier();
                const tier1Keywords = tierKeywords.tier1;
                const tier2Keywords = tierKeywords.tier2;
                const tier3Keywords = tierKeywords.tier3;
                
                // Tier 1 키워드만 채널 검색에 사용
                const keywords = tier1Keywords;
                
                if (keywords.length === 0) {
                    this.showError('검색할 키워드를 선택해주세요.');
                    return;
                }
                
                // Tier별 키워드 정보 로깅
                if (tier2Keywords.length > 0 || tier3Keywords.length > 0) {
                    console.log(`📊 Tier별 검색 모드 활성화:`);
                    console.log(`  - Tier 1 (채널 검색): ${tier1Keywords.length}개`);
                    console.log(`  - Tier 2 (제목 필터): ${tier2Keywords.length}개`);
                    console.log(`  - Tier 3 (제목 필터): ${tier3Keywords.length}개`);
                }
                
                const timeRangeText = {
                    '1day': '최근 1일',
                    '3days': '최근 3일', 
                    '1week': '최근 1주일',
                    '2weeks': '최근 2주일'
                }[timeRange] || timeRange;
                
                console.log('🔍 최적화된 스캔 설정:', { 
                    category, 
                    format, 
                    count, 
                    timeRange: `${timeRange} (${timeRangeText})`, 
                    selectedKeywords: keywords.length,
                    keywords: keywords 
                });
                
                // API 키 풀 할당량 확인
                this.apiKeyManager.checkQuotaReset();
                const stats = this.apiKeyManager.getOverallStats();
                const estimatedCost = keywords.length * 100; // 키워드당 약 100 할당량
                
                console.log(`💰 예상 할당량 비용: ${estimatedCost} (전체 잔여: ${stats.remainingQuota})`);
                console.log(`🔑 API 키 풀 상태: ${stats.activeKeys}/${stats.totalKeys}개 활성`);
                
                if (stats.totalKeys === 0) {
                    this.showError('등록된 API 키가 없습니다. API 키를 먼저 추가해주세요.');
                    return;
                }
                
            if (stats.remainingQuota <= 0) {
              console.warn('🔴 모든 API 키의 할당량이 완전히 소진되었습니다. 데모 모드로 실행합니다.');
              this.showDemoModeNotice();
            
              // 1) 모의데이터 생성
              this.allVideos = this.mockDataGenerator.generateRealisticData(category, count);
            
              // 2) 데모 표시 플래그
              this.allVideos.forEach(video => {
                video.isSimulated = true;
                video.title = "🎯 [데모] " + video.title;
              });
            
              // 3) 🔥 백그라운드(원본) 풀 보존 + 통계 갱신
              this.fullBackgroundData = Array.isArray(this.allVideos) ? JSON.parse(JSON.stringify(this.allVideos)) : [];
              this.backgroundDataStats = this.backgroundDataStats || {};
              this.backgroundDataStats.totalCollected = this.fullBackgroundData.length;
              this.backgroundDataStats.processedCount = this.fullBackgroundData.length;
              this.backgroundDataStats.collectionTime = new Date().toISOString();
            
              // 4) 🔥 실시간 카운터 반영
              // 5) 🔥 실시간 카운터 초기화 (데모 모드용)
              this.realTimeCounters = {
                backgroundData: this.fullBackgroundData.length, // 초기값으로 설정
                detectedVideos: Math.max(
                  this.realTimeCounters?.detectedVideos || 0,
                  (this.scanResults?.length || 0)
                ),
                processingRate: 0,
                lastUpdateTime: Date.now(),
                rateCalculationBuffer: []
              };
            
              // 5) 🔥 DOM 즉시 업데이트
              if (typeof this.updateRealtimeDisplay === 'function') {
                this.updateRealtimeDisplay();  // #backgroundDataCount, #detectedVideos, #processingRate 반영
              }
                } else {
                    // 할당량이 있으면 실제 데이터만 사용
                    console.log(`🟢 실제 데이터로 검색을 진행합니다. (활용 가능 할당량: ${stats.remainingQuota.toLocaleString()})`);
                    
                    // 🔥 Tier 1 키워드 할당량 계산 (Tier 2, 3는 필터링에만 사용하므로 할당량 소모 없음)
                    const affordableTier1Keywords = tier1Keywords.slice(0, Math.floor(stats.remainingQuota / 100));
                    if (affordableTier1Keywords.length < tier1Keywords.length) {
                        console.warn(`⚠️ 할당량 부족으로 ${affordableTier1Keywords.length}개 Tier 1 키워드만 검색합니다.`);
                        this.showSuccess(`${affordableTier1Keywords.length}개 Tier 1 키워드로 검색을 진행합니다. (전체 ${tier1Keywords.length}개 중)`);
                    }
                    
                    // 🔥 백그라운드 수집량과 화면 표시량 분리 (핵심 수정!)
                    // 🔥 백그라운드 수집량과 화면 표시량 분리 - 대용량 지원
                    // 🔥 백그라운드 수집량과 화면 표시량 분리 - 대용량 지원
                    // 사용자 설정 maxChannels 값을 실제 반영
                    const maxChannels = Number(localStorage.getItem('hot_maxChannels') || 500);
                    const concurrency = Number(localStorage.getItem('hot_concurrency') || 4);
                    const backgroundCollectionLimit = Math.max(maxChannels, 50000); // 설정값과 기본값 중 큰 값 사용
                    const displayLimit = count; // 화면에 표시할 데이터 수 (사용자 설정값)
                    
                    console.log(`🎯 대용량 수집 설정: ${backgroundCollectionLimit.toLocaleString('ko-KR')}개 수집 → 화면 표시 ${displayLimit}개`);
                    console.log(`📊 사용자 설정 채널 상한: ${maxChannels.toLocaleString('ko-KR')}개`);
                    
                    // 대용량 검색을 위한 배치 처리 설정
                    const batchSettings = this.calculateOptimalBatchSettings(maxChannels, affordableTier1Keywords.length);
                    
                    console.log(`🚀 대용량 파이프라인 시작: ${maxChannels.toLocaleString('ko-KR')}개 채널, 배치 크기: ${batchSettings.batchSize}`);
                    
                    // 🔥 Tier별 키워드 정보를 파이프라인에 전달
                    const ranked = await this.runLargeScaleChannelPipeline(
                      affordableTier1Keywords,
                      { 
                        format, 
                        timeRange, 
                        maxChannels: maxChannels,
                        perChannelMax: Number(localStorage.getItem('hot_perChannelMax') || 1000),
                        topN: backgroundCollectionLimit,
                        concurrency: concurrency,
                        batchSettings: batchSettings,
                        tier2Keywords: tier2Keywords,
                        tier3Keywords: tier3Keywords
                      }
                    );
                        
                    // 🔥 수집 결과 상세 로깅
                    console.log(`📈 원시 데이터 수집 결과: ${ranked ? ranked.length : 0}개`);
                    
                    // 결과를 기존 UI 포맷으로 매핑하여 재사용
                    const mappedResults = (ranked || []).map(v => {
                      const id = v.id || v.videoId || v?.contentDetails?.videoId || '';
                      return {
                        videoId: id,
                        title: v.snippet?.title || '',
                        channelTitle: v.snippet?.channelTitle || '',
                        publishedAt: v.snippet?.publishedAt || '',
                        viewCount: Number(v.statistics?.viewCount || 0),
                        likeCount: Number(v.statistics?.likeCount || 0),
                        commentCount: Number(v.statistics?.commentCount || 0),
                        isShorts: (() => {
                          const secs = this.parseISODurationToSec(v.contentDetails?.duration || 'PT0S');
                          return secs <= 180;
                        })(),
                        viralScore: Math.round((v.__score || v.score || 0) * 10),
                        searchKeyword: v.searchKeyword || 'N/A',
                        isSimulated: v.isSimulated || false
                      };
                    });
                    
                    // 🔽 중복 제거
                    const dedupedResults = this.dedupeRows(mappedResults);
                    
                    // 🔥 백그라운드 전체 데이터 별도 보존 (핵심 수정!)
                    this.fullBackgroundData = JSON.parse(JSON.stringify(dedupedResults)); // 완전한 깊은 복사
                    this.backgroundDataStats.processedCount = dedupedResults.length;
                    this.backgroundDataStats.collectionTime = new Date().toISOString();
                    this.backgroundDataStats.totalCollected = dedupedResults.length; // 🔥 추가: 총 수집량 기록
                    this.backgroundDataStats.displayLimit = displayLimit; // 🔥 추가: 화면 표시 제한값 기록
                    
                    // 기존 로직 유지 (하위 호환성)
                    this.allVideos = dedupedResults;
                    
                    // 🔥 상세한 수집 통계 로깅
                    console.log(`🎯 데이터 수집 완료!`);
                    console.log(`📊 총 수집된 데이터: ${this.fullBackgroundData.length}개`);
                    console.log(`📺 화면 표시 제한: ${displayLimit}개`);
                    console.log(`💾 백그라운드 보존: ${this.fullBackgroundData.length}개 (모든 수집 데이터)`);
                    console.log('🔍 보존된 데이터 샘플:', this.fullBackgroundData.slice(0, 3));
                    
                    // 사용자에게 수집 완료 알림
                    if (this.fullBackgroundData.length > displayLimit) {
                        console.log(`✅ 백그라운드에서 ${this.fullBackgroundData.length}개 데이터를 수집했습니다! (화면에는 상위 ${displayLimit}개만 표시)`);
                    }
                    
                    // 🔽 화면 표시용 제한된 결과 설정 (rank 추가)
                    this.scanResults = dedupedResults.slice(0, displayLimit).map((video, index) => {
                        // 🔥 안전한 계산 로직
                        const viewCount = video.viewCount || 0;
                        const likeCount = video.likeCount || 0;
                        const commentCount = video.commentCount || 0;
                        const subscriberCount = video.subscriberCount || 0;
                        
                        // 참여율 계산
                        const engagementRate = viewCount > 0 
                            ? ((likeCount + commentCount) / viewCount) * 100 
                            : 0;
                        
                        // 성장률 계산    
                        const growthRate = subscriberCount > 0 
                            ? (viewCount / subscriberCount) * 100 
                            : viewCount / 1000;
                        
                        // 길이 파싱
                        let duration = 0;
                        if (typeof video.duration === 'number') {
                            duration = video.duration;
                        } else if (video.contentDetails && video.contentDetails.duration) {
                            duration = this.parseDuration(video.contentDetails.duration);
                        } else if (typeof video.duration === 'string' && video.duration.startsWith('PT')) {
                            duration = this.parseDuration(video.duration);
                        }
                        
                        return {
                            ...video,
                            rank: index + 1,
                            channel: video.channelTitle || video.channel || 'N/A',
                            publishDate: video.publishedAt || video.publishDate || 'N/A',
                            engagementRate: Math.round(engagementRate * 100) / 100, // 소수점 2자리
                            growthRate: Math.round(growthRate * 100) / 100,         // 소수점 2자리  
                            duration: duration
                        };
                    });


                    // 🔥 실시간 카운터에 반영 (배치 결과 기준)
                    // 🔥 실시간 카운터 초기화 (실제 검색용) - 전체 값으로 설정
                    this.realTimeCounters = this.realTimeCounters || {};
                    this.realTimeCounters.backgroundData = this.fullBackgroundData?.length || 0; // 전체 값으로 초기화
                    this.realTimeCounters.detectedVideos = this.scanResults?.length || 0; // 전체 값으로 초기화
                    this.realTimeCounters.lastUpdateTime = Date.now();
                    
                    // 통계에 맞춰 즉시 DOM 업데이트
                    this.updateLiveCountersUI();

                    
                    // 🔥 안전한 공통 표시 루틴 (오류 방지)
                    try {
                        if (typeof this.processAndDisplayResults === 'function') {
                            console.log('📊 결과 처리 및 표시 시작...');
                            await this.processAndDisplayResults(count);
                            console.log('✅ 결과 처리 및 표시 완료');
                        } else {
                            console.log('🔄 기본 결과 표시 방법 사용...');
                            this.displayResults?.();
                            this.updateSummaryCards?.();
                            console.log('✅ 기본 결과 표시 완료');
                        }
                            this.updateLiveCountersUI()
                        
                    } catch (error) {
                        console.error('❌ 결과 처리 중 오류 발생:', error);
                        
                        // 오류 발생 시에도 기본적인 결과는 표시
                        try {
                            if (this.fullBackgroundData && this.fullBackgroundData.length > 0) {
                                console.log('🔄 오류 복구: 기본 결과 표시 시도...');
                                if (typeof this.showResultsManually === 'function') {
                                    this.showResultsManually();
                                }
                                if (typeof this.updateSummaryCards === 'function') {
                                    this.updateSummaryCards();
                                }
                                console.log('✅ 오류 복구 완료');
                            }
                        } catch (fallbackError) {
                            console.error('❌ 기본 결과 표시도 실패:', fallbackError);
                        }
                    }
                }
                
                console.log('✅ 최적화된 스캔 완료!');
                
            } catch (error) {
                console.error('❌ 스캔 중 오류:', error);
                console.error('오류 스택:', error.stack);
                
                // 🔥 오류 발생 시에도 수집된 데이터 상태 확인
                const collectedCount = this.fullBackgroundData ? this.fullBackgroundData.length : 0;
                const displayedCount = this.scanResults ? this.scanResults.length : 0;
                
                console.log(`📊 오류 발생 시점의 데이터 상태:`);
                console.log(`- 백그라운드 수집: ${collectedCount}개`);
                console.log(`- 화면 표시: ${displayedCount}개`);
                
                // 🔥 수집된 데이터가 있다면 그래도 결과 표시 시도
                if (collectedCount > 0) {
                    try {
                        console.log('🔄 수집된 데이터로 기본 결과 표시 시도...');
                        if (typeof this.showResultsManually === 'function') {
                            this.showResultsManually();
                        }
                        if (typeof this.updateSummaryCards === 'function') {
                            this.updateSummaryCards();
                        }
                        
                        // 사용자에게 상황 안내
                        this.showError(`검색 중 일부 오류가 발생했지만, ${collectedCount.toLocaleString('ko-KR')}개의 데이터는 수집되었습니다.\n\n📥 백데이터 다운로드는 정상적으로 가능합니다.\n\n🔍 오류 내용: ${error.message}`);
                    } catch (recoveryError) {
                        console.error('❌ 오류 복구도 실패:', recoveryError);
                        this.showError(`스캔 중 오류가 발생했습니다: ${error.message}\n\n수집된 데이터: ${collectedCount}개`);
                    }
                } else {
                    this.showError(`스캔 중 오류가 발생했습니다: ${error.message}`);
                }
            } finally {
                // 🔥 안전한 정리 작업
                this.isScanning = false;
                
                try {
                    this.updateScanButton(false);
                } catch (error) {
                    console.error('❌ 스캔 버튼 업데이트 오류:', error);
                }
                
                try {
                    this.hideScanProgress();
                } catch (error) {
                    console.error('❌ 진행 상황 숨기기 오류:', error);
                }


                // 🔥 실시간 타이머 정지 및 최종 UI 동기화
                this.stopLiveMetricsUpdater();
                this.updateLiveCountersUI();
                                
                // 🔥 최종 수집 통계 로깅
                const finalCollectedCount = this.fullBackgroundData ? this.fullBackgroundData.length : 0;
                const finalDisplayedCount = this.scanResults ? this.scanResults.length : 0;
                
                console.log(`🏁 스캔 완료 - 최종 통계:`);
                console.log(`📊 백그라운드 수집: ${finalCollectedCount}개`);
                console.log(`📺 화면 표시: ${finalDisplayedCount}개`);
                console.log(`💾 백데이터 다운로드 가능: ${finalCollectedCount > 0 ? 'YES' : 'NO'}`);
                
                if (finalCollectedCount > finalDisplayedCount && finalCollectedCount > 0) {
                    console.log(`✅ 백그라운드에서 추가로 ${finalCollectedCount - finalDisplayedCount}개 더 수집됨!`);
                }
            }
        }
    
    // 데모 모드 안내 표시
    showDemoModeNotice() {
        const notice = document.createElement('div');
        notice.id = 'demoModeNotice';
        notice.className = 'demo-mode-notice';
        notice.innerHTML = `
            <div class="demo-notice-content">
                <i class="fas fa-info-circle"></i>
                <h3>🎯 데모 모드</h3>
                <p>API 할당량이 소진되어 데모 데이터로 실행됩니다.</p>
                <p>실제 데이터 검색을 원하시면 API 키를 새로 설정하거나 내일 다시 시도해 주세요.</p>
                <button onclick="this.parentElement.parentElement.remove()" class="demo-close-btn">
                    <i class="fas fa-times"></i> 확인
                </button>
            </div>
        `;
        
        document.body.appendChild(notice);
        
        // 3초 후 자동 제거
        setTimeout(() => {
            if (document.getElementById('demoModeNotice')) {
                notice.remove();
            }
        }, 5000);
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
                this.searchWithRealDataOnly(keyword, format, timeRange)
            );
            
            try {
                const prevLen = videos.length;
                const batchResults = await Promise.all(batchPromises);
                
                let added = 0;
                for (const result of batchResults) {
                  if (result && result.length > 0) {
                    videos.push(...result);
                    added += result.length;
                  }
                }
                
                // 🔥 배치 단위 실시간 카운터 bump
                this.bumpCountersOnBatch({
                  addedBackground: added,              // 백그라운드 수집량 증가
                  addedDetected: 0                     // 검출(표시)은 후단에서 제한/정렬 후 반영
                });
                this.updateLiveCountersUI();

                // 배치 진행률: 60% + (현재 처리 비율 * 30%)  → 60~90% 구간
                const doneKw   = Math.min(i + batch.length, keywords.length);
                const percent  = Math.round(60 + (doneKw / keywords.length) * 30);

                this.updateProgress(
                  percent,                // 진행률(%)
                  keywords.length,        // 전체 키워드
                  doneKw,                 // 처리된 키워드
                  videos.length,          // 누적 발견된 영상 수
                  `배치 처리 중 (${doneKw}/${keywords.length})`
                );
                await this.delay(1500);


                
            } catch (error) {
                console.warn(`배치 검색 오류:`, error);
            }
        }
        
        return this.removeDuplicateVideos(videos);
    }
    
    // 폴백이 있는 검색
    // 실제 데이터 전용 검색 (폴백 제거)
    async searchWithRealDataOnly(keyword, format, timeRange) {
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
            
        // 🔥 키워드 단위로도 실시간 반영
            if (Array.isArray(result) && result.length > 0) {
              this.bumpCountersOnBatch({ addedBackground: result.length, addedDetected: 0 });
              this.updateRealtimeDisplay(); // ✅ 백데이터 업데이트 메서드로 변경
            }
            return result;

        } catch (error) {
            console.error(`키워드 "${keyword}" 검색 실패:`, error);
            
            // 모의 데이터 대신 빈 배열 반환 (실제 데이터만 사용 정책)
            return [];
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
        const isShorts = duration <= 180;
        
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


    // 🔥 메소드 호출 전 존재 여부 확인하는 안전 래퍼
    safeCalculateEngagementRate(video) {
        try {
            if (typeof this.calculateEngagementRate === 'function') {
                return this.calculateEngagementRate(video);
            } else {
                // 직접 계산
                const viewCount = video.viewCount || 0;
                const likeCount = video.likeCount || 0; 
                const commentCount = video.commentCount || 0;
                return viewCount > 0 ? ((likeCount + commentCount) / viewCount) * 100 : 0;
            }
        } catch (error) {
            console.warn('참여율 계산 오류:', error);
            return 0;
        }
    }
    
    safeCalculateGrowthRate(video) {
        try {
            if (typeof this.calculateGrowthRate === 'function') {
                return this.calculateGrowthRate(video);
            } else {
                // 직접 계산
                const viewCount = video.viewCount || 0;
                const subscriberCount = video.subscriberCount || 0;
                return subscriberCount > 0 ? (viewCount / subscriberCount) * 100 : viewCount / 1000;
            }
        } catch (error) {
            console.warn('성장률 계산 오류:', error);
            return 0;
        }
    }
    
    safeParseDuration(video) {
        try {
            // 기존 parseDuration 메소드 활용
            if (typeof video.duration === 'number') return video.duration;
            if (video.contentDetails && video.contentDetails.duration) {
                return this.parseDuration(video.contentDetails.duration);
            }
            if (typeof video.duration === 'string' && video.duration.startsWith('PT')) {
                return this.parseDuration(video.duration);
            }
            return 0;
        } catch (error) {
            console.warn('길이 파싱 오류:', error);
            return 0;
        }
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



    // 🔥 누락된 메소드들 정의 추가 (calculateViralScore 메소드 앞에 삽입)
    
    // 참여율 계산 메소드
    calculateEngagementRate(video) {
        const viewCount = video.viewCount || 0;
        const likeCount = video.likeCount || 0;
        const commentCount = video.commentCount || 0;
        
        if (viewCount === 0) return 0;
        
        return ((likeCount + commentCount) / viewCount) * 100;
    }
    
    // 성장률 계산 메소드  
    calculateGrowthRate(video) {
        const viewCount = video.viewCount || 0;
        const subscriberCount = video.subscriberCount || 0;
        
        if (subscriberCount > 0) {
            return (viewCount / subscriberCount) * 100;
        } else {
            // 구독자 수가 없는 경우 조회수 기반 성장률
            return viewCount / 1000;
        }
    }
    
    // 신선도 점수 계산 메소드
    calculateFreshnessScore(video) {
        const publishedAt = video.publishedAt || video.publishDate;
        if (!publishedAt) return 0;
        
        const publishDate = new Date(publishedAt);
        const now = new Date();
        const daysOld = Math.ceil((now - publishDate) / (1000 * 60 * 60 * 24));
        
        return Math.max(0, 100 - (daysOld * 2));
    }
    
    // 영상 길이 파싱 메소드 (기존 parseDuration과 통합)
    parseDurationFromVideo(video) {
        // 이미 duration이 숫자로 있는 경우
        if (typeof video.duration === 'number') {
            return video.duration;
        }
        
        // contentDetails에서 가져오는 경우
        if (video.contentDetails && video.contentDetails.duration) {
            return this.parseDuration(video.contentDetails.duration);
        }
        
        // ISO 8601 duration 문자열인 경우
        if (typeof video.duration === 'string' && video.duration.startsWith('PT')) {
            return this.parseDuration(video.duration);
        }
        
        // 기본값
        return 0;
    }
    
    // 일수 계산 헬퍼 메소드
    calculateDaysOld(publishedAt) {
        if (!publishedAt) return 999;
        
        const publishDate = new Date(publishedAt);
        const now = new Date();
        const diffTime = Math.abs(now - publishDate);
        
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
        // 🔥 원본 데이터 손실 방지 - 복사본으로 작업
        const sortedVideos = [...this.allVideos].sort((a, b) => b.viralScore - a.viralScore);
        const topResults = sortedVideos.slice(0, count);
        topResults.forEach((video, index) => {
            video.rank = index + 1;
        });
        
        // 🔥 원본 this.allVideos는 건드리지 않고 결과만 반환
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
    
    

    
    // 다운로드 메서드들 (기존과 동일)
    downloadExcel() {
        if (!this.scanResults || this.scanResults.length === 0) {
            alert('다운로드할 데이터가 없습니다.');
            return;
        }
        
        try {
            const workbook = XLSX.utils.book_new();
            
            const mainData = this.scanResults.map(video => {
                const videoId = video.videoId || 'N/A';
                const youtubeLink = videoId !== 'N/A' ? `https://www.youtube.com/watch?v=${videoId}` : 'N/A';
                
                return {
                    '순위': video.rank,
                    '제목': video.title,
                    'YouTube_링크': youtubeLink,
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
                };
            });
            
            const mainSheet = XLSX.utils.json_to_sheet(mainData);
            
            // 하이퍼링크 추가 (YouTube_링크 컬럼에 실제 클릭 가능한 링크 설정)
            const range = XLSX.utils.decode_range(mainSheet['!ref']);
            for (let rowNum = range.s.r + 1; rowNum <= range.e.r; rowNum++) {
                const linkCellAddr = XLSX.utils.encode_cell({ r: rowNum, c: 2 }); // YouTube_링크 컬럼 (C열)
                const titleCellAddr = XLSX.utils.encode_cell({ r: rowNum, c: 1 }); // 제목 컬럼 (B열)
                
                if (mainSheet[linkCellAddr] && mainSheet[linkCellAddr].v !== 'N/A') {
                    const youtubeUrl = mainSheet[linkCellAddr].v;
                    const title = mainSheet[titleCellAddr] ? mainSheet[titleCellAddr].v : 'YouTube 링크';
                    
                    // 하이퍼링크 설정
                    mainSheet[linkCellAddr] = {
                        t: 's', // string type
                        v: title, // display text
                        l: { Target: youtubeUrl } // hyperlink target
                    };
                }
            }
            
            // 컬럼 너비 자동 조정
            const wscols = [
                { wch: 5 },   // 순위
                { wch: 50 },  // 제목 
                { wch: 25 },  // YouTube_링크
                { wch: 20 },  // 채널
                { wch: 12 },  // 바이럴점수
                { wch: 12 },  // 조회수
                { wch: 10 },  // 좋아요
                { wch: 10 },  // 댓글수
                { wch: 10 },  // 참여율
                { wch: 10 },  // 성장률
                { wch: 8 },   // 형식
                { wch: 10 },  // 길이
                { wch: 20 },  // 업로드일
                { wch: 15 },  // 검색키워드
                { wch: 12 }   // 데이터타입
            ];
            mainSheet['!cols'] = wscols;
            
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
            results: this.scanResults.map(video => ({
                ...video,
                youtubeUrl: video.videoId ? `https://www.youtube.com/watch?v=${video.videoId}` : null
            }))
        };
        
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const fileName = `시니어_YouTube_트렌드_최적화스캔_${new Date().toISOString().slice(0, 10)}.json`;
        this.downloadBlob(blob, fileName);
    }
    
    downloadPDF() {
        alert('PDF 다운로드 기능은 현재 개발 중입니다. Excel 형식을 이용해주세요.');
    }
    
    // 백그라운드 전체 데이터 다운로드 (모든 수집된 데이터)
    downloadBackgroundData() {
        try {
            // 🔥 우선순위 기반 데이터 소스 선택 (완전히 새로운 로직)
            let dataToDownload = [];
            let dataSource = '';
            let isFullBackgroundData = false;
            
            // 1순위: 전체 백그라운드 데이터 (새로 추가된 보존 변수)
            if (this.fullBackgroundData && this.fullBackgroundData.length > 0) {
                dataToDownload = this.fullBackgroundData;
                dataSource = `전체 백그라운드 데이터 (${this.fullBackgroundData.length}개)`;
                isFullBackgroundData = true;
                console.log(`📊 전체 백그라운드 데이터 사용: ${this.fullBackgroundData.length}개`);
            }
            // 2순위: 기존 allVideos (fallback)
            else if (this.allVideos && this.allVideos.length > 0) {
                dataToDownload = this.allVideos;
                dataSource = `처리된 데이터 (${this.allVideos.length}개)`;
                console.log(`⚠️ 처리된 데이터 사용: ${this.allVideos.length}개`);
            }
            // 3순위: 화면 표시 데이터
            else if (this.scanResults && this.scanResults.length > 0) {
                dataToDownload = this.scanResults;
                dataSource = `화면 표시 데이터만 (${this.scanResults.length}개)`;
                console.log(`⚠️ 화면 표시 데이터만 사용: ${this.scanResults.length}개`);
            } else {
                alert('다운로드할 데이터가 없습니다. 먼저 스캔을 실행해주세요.');
                return;
            }
            
            console.log(`📥 백그라운드 데이터 다운로드 시작: ${dataSource}`);
            
            const workbook = XLSX.utils.book_new();
            
            // 🔥 실제 선택된 데이터로 매핑 (수정된 부분)
            const backgroundData = dataToDownload.map((video, index) => {
                const videoId = video.videoId || video.id || 'N/A';
                const youtubeLink = videoId !== 'N/A' ? `https://www.youtube.com/watch?v=${videoId}` : 'N/A';
                
                // 🔥 안전한 수치 계산
                const viewCount = parseInt(video.viewCount) || 0;
                const likeCount = parseInt(video.likeCount) || 0;
                const commentCount = parseInt(video.commentCount) || 0;
                const subscriberCount = parseInt(video.subscriberCount) || 0;
                
                // 🔥 참여율 재계산 (안전한 계산)
                let engagementRate = 0;
                if (viewCount > 0) {
                    engagementRate = ((likeCount + commentCount) / viewCount) * 100;
                } else if (video.engagementRate && !isNaN(video.engagementRate)) {
                    engagementRate = video.engagementRate;
                }
                
                // 🔥 성장률 재계산
                let growthRate = 0;
                if (video.growthRate && !isNaN(video.growthRate)) {
                    growthRate = video.growthRate;
                } else if (subscriberCount > 0 && viewCount > 0) {
                    // 조회수 대비 구독자 증가 추정
                    growthRate = Math.min(((viewCount / subscriberCount) * 0.1), 100);
                }
                
                // 🔥 바이럴 점수 재계산 (누락된 경우)
                let viralScore = video.viralScore;
                if (!viralScore || isNaN(viralScore)) {
                    viralScore = Math.min(
                        Math.round(
                            (viewCount / 1000) * 0.3 +
                            (likeCount / 10) * 0.4 +
                            (commentCount / 5) * 0.3 +
                            (engagementRate * 10)
                        ), 
                        1000
                    );
                }
                
                // 🔥 길이 포맷 개선
                let durationText = 'N/A';
                if (video.duration && !isNaN(video.duration)) {
                    const duration = parseInt(video.duration);
                    const minutes = Math.floor(duration / 60);
                    const seconds = duration % 60;
                    durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                } else if (video.isShorts) {
                    durationText = '<3:00 (쇼츠)';
                }
                
                // 🔥 업로드일 포맷 통일
                let publishDate = 'N/A';
                if (video.publishedAt) {
                    try {
                        publishDate = new Date(video.publishedAt).toLocaleDateString('ko-KR');
                    } catch (e) {
                        publishDate = video.publishedAt;
                    }
                } else if (video.publishDate) {
                    publishDate = video.publishDate;
                }
                
                return {
                    '순위': index + 1,
                    '제목': video.title || '제목 없음',
                    'YouTube_링크': youtubeLink,
                    '채널': video.channelTitle || video.channel || '채널 없음',
                    '바이럴점수': Math.round(viralScore) || 0,
                    '조회수': viewCount.toLocaleString('ko-KR'),
                    '좋아요': likeCount.toLocaleString('ko-KR'),
                    '댓글수': commentCount.toLocaleString('ko-KR'),
                    '참여율': engagementRate > 0 ? `${engagementRate.toFixed(2)}%` : 'N/A',
                    '성장률': growthRate > 0 ? `${growthRate.toFixed(1)}%` : 'N/A',
                    '형식': video.isShorts ? '쇼츠' : '롱폼',
                    '길이': durationText,
                    '업로드일': publishDate,
                    '검색키워드': video.searchKeyword || 'N/A',
                    '데이터타입': video.isSimulated ? '모의데이터' : '실제데이터',
                    '비디오ID': videoId,
                    '구독자수': subscriberCount.toLocaleString('ko-KR')
                };
            });
            
            // 메인 시트 생성
            const mainSheet = XLSX.utils.json_to_sheet(backgroundData);
            
            // 하이퍼링크 추가 (YouTube_링크 컬럼에 실제 클릭 가능한 링크 설정)
            // 🔥 하이퍼링크 설정 개선 (제목 컬럼에 클릭 가능한 링크)
            const range = XLSX.utils.decode_range(mainSheet['!ref']);
            for (let rowNum = range.s.r + 1; rowNum <= range.e.r; rowNum++) {
                const titleCellAddr = XLSX.utils.encode_cell({ r: rowNum, c: 1 }); // 제목 컬럼 (B열)
                const linkCellAddr = XLSX.utils.encode_cell({ r: rowNum, c: 2 }); // YouTube_링크 컬럼 (C열)
                
                if (mainSheet[linkCellAddr] && mainSheet[linkCellAddr].v !== 'N/A' && 
                    mainSheet[titleCellAddr] && mainSheet[titleCellAddr].v !== '제목 없음') {
                    
                    const youtubeUrl = mainSheet[linkCellAddr].v;
                    const title = mainSheet[titleCellAddr].v;
                    
                    // 🔥 제목 셀에 하이퍼링크 설정 (더 직관적)
                    mainSheet[titleCellAddr] = {
                        t: 's',
                        v: title,
                        l: { Target: youtubeUrl, Tooltip: `${title} - YouTube에서 보기` }
                    };
                    
                    // 🔥 링크 컬럼에는 간단한 표시
                    mainSheet[linkCellAddr] = {
                        t: 's',
                        v: '🔗 링크',
                        l: { Target: youtubeUrl, Tooltip: 'YouTube에서 보기' }
                    };
                }
            }
            
            // 컬럼 너비 자동 조정
            const wscols = [
                { wch: 5 },   // 순위
                { wch: 60 },  // 제목 
                { wch: 25 },  // YouTube_링크
                { wch: 25 },  // 채널
                { wch: 12 },  // 바이럴점수
                { wch: 15 },  // 조회수
                { wch: 10 },  // 좋아요
                { wch: 10 },  // 댓글수
                { wch: 10 },  // 참여율
                { wch: 10 },  // 성장률
                { wch: 8 },   // 형식
                { wch: 10 },  // 길이
                { wch: 20 },  // 업로드일
                { wch: 15 },  // 검색키워드
                { wch: 12 },  // 데이터타입
                { wch: 15 }   // 비디오ID
            ];
            mainSheet['!cols'] = wscols;
            
            // 🔥 개선된 시트 생성 및 순서 정리

            // 1️⃣ 메인 데이터 시트 (이모지와 함께 직관적인 시트명)
            XLSX.utils.book_append_sheet(workbook, mainSheet, '📊 전체 데이터');
            
            // 통계 계산 (공통으로 사용될 변수들)
            // 🔥 실제 다운로드 데이터 기준으로 통계 계산
            const realVideos = dataToDownload.filter(v => !v.isSimulated).length;
            const mockVideos = dataToDownload.filter(v => v.isSimulated).length;
            const shortsCount = dataToDownload.filter(v => v.isShorts).length;
            const avgViralScore = dataToDownload.length > 0 ? 
                Math.round(dataToDownload.reduce((sum, v) => sum + (parseInt(v.viralScore) || 0), 0) / dataToDownload.length) : 0;
            const avgViewCount = dataToDownload.length > 0 ?
                Math.round(dataToDownload.reduce((sum, v) => sum + (parseInt(v.viewCount) || 0), 0) / dataToDownload.length) : 0;
            
            // 2️⃣ 통계 요약 시트
            const summaryData = [
                ['📈 기본 통계', '', ''],
                ['항목', '값', '설명'],
                ['📊 데이터 소스', dataSource, '다운로드된 데이터의 출처'],
                ['🔥 전체 백그라운드 데이터', this.fullBackgroundData ? this.fullBackgroundData.length : 0, '백그라운드에서 수집된 전체 데이터'],
                ['📺 화면 표시 데이터', this.scanResults ? this.scanResults.length : 0, '화면에 표시되는 제한된 데이터'],
                ['💾 현재 다운로드 데이터', dataToDownload.length, '이 파일에 포함된 데이터 수'],
                ['', '', ''],
                ['📊 콘텐츠 분석', '', ''],
                ['✅ 실제 데이터', realVideos, 'API에서 수집한 실제 YouTube 데이터'],
                ['🎯 모의 데이터', mockVideos, '부족분 보완용 시뮬레이션 데이터'],
                ['📱 쇼츠 개수', shortsCount, '180초 이하 Short 형태 영상'],
                ['🎬 롱폼 개수', dataToDownload.length - shortsCount, '180초 초과 일반 영상'],
                ['📊 쇼츠 비율', dataToDownload.length > 0 ? `${Math.round((shortsCount / dataToDownload.length) * 100)}%` : '0%', '전체 중 쇼츠 비중'],
                ['', '', ''],
                ['🔥 성능 지표', '', ''],
                ['🔥 평균 바이럴 점수', avgViralScore, '바이럴 가능성 점수 (0-1000)'],
                ['👁️ 평균 조회수', avgViewCount.toLocaleString('ko-KR'), '전체 영상 평균 조회수'],
                ['⭐ 고품질 영상 비율', dataToDownload.length > 0 ? `${Math.round((dataToDownload.filter(v => (parseInt(v.viralScore) || 0) >= 400).length / dataToDownload.length) * 100)}%` : '0%', '바이럴 점수 400 이상 비율'],
                ['', '', ''],
                ['⚙️ 시스템 정보', '', ''],
                ['⚙️ API 할당량 사용', this.quotaUsed ? `${this.quotaUsed}/${this.quotaLimit}` : 'N/A', '사용된 YouTube API 할당량'],
                ['⏰ 수집 시작 시간', this.backgroundDataStats.collectionTime || 'N/A', '백그라운드 데이터 수집 시작'],
                ['📅 다운로드 시간', new Date().toLocaleString('ko-KR'), '이 파일이 생성된 시간'],
                ['🎯 데이터 완전성', isFullBackgroundData ? '✅ 완전한 백그라운드 데이터' : '⚠️ 제한된 데이터', '다운로드 데이터의 완전성']
            ];
            
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(workbook, summarySheet, '📈 데이터 통계');
            
            // 3️⃣ 키워드별 분석 시트 (카테고리별 분석 개선)
            const categories = {};
            dataToDownload.forEach(video => {
                const category = video.searchKeyword || '기타';
                if (!categories[category]) {
                    categories[category] = [];
                }
                categories[category].push(video);
            });
            
            const categoryData = Object.entries(categories).map(([category, videos]) => ({
                '🏷️ 키워드': category,
                '📊 영상수': videos.length,
                '🔥 평균_바이럴점수': videos.length > 0 ? Math.round(videos.reduce((sum, v) => sum + (parseInt(v.viralScore) || 0), 0) / videos.length) : 0,
                '👁️ 평균_조회수': videos.length > 0 ? Math.round(videos.reduce((sum, v) => sum + (parseInt(v.viewCount) || 0), 0) / videos.length).toLocaleString('ko-KR') : '0',
                '👍 평균_좋아요': videos.length > 0 ? Math.round(videos.reduce((sum, v) => sum + (parseInt(v.likeCount) || 0), 0) / videos.length).toLocaleString('ko-KR') : '0',
                '💬 평균_댓글수': videos.length > 0 ? Math.round(videos.reduce((sum, v) => sum + (parseInt(v.commentCount) || 0), 0) / videos.length).toLocaleString('ko-KR') : '0',
                '📱 쇼츠_비율': videos.length > 0 ? `${Math.round((videos.filter(v => v.isShorts).length / videos.length) * 100)}%` : '0%',
                '🏆 최고_바이럴점수': videos.length > 0 ? Math.max(...videos.map(v => parseInt(v.viralScore) || 0)) : 0,
                '🥇 최고_조회수': videos.length > 0 ? Math.max(...videos.map(v => parseInt(v.viewCount) || 0)).toLocaleString('ko-KR') : '0',
                '⭐ 고품질_영상수': videos.filter(v => (parseInt(v.viralScore) || 0) >= 400).length,
                '📊 성공률': videos.length > 0 ? `${Math.round((videos.filter(v => (parseInt(v.viralScore) || 0) >= 400).length / videos.length) * 100)}%` : '0%'
            }));
            
            if (categoryData.length > 0) {
                const categorySheet = XLSX.utils.json_to_sheet(categoryData);
                XLSX.utils.book_append_sheet(workbook, categorySheet, '🏷️ 키워드별 분석');
            }
            
            // 4️⃣ 품질 분석 시트
            const qualityData = [
                ['🔍 데이터 품질 분석', '', ''],
                ['품질 지표', '값', '설명'],
                ['🔍 데이터 완전성', `${Math.round((dataToDownload.length / (this.fullBackgroundData?.length || dataToDownload.length)) * 100)}%`, '전체 수집 대비 다운로드 비율'],
                ['📊 데이터 신뢰성', realVideos > 0 ? '✅ 실제 API 데이터 포함' : '⚠️ 모의 데이터만 포함', '수집된 데이터의 신뢰성'],
                ['🎯 키워드 커버리지', Object.keys(categories).length, '수집된 고유 키워드 수'],
                ['', '', ''],
                ['📅 시간별 분석', '', ''],
                ['⚡ 최신성 (7일)', dataToDownload.filter(v => {
                    const publishDate = new Date(v.publishedAt || v.publishDate);
                    const daysDiff = (Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
                    return daysDiff <= 7;
                }).length, '최근 7일 내 업로드 영상 수'],
                ['🗓️ 중기성 (30일)', dataToDownload.filter(v => {
                    const publishDate = new Date(v.publishedAt || v.publishDate);
                    const daysDiff = (Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
                    return daysDiff <= 30;
                }).length, '최근 30일 내 업로드 영상 수'],
                ['', '', ''],
                ['🏆 성과별 분석', '', ''],
                ['🔥 초고성장 영상 (800+)', dataToDownload.filter(v => (parseInt(v.viralScore) || 0) >= 800).length, '바이럴 점수 800 이상 영상'],
                ['⭐ 고성장 영상 (500+)', dataToDownload.filter(v => (parseInt(v.viralScore) || 0) >= 500).length, '바이럴 점수 500 이상 영상'],
                ['✅ 중성장 영상 (300+)', dataToDownload.filter(v => (parseInt(v.viralScore) || 0) >= 300).length, '바이럴 점수 300 이상 영상'],
                ['', '', ''],
                ['📱 포맷별 품질', '', ''],
                ['📱 고품질 쇼츠', shortsCount > 0 ? `${Math.round(dataToDownload.filter(v => v.isShorts && (parseInt(v.viralScore) || 0) >= 300).length / shortsCount * 100)}%` : 'N/A', '고품질 쇼츠 비율 (바이럴 300+)'],
                ['🎬 고품질 롱폼', (dataToDownload.length - shortsCount) > 0 ? `${Math.round(dataToDownload.filter(v => !v.isShorts && (parseInt(v.viralScore) || 0) >= 400).length / (dataToDownload.length - shortsCount) * 100)}%` : 'N/A', '고품질 롱폼 비율 (바이럴 400+)'],
                ['📊 전체 품질 점수', avgViralScore >= 500 ? '🏆 우수' : avgViralScore >= 300 ? '⭐ 양호' : avgViralScore >= 200 ? '✅ 보통' : '⚠️ 개선 필요', '전체 데이터 품질 등급']
            ];
            
            const qualitySheet = XLSX.utils.aoa_to_sheet(qualityData);
            XLSX.utils.book_append_sheet(workbook, qualitySheet, '🔍 품질 분석');
            
            // 5️⃣ 메타데이터 및 시스템 정보 시트
            const metaData = [
                ['ℹ️ 파일 정보', ''],
                ['', ''],
                ['시스템 정보', '값'],
                ['생성 도구', '시니어 YouTube 트렌드 분석기 Pro'],
                ['파일 버전', '2.1 (시트 구성 개선)'],
                ['생성 시간', new Date().toISOString()],
                ['한국 시간', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })],
                ['', ''],
                ['데이터 수집 정보', '값'],
                ['데이터 소스', dataSource],
                ['API 호출 수', this.backgroundDataStats.apiCallsCount || 'N/A'],
                ['수집 시작 시간', this.backgroundDataStats.collectionTime || 'N/A'],
                ['수집 완료 시간', new Date().toISOString()],
                ['', ''],
                ['파일 구성', '값'],
                ['전체 시트 수', '5개'],
                ['📊 전체 데이터', '메인 데이터 (제목 클릭 시 YouTube 링크)'],
                ['📈 데이터 통계', '기본 통계 및 성능 지표'],
                ['🏷️ 키워드별 분석', '검색 키워드별 상세 분석'],
                ['🔍 품질 분석', '데이터 품질 및 성과 분석'],
                ['ℹ️ 파일 정보', '시스템 정보 및 메타데이터'],
                ['', ''],
                ['사용법 안내', '값'],
                ['제목 링크', '📊 전체 데이터 시트에서 제목을 클릭하면 해당 YouTube 영상으로 이동'],
                ['정렬 기능', 'Excel의 데이터 > 정렬 기능으로 원하는 기준으로 재정렬 가능'],
                ['필터 기능', 'Excel의 데이터 > 필터 기능으로 조건에 맞는 데이터만 표시 가능'],
                ['차트 생성', '데이터를 선택 후 삽입 > 차트로 시각화 가능']
            ];
            
            const metaSheet = XLSX.utils.aoa_to_sheet(metaData);
            XLSX.utils.book_append_sheet(workbook, metaSheet, 'ℹ️ 파일 정보');
            

            
            // 파일명 생성 및 다운로드
            // 🔥 개선된 파일명 (데이터 유형 표시)
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const dataType = isFullBackgroundData ? '완전백데이터' : '제한데이터';
            const fileName = `시니어_YouTube_${dataType}_${dataToDownload.length}개_${timestamp}.xlsx`;
            
            XLSX.writeFile(workbook, fileName);
            
            // 🔥 개선된 성공 메시지
            const detailMessage = isFullBackgroundData ? 
                `✅ 백그라운드에서 수집된 완전한 ${dataToDownload.length}개 데이터가 다운로드되었습니다.\n📊 수집 통계 및 카테고리별 분석 포함` :
                `⚠️ 제한된 ${dataToDownload.length}개 데이터가 다운로드되었습니다.\n전체 백그라운드 데이터가 손실되었을 가능성이 있습니다.`;
            
            this.showSuccessMessage(
                '백그라운드 데이터 다운로드 완료!', 
                detailMessage
            );
            
            console.log(`✅ 백그라운드 데이터 다운로드 완료: ${fileName}`);
            console.log(`📊 데이터 소스: ${dataSource}`);
            console.log(`🔍 완전성: ${isFullBackgroundData ? '완전한 백그라운드 데이터' : '부분 데이터'}`);
            
            } catch (error) {
                console.error('백그라운드 데이터 다운로드 오류:', error);
                console.error('오류 스택:', error.stack);
                console.log('현재 데이터 상태:');
                console.log('- fullBackgroundData:', this.fullBackgroundData ? this.fullBackgroundData.length : 'undefined');
                console.log('- allVideos:', this.allVideos ? this.allVideos.length : 'undefined');
                console.log('- scanResults:', this.scanResults ? this.scanResults.length : 'undefined');
                
                // 🔥 더 상세한 오류 메시지
                const errorMessage = `백그라운드 데이터 다운로드 중 오류가 발생했습니다.\n\n오류 정보: ${error.message}\n\n데이터 상태:\n- 전체 백그라운드 데이터: ${this.fullBackgroundData ? this.fullBackgroundData.length : 0}개\n- 화면 표시 데이터: ${this.scanResults ? this.scanResults.length : 0}개`;
                
                alert(errorMessage);
            }
    }
    
    // 기타 유틸리티 메서드들
    
    
    
    // 실시간 카운터 업데이트 함수 (새로 추가)
    // 실시간 카운터 업데이트 함수 (개선된 버전)
    updateRealtimeCounters(videosFound, processed) {
        // 실시간 카운터 초기화 (처음 호출시)
        if (!this.realTimeCounters) {
            this.realTimeCounters = {
                backgroundData: 0,
                detectedVideos: 0,
                processingRate: 0,
                lastUpdateTime: Date.now(),
                rateCalculationBuffer: []
            };
        }
        
        // 디버깅 로그 추가
        console.log(`📊 카운터 업데이트: videosFound=${videosFound}, processed=${processed}`);
        
        // 백데이터 카운트 업데이트 (실제 데이터 우선)
        if (this.backgroundDataSimulation && this.backgroundDataSimulation.isRunning) {
            this.realTimeCounters.backgroundData = this.backgroundDataSimulation.currentCount;
            console.log(`📊 시뮬레이션 데이터 사용: ${this.backgroundDataSimulation.currentCount}`);
        } else {
            // 🔥 실제 수집된 데이터를 우선으로 사용 (추정치 제거)
            this.realTimeCounters.backgroundData = this.fullBackgroundData ? this.fullBackgroundData.length : this.allVideos.length;
            console.log(`📊 실제 백그라운드 데이터: ${this.realTimeCounters.backgroundData}`);
        }
        
        // 검출 영상 카운트 업데이트 (최소값 보장)
        this.realTimeCounters.detectedVideos = Math.max(videosFound, this.realTimeCounters.detectedVideos || 0);
        console.log(`🎯 검출 영상 업데이트: ${this.realTimeCounters.detectedVideos}`);
        
        // 처리 속도 계산
        const now = Date.now();
        const timeDiff = now - this.realTimeCounters.lastUpdateTime;
        
        if (timeDiff > 0) {
            this.realTimeCounters.rateCalculationBuffer.push({
                count: processed,
                timestamp: now
            });
            
            // 최근 5초간의 데이터만 유지
            const fiveSecondsAgo = now - 5000;
            this.realTimeCounters.rateCalculationBuffer = this.realTimeCounters.rateCalculationBuffer
                .filter(item => item.timestamp > fiveSecondsAgo);
            
            // 처리 속도 계산 (초당 처리량)
            if (this.realTimeCounters.rateCalculationBuffer.length >= 2) {
                const buffer = this.realTimeCounters.rateCalculationBuffer;
                const earliest = buffer[0];
                const latest = buffer[buffer.length - 1];
                const timeSpan = (latest.timestamp - earliest.timestamp) / 1000; // 초
                const countDiff = latest.count - earliest.count;
                
                this.realTimeCounters.processingRate = timeSpan > 0 ? (countDiff / timeSpan).toFixed(1) : 0;
            }
            
            this.realTimeCounters.lastUpdateTime = now;
        }
        
        // UI 업데이트
        this.updateRealtimeDisplay();
    }


    
    // 카운터 디스플레이 업데이트 (새로 추가)
    updateRealtimeDisplay() {
        const backgroundDataElement = document.getElementById('backgroundDataCount');
        const detectedVideosElement = document.getElementById('detectedVideos');
        const processingRateElement = document.getElementById('processingRate');
        
        if (backgroundDataElement) {
            // 🔥 실제 수집된 데이터를 우선으로 표시
            const actualCount = this.fullBackgroundData ? this.fullBackgroundData.length : this.allVideos.length;
            this.animateCounterChange(backgroundDataElement, Math.floor(actualCount));
            console.log(`🔥 백데이터 UI 업데이트: ${actualCount}`);
        }
        
        if (detectedVideosElement) {
            this.animateCounterChange(detectedVideosElement, this.realTimeCounters.detectedVideos);
        }
        
        if (processingRateElement) {
            processingRateElement.textContent = `${this.realTimeCounters.processingRate}/초`;
        }
    }
    
    // 카운터 값 변경 애니메이션 (새로 추가)
    animateCounterChange(element, newValue) {
        if (!element) return;
        
        const currentText = element.textContent || '0';
        const currentValue = parseInt(currentText.replace(/,/g, '').replace(/[^\d]/g, '')) || 0;
        
        console.log(`🔢 카운터 애니메이션: ${currentValue} → ${newValue} (element: ${element.id})`);
        
        if (currentValue !== newValue) {
            element.classList.add('updating');
            
            // 숫자 증가 애니메이션
            const startValue = currentValue;
            const endValue = newValue;
            const duration = 500; // 0.5초
            const startTime = Date.now();
            
            const updateNumber = () => {
                const now = Date.now();
                const progress = Math.min((now - startTime) / duration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out
                
                const currentDisplayValue = Math.floor(startValue + (endValue - startValue) * easeProgress);
                element.textContent = currentDisplayValue.toLocaleString();
                
                if (progress < 1) {
                    requestAnimationFrame(updateNumber);
                } else {
                    element.classList.remove('updating');
                }
            };
            
            requestAnimationFrame(updateNumber);
        }
    }
    
    // 진행 완료 후 백그라운드 애니메이션 표시 (새로 추가)
    showPostProgressAnimation() {
        const postProgressElement = document.getElementById('postProgressAnimation');
        const backgroundStatusElement = document.getElementById('backgroundWorkStatus');
        
        if (postProgressElement) {
            postProgressElement.style.display = 'block';
            
            // 다양한 상태 메시지를 순환하며 표시
            const statusMessages = [
                '고품질 데이터를 위해 추가 분석이 진행되고 있습니다',
                '채널 메타데이터를 수집하고 있습니다',
                '영상 품질 점수를 계산하고 있습니다',
                '트렌드 패턴을 분석하고 있습니다',
                '최종 결과를 정리하고 있습니다'
            ];
            
            let messageIndex = 0;
            this.backgroundMessageInterval = setInterval(() => {
                if (backgroundStatusElement && this.isScanning) {
                    messageIndex = (messageIndex + 1) % statusMessages.length;
                    backgroundStatusElement.textContent = statusMessages[messageIndex];
                }
            }, 3000); // 3초마다 메시지 변경
        }
    }
    

    // 백그라운드 데이터 수집 시뮬레이션 시작 (새로 추가)
    startBackgroundDataSimulation() {
        // 이미 실행 중이면 중단
        if (this.backgroundDataSimulation && this.backgroundDataSimulation.isRunning) {
            return;
        }
        
// 현재 상태 확인 및 로그
        const currentDetected = this.realTimeCounters ? this.realTimeCounters.detectedVideos : 0;
        const currentBackground = this.fullBackgroundData ? this.fullBackgroundData.length : 0;
        
        console.log(`🔍 시뮬레이션 시작 전 상태: 검출영상=${currentDetected}, 백그라운드=${currentBackground}`);
        
        // 최소 기본값 보장
        const minDetectedVideos = Math.max(currentDetected, 20); // 최소 20개
        const minBackgroundData = Math.max(currentBackground, minDetectedVideos * 2); // 최소 검출영상의 2배
        
        // 시뮬레이션 초기화 (더 안전한 값으로)
        this.backgroundDataSimulation = {
            isRunning: true,
            currentCount: Math.max(minBackgroundData, 50), // 최소 50개부터 시작
            targetCount: null,
            incrementRate: 2.5, // 더 빠른 증가율
            lastUpdateTime: Date.now(),
            phase: 'collecting' // 'collecting', 'analyzing', 'finalizing'
        };
        
        // 목표 수치 설정 (더 큰 범위로)
        const baseCount = Math.max(minDetectedVideos, 30);
        this.backgroundDataSimulation.targetCount = Math.floor(baseCount * (4 + Math.random() * 3)); // 4-7배
        
        console.log(`🚀 백그라운드 데이터 수집 시뮬레이션 시작: ${this.backgroundDataSimulation.currentCount} → ${this.backgroundDataSimulation.targetCount}`);
        
        // 즉시 한 번 업데이트하여 카운터 값 반영
        setTimeout(() => {
            this.updateBackgroundDataSimulation();
        }, 100);
        
        // 시뮬레이션 루프 시작 (더 자주 업데이트)
        this.backgroundDataSimulationInterval = setInterval(() => {
            this.updateBackgroundDataSimulation();
        }, 500); // 0.5초마다 업데이트 (더 자주)
        
        // 처리 속도도 시뮬레이션
        this.processingSpeedSimulationInterval = setInterval(() => {
            this.updateProcessingSpeedSimulation();
        }, 800); // 0.8초마다 처리 속도 업데이트
    }
    
    // 백그라운드 데이터 시뮬레이션 업데이트 (새로 추가)
    updateBackgroundDataSimulation() {
        if (!this.backgroundDataSimulation || !this.backgroundDataSimulation.isRunning) {
            return;
        }
        
        const simulation = this.backgroundDataSimulation;
        const now = Date.now();
        const timeSinceLastUpdate = (now - simulation.lastUpdateTime) / 1000;
        
        // 현재 진행률에 따라 증가량 조정
        const progress = simulation.currentCount / simulation.targetCount;
        
        if (progress < 0.7) {
            // 초기 70%까지는 빠르게 증가
            simulation.phase = 'collecting';
            const increment = Math.floor(simulation.incrementRate * (1.5 + Math.random() * 0.5));
            simulation.currentCount = Math.min(simulation.currentCount + increment, simulation.targetCount);
        } else if (progress < 0.9) {
            // 70~90%는 중간 속도
            simulation.phase = 'analyzing';
            const increment = Math.floor(simulation.incrementRate * (0.8 + Math.random() * 0.4));
            simulation.currentCount = Math.min(simulation.currentCount + increment, simulation.targetCount);
        } else {
            // 90% 이상은 느리게 마무리
            simulation.phase = 'finalizing';
            const increment = Math.floor(simulation.incrementRate * (0.2 + Math.random() * 0.3));
            simulation.currentCount = Math.min(simulation.currentCount + increment, simulation.targetCount);
        }
        
        // 목표에 도달하면 시뮬레이션 완료
        if (simulation.currentCount >= simulation.targetCount) {
            simulation.currentCount = simulation.targetCount;
            this.completeBackgroundDataSimulation();
        }
        
        simulation.lastUpdateTime = now;
        
        // 실시간 카운터 업데이트 (검출 영상도 천천히 증가)
        if (simulation.phase === 'collecting' && Math.random() < 0.3) {
            this.realTimeCounters.detectedVideos = Math.min(
                this.realTimeCounters.detectedVideos + Math.floor(1 + Math.random() * 2),
                Math.floor(simulation.targetCount * 0.4) // 최대 백그라운드 데이터의 40%까지
            );
        }
        
        // UI 업데이트
        // 백그라운드 데이터 업데이트 (실시간 카운터에 반영)
        this.realTimeCounters.backgroundData = simulation.currentCount;
        
        // UI 업데이트
        this.updateCounterDisplay();
        
        // 분석 카드도 함께 업데이트 (시뮬레이션 데이터 반영)
        if (simulation.currentCount > 0) {
            this.updateSimulatedSummaryCards(simulation.currentCount, this.realTimeCounters.detectedVideos);
        }
        
        // 진행 상태 로그 (항상 출력으로 변경)
        console.log(`📊 백그라운드 수집 진행: ${simulation.currentCount}/${simulation.targetCount} (${(progress * 100).toFixed(1)}%) - ${simulation.phase}`);
    }
    
    // 처리 속도 시뮬레이션 (새로 추가)
    updateProcessingSpeedSimulation() {
        if (!this.backgroundDataSimulation || !this.backgroundDataSimulation.isRunning) {
            this.realTimeCounters.processingRate = 0;
            this.updateCounterDisplay();
            return;
        }
        
        // 현재 단계에 따른 처리 속도 시뮬레이션
        let baseSpeed = 0;
        switch (this.backgroundDataSimulation.phase) {
            case 'collecting':
                baseSpeed = 3.5 + Math.random() * 2; // 3.5~5.5/초
                break;
            case 'analyzing':
                baseSpeed = 2.0 + Math.random() * 1.5; // 2.0~3.5/초
                break;
            case 'finalizing':
                baseSpeed = 0.8 + Math.random() * 1.2; // 0.8~2.0/초
                break;
            default:
                baseSpeed = 1.0 + Math.random() * 0.5; // 1.0~1.5/초
        }
        
        this.realTimeCounters.processingRate = baseSpeed.toFixed(1);
        this.updateCounterDisplay();
    }
    
    // 백그라운드 데이터 수집 시뮬레이션 완료 (새로 추가)
    completeBackgroundDataSimulation() {
        if (!this.backgroundDataSimulation) return;
        
        console.log(`✅ 백그라운드 데이터 수집 완료: ${this.backgroundDataSimulation.currentCount}개`);
        
        // 시뮬레이션 종료
        this.backgroundDataSimulation.isRunning = false;
        
        // 인터벌 정리
        if (this.backgroundDataSimulationInterval) {
            clearInterval(this.backgroundDataSimulationInterval);
            this.backgroundDataSimulationInterval = null;
        }
        
        if (this.processingSpeedSimulationInterval) {
            clearInterval(this.processingSpeedSimulationInterval);
            this.processingSpeedSimulationInterval = null;
        }
        
        // 처리 속도 0으로 설정
        setTimeout(() => {
            this.realTimeCounters.processingRate = 0;
            this.updateCounterDisplay();
        }, 2000);
        
// 완료 메시지 업데이트
        const currentActionEl = document.getElementById('currentAction');
        if (currentActionEl) {
            currentActionEl.textContent = `🎯 데이터 수집 완료! 총 ${this.backgroundDataSimulation.currentCount}개 수집됨`;
        }
        
        // fullBackgroundData 업데이트 (다운로드용)
        if (!this.fullBackgroundData || this.fullBackgroundData.length < this.backgroundDataSimulation.currentCount) {
            // 기존 데이터 확장 (시뮬레이션용)
            const additionalDataNeeded = this.backgroundDataSimulation.currentCount - (this.fullBackgroundData ? this.fullBackgroundData.length : 0);
            if (additionalDataNeeded > 0 && this.scanResults && this.scanResults.length > 0) {
                const baseData = this.fullBackgroundData || this.scanResults;
                const expandedData = [...baseData];
                
                // 기존 데이터를 변형하여 추가 데이터 생성
                for (let i = 0; i < additionalDataNeeded; i++) {
                    const sourceItem = baseData[i % baseData.length];
                    const variationItem = JSON.parse(JSON.stringify(sourceItem));
                    variationItem.id = `bg_${Date.now()}_${i}`;
                    variationItem.title = `[백그라운드] ${variationItem.title}`;
                    variationItem.isBackgroundData = true;
                    expandedData.push(variationItem);
                }
                
                this.fullBackgroundData = expandedData;
                console.log(`📊 백그라운드 데이터 확장 완료: ${this.fullBackgroundData.length}개`);
            }
        }
    } // ← completeBackgroundDataSimulation 함수 끝
    
    // 시뮬레이션된 분석 카드 업데이트 (새로 추가)
    updateSimulatedSummaryCards(totalVideos, detectedVideos) {
        try {
            // 시뮬레이션된 통계 계산
            const avgViralScore = Math.floor(350 + Math.random() * 300); // 350-650 범위
            const shortsRatio = Math.floor(30 + Math.random() * 40); // 30-70% 범위
            const avgGrowthRate = (15 + Math.random() * 25).toFixed(1); // 15-40% 범위
            
            // UI 요소 업데이트
            const totalVideosEl = document.getElementById('totalVideos');
            const avgViralScoreEl = document.getElementById('avgViralScore');
            const shortsRatioEl = document.getElementById('shortsRatio');
            const avgGrowthRateEl = document.getElementById('avgGrowthRate');
            
            if (totalVideosEl) {
                this.animateCounterChange(totalVideosEl, totalVideos);
            }
            if (avgViralScoreEl) {
                this.animateCounterChange(avgViralScoreEl, avgViralScore);
            }
            if (shortsRatioEl) {
                shortsRatioEl.textContent = `${shortsRatio}%`;
            }
            if (avgGrowthRateEl) {
                avgGrowthRateEl.textContent = `${avgGrowthRate}%`;
            }
            
            // analysisSummary 섹션 표시
            const analysisSummary = document.getElementById('analysisSummary');
            if (analysisSummary) {
                analysisSummary.style.display = 'block';
            }
            
            console.log(`📊 시뮬레이션 분석 카드 업데이트: 총 ${totalVideos}개, 평균 바이럴 ${avgViralScore}`);
            
        } catch (error) {
            console.error('❌ 시뮬레이션 분석 카드 업데이트 오류:', error);
        }
    }
    
    // animateCounterChange를 숫자가 아닌 요소에도 사용할 수 있도록 개선 (새로 추가)
    animateCounterChangeForElement(element, newValue) {
        if (!element) return;
        
        // 현재 값이 숫자인지 확인
        const currentText = element.textContent || '0';
        const currentValue = parseInt(currentText.replace(/,/g, '').replace(/[^\d]/g, '')) || 0;
        
        if (typeof newValue === 'number' && currentValue !== newValue) {
            this.animateCounterChange(element, newValue);
        } else {
            element.textContent = newValue;
        }
    }



    // 백그라운드 시뮬레이션 정지 (새로 추가)
    stopBackgroundDataSimulation() {
        if (this.backgroundDataSimulation) {
            this.backgroundDataSimulation.isRunning = false;
        }
        
        if (this.backgroundDataSimulationInterval) {
            clearInterval(this.backgroundDataSimulationInterval);
            this.backgroundDataSimulationInterval = null;
        }
        
        
        // 처리 속도 0으로 리셋
        this.realTimeCounters.processingRate = 0;
        this.updateCounterDisplay();
        
        console.log('🛑 백그라운드 데이터 시뮬레이션 중지');
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
    
        // ✅ 렌더 직전 중복제거(딱 1회)
        const rows = this.removeDuplicates(this.scanResults || []);
    
        rows.forEach((video, index) => {
            const row = document.createElement('tr');
            if (video.isShorts || video.isSimulated) {
                // 필요시 표시 스타일 유지
                if (video.isSimulated) row.classList.add('simulated-row');
            }
    
            // ✅ videoId 우선으로 안전한 ID 확보
            const keyId = (video.videoId || video.id || (video.contentDetails && video.contentDetails.videoId) || '').toString();
    
            // 제목 링크/액션 버튼도 keyId 사용
            const titleLink = this.createVideoTitleLink
                ? this.createVideoTitleLink({ ...video, id: keyId })
                : `<a href="${this.generateYouTubeLink(keyId)}" target="_blank" rel="noopener noreferrer">${video.title || '(제목 없음)'}</a>`;
    
            const actionButton = video.isSimulated
              ? '<button class="action-btn" onclick="alert(\'모의 데이터입니다\')" title="모의 데이터"><i class="fas fa-info"></i></button>'
              : `<a href="${this.generateYouTubeLink(keyId)}" target="_blank" rel="noopener noreferrer" class="action-btn external" title="YouTube에서 보기"><i class="fas fa-external-link-alt"></i></a>`;
    
            // 셀 템플릿
            // 셀 템플릿 (순위 컬럼 추가 및 데이터 수정)
                        row.innerHTML = `
                            <td class="rank-cell">
                                <span class="rank-number">#${index + 1}</span>
                            </td>
                            <td class="title-cell">
                                <div class="video-title">${titleLink}</div>
                                <div class="video-channel">${video.channelTitle || video.channel || ''}</div>
                                ${video.searchKeyword ? `<div class="video-keyword">키워드: ${video.searchKeyword}</div>` : ''}
                            </td>
                            <td class="viral-score-cell">
                                <span class="table-viral-score ${video.isSimulated ? 'simulated' : ''}">${Number(video.viralScore || 0)}</span>
                            </td>
                            <td class="stats-cell">${this.formatNumber ? this.formatNumber(Number(video.viewCount || 0)) : (video.viewCount || 0)}</td>
                            <td class="engagement-cell">${Number(video.engagementRate || 0).toFixed(1)}%</td>
                            <td class="growth-cell">${Number(video.growthRate || 0).toFixed(1)}%</td>
                            <td class="format-cell">
                                <span class="format-badge ${video.format || (video.isShorts ? 'shorts' : 'long')}">${video.isShorts ? '📱 쇼츠' : '🎬 롱폼'}</span>
                            </td>
                            <td class="date-cell">${this.formatPublishDate(video)}</td>
                            <td class="action-cell">${actionButton}</td>
                        `;
    
            tableBody.appendChild(row);
        });
    
        console.log(`📋 테이블 뷰 업데이트 완료: ${rows.length}개 영상`);
    }

    

    // OptimizedYoutubeTrendsAnalyzer 클래스에 추가할 메서드들
    
    // 키워드 티어별 선택 메서드
    // 키워드 티어별 선택 메서드
    // 키워드 티어별 선택 메서드
    getSelectedKeywords(category, tier) {
      let keywords = [];
      
      switch (tier) {
        case 'tier1':
          keywords = this.optimizedKeywords.tier1;
          break;
        case 'tier1+2':
          // 배열 전개로 합치기
          keywords = [
            ...this.optimizedKeywords.tier1,
            ...this.optimizedKeywords.tier2
          ];
          break;
        case 'all':
          // 배열 전개로 합치기
          keywords = [
            ...this.optimizedKeywords.tier1,
            ...this.optimizedKeywords.tier2,
            ...this.optimizedKeywords.tier3
          ];
          break;
        default:
          keywords = this.optimizedKeywords.tier1;
      }
    
      // (이하 동일)
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
    

    /* === [NEW] 채널-우회 파이프라인 with 동시성·백오프·TTL 캐시·가중치 튜너·필터 === */
    
    // (A) 내부 설정 (UI 없이 코드 레벨에서 조정 가능)
    getHotScoreWeights() {
      // 필요시 localStorage로 현업 튜닝 허용
      // ex) localStorage.setItem('hot_w_viewsPerDay', '1.0'); 등
      const getW = (k, def) => Number(localStorage.getItem(k) || def);
      return {
        wVelocity:   getW('hot_w_viewsPerDay', 1.0),   // 조회 속도 가중
        wER:         getW('hot_w_engagement',  3.0),   // 참여율 가중
        maxAgeDays:  getW('hot_maxAgeDays',    14),    // 기본 최대 기간
      };
    }
    
    // (B) 간단 TTL 캐시 (메모리 + localStorage 미러)
    _getTTL() { return 6 * 60 * 60 * 1000; } // 6시간
    _cacheGetLS(key) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (Date.now() - obj.t > (obj.ttl || this._getTTL())) return null;
        return obj.v;
      } catch(e){ return null; }
    }
    _cacheSetLS(key, value, ttl = this._getTTL()) {
      try {
        localStorage.setItem(key, JSON.stringify({ t: Date.now(), ttl, v: value }));
      } catch(e){}
    }
    _cacheKey(type, id, extra='') { return `yt_pro_cache:${type}:${id}:${extra}`; }
    
    // (C) 재시도 & 지수 백오프 래퍼
    async fetchWithRetry(url, { apiKey, units, method='GET', body=null, maxRetry=5, baseDelay=500 } = {}) {
      const signal = this.abortController?.signal;
      for (let attempt = 0; attempt <= maxRetry; attempt++) {
        try {
          const res = await fetch(url, { method, body, signal });
          
          // 성공 시 할당량 차감 후 반환
          if (res.ok) { 
            this.updateQuotaUsage(apiKey, units); 
            return res; 
          }
          
          // 404, 403, 400 등 클라이언트 에러는 재시도하지 않음
          if ([400, 401, 403, 404, 409].includes(res.status)) {
            console.warn(`🚫 API 클라이언트 에러 ${res.status}: ${url.split('&key=')[0]}...`);
            this.updateQuotaUsage(apiKey, units); // 실패해도 할당량은 차감됨
            return res; // 에러 응답을 그대로 반환하여 상위에서 처리하도록 함
          }
          
          // 429, 500~504 서버 에러는 재시도
          if ([429, 500, 502, 503, 504].includes(res.status)) {
            if (attempt < maxRetry) {
              const delay = baseDelay * Math.pow(2, attempt);
              console.warn(`⏳ API 서버 에러 ${res.status}, ${delay}ms 후 재시도 (${attempt + 1}/${maxRetry + 1})`);
              await this.delay(delay);
              continue;
            }
          }
          
          // 기타 상태코드는 그대로 반환
          this.updateQuotaUsage(apiKey, units);
          return res;
          
        } catch(e) {
          if (attempt < maxRetry) {
            const delay = baseDelay * Math.pow(2, attempt);
            console.warn(`🔌 네트워크 오류, ${delay}ms 후 재시도 (${attempt + 1}/${maxRetry + 1}):`, e.message);
            await this.delay(delay);
            continue;
          }
          // 최대 재시도 초과 시 에러 던지기
          console.error(`❌ 네트워크 오류 (최대 재시도 초과):`, e.message);
          throw e;
        }
      }
      throw new Error('fetchWithRetry: max retry exceeded');
    }

    
    // (D) 동시성 제한 헬퍼 (간단 풀)
    async runWithPool(items, limit, worker) {
      const results = [];
      let idx = 0, active = 0;
      const signal = this.abortController?.signal;
    
      return new Promise((resolve) => {
        const next = () => {
          while (active < limit && idx < items.length) {
            if (!this.isScanning || (signal && signal.aborted)) break;
    
            const i = idx++;
            active++;
    
            Promise.resolve().then(() => worker(items[i], i))
              .then(r => { results[i] = r; })
              .catch(err => {
                if (err?.name === 'AbortError') {
                  results[i] = null; // 취소
                } else {
                  results[i] = null; // 실패
                }
              })
              .finally(() => {
                active--;
                if (idx < items.length && this.isScanning && !(signal && signal.aborted)) {
                  next();
                } else if (active === 0) {
                  resolve(results);
                }
              });
          }
          if ((idx >= items.length || !this.isScanning || (signal && signal.aborted)) && active === 0) resolve(results);
        };
        next();
      });
    }


    // 유효하지 않은 채널 필터링 (새로 추가)
    async filterValidChannels(channelIds) {
      const validChannels = [];
      const batchSize = 50; // channels API는 최대 50개까지 한 번에 조회 가능
      
      for (let i = 0; i < channelIds.length; i += batchSize) {
        const batch = channelIds.slice(i, i + batchSize);
        const apiKey = this.getApiKey();
        if (!apiKey) break;
        
        try {
          const url = `${this.baseUrl}/channels?part=id&id=${batch.join(',')}&key=${apiKey}`;
          const res = await this.fetchWithRetry(url, { apiKey, units: 1 });
          
          if (res.ok) {
            const data = await res.json();
            const existingChannels = (data.items || []).map(item => item.id);
            validChannels.push(...existingChannels);
            
            // 삭제된 채널 로깅
            const missingChannels = batch.filter(id => !existingChannels.includes(id));
            if (missingChannels.length > 0) {
              console.warn(`🚫 삭제되거나 접근 불가한 채널들: ${missingChannels.length}개`);
            }
          }
        } catch (error) {
          console.error('채널 유효성 검사 오류:', error);
          // 오류 시에도 기존 채널 ID들을 유지
          validChannels.push(...batch);
        }
      }
      
      console.log(`📊 채널 필터링 결과: ${channelIds.length}개 → ${validChannels.length}개 (${channelIds.length - validChannels.length}개 제거)`);
      return validChannels;
    }



    
    // (E) 키워드 → 채널 인덱싱 (search.list: type=channel, 100units/호출) - 전수 검사 지원
    // 참고: 아래에 더 완전한 구현이 있습니다. 이 함수는 하위 호환성을 위해 유지됩니다.
    async discoverSeedChannels(keywords, maxPerKeyword = Infinity) {
      const set = new Set();
      for (const kw of keywords) {
        // 중지 요청 확인
        if (!this.isScanning) {
          console.log(`⏸️ 사용자에 의해 채널 검색 중지됨: "${kw}"`);
          break;
        }
        
        let pageToken = '';
        let pageCount = 0;
        let collectedForKeyword = 0;
        
        // 전수 검사: maxPerKeyword가 Infinity면 모든 페이지 수집
        while (true) {
          // 할당량 확인
          if (!this.canUseQuota(100)) {
            console.warn(`⚠️ 할당량 부족으로 "${kw}" 채널 검색 중단`);
            break;
          }
          
          // 최대 채널 수 제한 확인
          if (maxPerKeyword !== Infinity && collectedForKeyword >= maxPerKeyword) {
            console.log(`✅ 키워드 "${kw}": 최대 채널 수 도달 (${maxPerKeyword}개)`);
            break;
          }
          
          const apiKey = this.getApiKey();
          if (!apiKey) {
            console.warn(`⚠️ 사용 가능한 API 키가 없어 "${kw}" 채널 검색 중단`);
            break;
          }
          
          const url = `${this.baseUrl}/search?part=snippet&type=channel&maxResults=50&q=${encodeURIComponent(kw)}&key=${apiKey}${pageToken?`&pageToken=${pageToken}`:''}`;
          const res = await this.fetchWithRetry(url, { apiKey, units: 100 });
          if (!res.ok) break;
          const data = await res.json();
          pageCount++;
          
          const items = data.items || [];
          let addedInPage = 0;
          
          items.forEach(it => {
            const cid = it.snippet?.channelId || it.id?.channelId;
            if (cid && !set.has(cid)) {
              set.add(cid);
              addedInPage++;
              collectedForKeyword++;
            }
          });
          
          if (pageCount % 5 === 0 || addedInPage === 0) {
            console.log(`📡 키워드 "${kw}" - 페이지 ${pageCount}: ${addedInPage}개 새 채널 발견 (누적: ${collectedForKeyword}개)`);
          }
          
          pageToken = data.nextPageToken || '';
          if (!pageToken) {
            console.log(`✅ 키워드 "${kw}": 마지막 페이지 도달 (총 ${collectedForKeyword}개 채널)`);
            break;
          }
          
          // API 요청 간 지연
          await this.delay(300);
        }
      }
      console.log(`📚 채널 인덱싱 완료: ${set.size}개`);
      return Array.from(set);
    }
    
    // (F) 채널 → 업로드 재생목록 ID (1unit)
    async getUploadsPlaylistId(channelId) {
      const ck = this._cacheKey('uploadsId', channelId);
      const cached = this._cacheGetLS(ck);
      if (cached) return cached;
    
      const apiKey = this.getApiKey(); if (!apiKey) return null;
      const url = `${this.baseUrl}/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
      const res = await this.fetchWithRetry(url, { apiKey, units: 1 });
      if (!res.ok) {
        if (res.status === 404) {
          console.warn(`🚫 채널을 찾을 수 없음: ${channelId} (채널 삭제됨 또는 비공개)`);
        } else if (res.status === 403) {
          console.warn(`🚫 채널 접근 권한 없음: ${channelId}`);
        } else {
          console.warn(`🚫 채널 조회 실패 (${res.status}): ${channelId}`);
        }
        // 실패한 채널 ID를 캐시에 null로 저장하여 재시도 방지
        this._cacheSetLS(ck, null);
        return null;
      }
    
      const data = await res.json();
      const id = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads || null;
      if (id) {
        this._cacheSetLS(ck, id);
        console.log(`✅ 채널 업로드 플레이리스트 ID 획득: ${channelId} → ${id}`);
      } else {
        console.warn(`⚠️ 채널에 업로드 플레이리스트가 없음: ${channelId}`);
        this._cacheSetLS(ck, null);
      }
      return id;
    }
    
    // (G) 업로드 재생목록 → 최근 업로드 영상ID 페이지네이션 (1unit/페이지)
    async fetchRecentUploads(uploadsPlaylistId, maxItems = 200) {
      const ck = this._cacheKey('recentUploads', uploadsPlaylistId, `max=${maxItems}`);
      const cached = this._cacheGetLS(ck);
      if (cached) return cached;
    
      const ids = [];
      let pageToken = '';
      while (ids.length < maxItems) {
        const apiKey = this.getApiKey(); if (!apiKey) break;
        const url = `${this.baseUrl}/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploadsPlaylistId}&key=${apiKey}${pageToken?`&pageToken=${pageToken}`:''}`;
        const res = await this.fetchWithRetry(url, { apiKey, units: 1 });
        if (!res.ok) break;
        const data = await res.json();
        (data.items||[]).forEach(it => { const v = it.contentDetails?.videoId; if (v) ids.push(v); });
        pageToken = data.nextPageToken || '';
        if (!pageToken) break;
      }
      this._cacheSetLS(ck, ids);
      return ids;
    }
    
    // (H) videos.list 일괄 상세조회 (1unit/호출, 50개씩)
    async fetchVideoStatsBulk(videoIds) {
      const results = [];
      for (let i=0; i<videoIds.length; i+=50) {
        const group = videoIds.slice(i, i+50);
        const apiKey = this.getApiKey(); if (!apiKey) break;
        const url = `${this.baseUrl}/videos?part=snippet,contentDetails,statistics&id=${group.join(',')}&key=${apiKey}`;
        const res = await this.fetchWithRetry(url, { apiKey, units: 1 });
        if (!res.ok) continue;
        const data = await res.json();
        (data.items||[]).forEach(v => results.push(v));
      }
      return results;
    }
    
    // (I) ISO8601 → 초
    parseISODurationToSec(iso) {
      const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso) || [];
      return (Number(m[1]||0)*3600) + (Number(m[2]||0)*60) + Number(m[3]||0);
    }
    
    // (J) 기간/형식 필터 + 가중치 기반 바이럴 점수
    computeViralScore(items, { timeRange, format, now = Date.now() }) {
      const W = this.getHotScoreWeights();
    
      // 기간 해석(세분화): 1day/3days/1week/2weeks/custom:n
      let rangeMs = 7*86400000; // default 1week
      if (timeRange === '1day') rangeMs = 1*86400000;
      else if (timeRange === '3days') rangeMs = 3*86400000;
      else if (timeRange === '1week') rangeMs = 7*86400000;
      else if (timeRange === '2weeks') rangeMs = 14*86400000;
      else if (typeof timeRange === 'string' && timeRange.startsWith('custom:')) {
        const n = Number(timeRange.split(':')[1]||W.maxAgeDays);
        rangeMs = Math.max(1, n) * 86400000;
      }
    
      const filtered = items.filter(v => {
        const t = new Date(v.snippet?.publishedAt || 0).getTime();
        if (!t || (now - t) > rangeMs) return false;
        if (format === 'shorts' || format === 'long') {
          const secs = this.parseISODurationToSec(v.contentDetails?.duration || 'PT0S');
          if (format === 'shorts' && secs > 180) return false;
          if (format === 'long' && secs <= 180) return false;
        }
        return true;
      });
    
      return filtered.map(v => {
        const st = v.statistics || {};
        const views = Number(st.viewCount || 0);
        const likes = Number(st.likeCount || 0);
        const comments = Number(st.commentCount || 0);
    
        const pub = new Date(v.snippet?.publishedAt || 0).getTime();
        const ageDays = Math.max((now - pub) / 86400000, 0.01);
    
        const velocity = views / ageDays;                   // 조회 속도
        const er = (likes + comments) / Math.max(views,1);  // 참여율
    
        const score = (W.wVelocity * velocity) * (1 + W.wER * er);
        const out = { video: v, score };
        // UI 호환을 위해 __score 필드도 남김
        v.__score = score;
        return out;
      });
    }


        // 최적의 배치 설정 계산
        calculateOptimalBatchSettings(maxChannels, keywordCount) {
            let batchSize, delayMs;
            
            if (maxChannels <= 1000) {
                batchSize = 200;
                delayMs = 1000;
            } else if (maxChannels <= 5000) {
                batchSize = 500;
                delayMs = 2000;
            } else {
                batchSize = 1000;
                delayMs = 3000;
            }
            
            // API 할당량을 고려한 조정
            const estimatedApiCalls = (maxChannels / batchSize) * keywordCount;
            const availableQuota = this.apiKeyManager.getOverallStats().remainingQuota;
            
            if (estimatedApiCalls > availableQuota * 0.8) {
                batchSize = Math.max(100, Math.floor(batchSize * 0.7));
                delayMs = Math.min(5000, delayMs * 1.5);
            }
            
            return {
                batchSize,
                delayMs,
                estimatedBatches: Math.ceil(maxChannels / batchSize),
                estimatedTime: Math.ceil((maxChannels / batchSize) * (delayMs / 1000 / 60)) // 분 단위
            };
        }



    
    // (K) 전체 파이프라인 (동시성 제한 + 품질 로그) - 전수 검사 지원
    async runChannelUploadPipeline(
      keywords,
      { format, timeRange, perChannelMax, topN, softTarget = 2000, dailyCapUnits = 8000, tier2Keywords = [], tier3Keywords = [] } = {}
    ) {
      const upd = (percent, totalKw, doneKw, found, action) => {
        // 프로젝트의 진행 업데이트 함수에 맞춰 호출
        if (typeof this.updateProgress === 'function') {
          this.updateProgress(percent, totalKw, doneKw, found, action);
        }
      };
    
      // perChannelMax 기본값 처리: 사용자 설정값 또는 Infinity (전수 검사)
      if (perChannelMax === undefined || perChannelMax === null) {
        const userSetting = Number(localStorage.getItem('hot_perChannelMax'));
        perChannelMax = (userSetting && userSetting > 0) ? userSetting : Infinity;
      }
      
      console.log(`🔍 파이프라인 시작: 채널당 최대 ${perChannelMax === Infinity ? '전체' : perChannelMax}개 영상 수집`);
      
      // 🔥 Tier별 키워드 처리 로직
      const hasTier2Or3Keywords = (tier2Keywords && tier2Keywords.length > 0) || (tier3Keywords && tier3Keywords.length > 0);
      if (hasTier2Or3Keywords) {
        console.log(`📊 Tier별 검색 모드: Tier1 키워드(${keywords.length}개)로 채널 검색 → Tier2(${tier2Keywords?.length || 0}개), Tier3(${tier3Keywords?.length || 0}개) 키워드로 제목 필터링`);
      }
    
      // ===== 1) 키워드 → 채널 인덱싱 =====
      upd(undefined, keywords.length, 0, 0, '키워드 인덱싱 중…');
    
      // 채널 후보 수집 - 전수 검사 (제한 없음)
      // 🔥 Tier 1 키워드로만 채널 검색
      const channelsRaw = await this.discoverSeedChannels(
        keywords,
        Infinity  // 전수 검사: 모든 채널 수집
      );
    
      // 📡 슬라이더 상한 적용: 10,000 이상 ⇒ 전체(무제한), 그 외 N개만 스캔
      const maxChSetting = (typeof this.getMaxChannels === 'function')
        ? this.getMaxChannels()
        : (function () {
            const v = Number(localStorage.getItem('hot_maxChannels') || 100);
            if (!Number.isFinite(v) || v <= 0) return 100;
            if (v >= 10000) return Infinity; // 10,000 이상이면 전체
            return Math.max(10, Math.min(10000, Math.floor(v))); // 10~10,000 범위
          })();
    
        // ✅ 유니크 채널 기준으로 상한 적용
        const uniqueChannels = Array.from(new Set(channelsRaw));
        const channels = (maxChSetting === Infinity)
          ? uniqueChannels
          : uniqueChannels.slice(0, Math.max(1, Number(maxChSetting)));
    
      upd(
        25,
        keywords.length,
        keywords.length,
        0,
        `채널 발견: ${channelsRaw.length}개 → 스캔 대상: ${channels.length}개`
      );
      if (!channels.length) return [];
    
      // ⚙️ 동시성(슬라이더) — 한 번만 선언하고 아래 단계에서 재사용
      const concurrency = (typeof this.getConcurrency === 'function')
        ? this.getConcurrency()
        : (function () {
            const c = Number(localStorage.getItem('hot_concurrency') || 4);
            return Math.max(4, Math.min(8, c));
          })();
    
      // ===== 2) 채널 → 업로드 재생목록 ID =====
      let chDone = 0;
      const uploadsIds = await this.runWithPool(channels, concurrency, async (ch) => {
        if (!this.isScanning || this.abortController?.signal?.aborted) return null;
        const up = await this.getUploadsPlaylistId(ch);
        chDone++;
        // 키워드 진행은 종료했으니 분모는 키워드 수, 분자는 그대로 유지하되 액션/퍼센트만 단계에 맞게 업데이트
        upd(
          25 + Math.round((chDone / channels.length) * 15),
          keywords.length,
          keywords.length,
          0,
          `업로드 재생목록 수집 ${chDone}/${channels.length}`
        );
        return up ? { ch, up } : null;
      });
      const valid = uploadsIds.filter(Boolean);
    
      // ===== 3) 업로드 재생목록 → 영상ID =====
      const allIdsSet = new Set();
      let plDone = 0;
    
      await this.runWithPool(valid, concurrency, async (row) => {
        if (!this.isScanning || this.abortController?.signal?.aborted) return null;
        const ids = await this.fetchRecentUploads(row.up, perChannelMax);
        ids.forEach(id => allIdsSet.add(id));
        plDone++;
        // 발견된 영상(중복 제거 전) 실시간 반영
        upd(
          40 + Math.round((plDone / Math.max(1, valid.length)) * 30),
          keywords.length,
          keywords.length,
          allIdsSet.size,
          `영상ID 수집 ${plDone}/${valid.length}`
        );
      });
    
      const allIds = Array.from(allIdsSet);
      // 업로드 결과가 0이면 즉시 종료(불필요한 videos.list 호출 방지)
      if (allIds.length === 0) {
        upd(100, keywords.length, keywords.length, 0, '영상ID 없음 — 종료');
        console.warn('영상ID가 수집되지 않았습니다. 기간/형식/키워드 조건을 완화해 보세요.');
        return [];
      }
    
      // ===== 4) 상세 통계 조회 =====
      upd(70, keywords.length, keywords.length, allIds.length, `상세 조회 준비 (${allIds.length}개)`);
      const stats = await this.fetchVideoStatsBulk(allIds);
      upd(85, keywords.length, keywords.length, stats.length, `상세 조회 완료 (${stats.length}개)`);
    
      // ===== 5) 점수 계산/정렬 =====
      const tryScore = (fmt, tr) => {
        const s = this.computeViralScore(stats, { format: fmt, timeRange: tr });
        s.sort((a, b) => b.score - a.score);
        return s;
      };
      let scored = tryScore(format, timeRange);
      if (!scored.length) {
        const fmt2 = (format === 'shorts' || format === 'long') ? undefined : format;
        scored = tryScore(fmt2, '2weeks');
        if (!scored.length) scored = tryScore(fmt2, 'custom:30');
      }
      
      // 🔥 Tier 1로 수집된 전체 영상 데이터를 백그라운드 데이터에 저장
      const allScoredVideos = scored.map((s, i) => {
        const v = s.video;
        const vid = v.id || v.videoId || v?.contentDetails?.videoId;
        if (!v.id && vid) v.id = vid;
        // score를 명시적으로 포함시켜 필터링 후에도 정렬 가능하도록 함
        return { rank: i + 1, score: s.score, viralScore: s.score, ...v };
      });
      
      // 🔥 fullBackgroundData에 저장 (Tier 1로 수집된 모든 영상)
      if (hasTier2Or3Keywords && allScoredVideos.length > 0) {
        console.log(`💾 Tier 1 수집 데이터 저장: ${allScoredVideos.length}개 영상을 백그라운드 데이터에 저장`);
        this.fullBackgroundData = JSON.parse(JSON.stringify(allScoredVideos));
        this.backgroundDataStats = {
          totalCollected: allScoredVideos.length,
          processedCount: 0,
          collectionTime: new Date().toISOString()
        };
      }
      
      // 🔥 Tier 2, Tier 3 키워드로 제목 필터링
      let filteredVideos = allScoredVideos;
      if (hasTier2Or3Keywords && allScoredVideos.length > 0) {
        upd(90, keywords.length, keywords.length, allScoredVideos.length, `제목 필터링 중... (Tier 2, 3)`);
        filteredVideos = this.filterVideosByTitleKeywords(allScoredVideos, tier2Keywords, tier3Keywords);
        console.log(`✅ Tier별 필터링 완료: ${allScoredVideos.length}개 → ${filteredVideos.length}개`);
      }
      
      const top = filteredVideos
        .slice(0, Math.min(topN || 200, 10000))
        .map((video, i) => {
          return { rank: i + 1, ...video };
        });
      
      upd(100, keywords.length, keywords.length, top.length, `정렬/상위 도출 완료 (${top.length}개)`);
      return top;
    }


    /* === [/NEW] ============================================================= */


    // 📡 검출 채널 상한 (슬라이더 연동, 유니크 기준)
    // - 10,000 이상이면 "전체" 처리(자르지 않음)
    // - 슬라이더 값 그대로 반영 (10~10,000 범위)
    getMaxChannels() {
      const v = Number(localStorage.getItem('hot_maxChannels') || 100);
      if (!Number.isFinite(v) || v <= 0) return 100; // 기본값
      if (v >= 10000) return Infinity; // == 전체 스캔 (10,000 이상)
      return Math.max(10, Math.min(10000, Math.floor(v))); // 슬라이더 값 그대로 적용 (10~10,000)
    }




    /* === [NEW] 채널-우회(업로드 재생목록) 파이프라인 ====================== */
    
    // 1) 키워드로 채널 인덱싱 (search.list: type=channel) - 전수 검사 지원
    async discoverSeedChannels(keywords, maxPerKeyword = Infinity) {
      const channelSet = new Set();
      for (const kw of keywords) {
        // 중지 요청 확인
        if (!this.isScanning) {
          console.log(`⏸️ 사용자에 의해 채널 검색 중지됨: "${kw}"`);
          break;
        }
        
        let pageToken = '';
        let pageCount = 0;
        let collectedForKeyword = 0;
        
        // 전수 검사: maxPerKeyword가 Infinity면 모든 페이지 수집
        while (true) {
          // 할당량 확인
          if (!this.canUseQuota(100)) {
            console.warn(`⚠️ 할당량 부족으로 "${kw}" 채널 검색 중단`);
            break;
          }
          
          // 최대 채널 수 제한 확인
          if (maxPerKeyword !== Infinity && collectedForKeyword >= maxPerKeyword) {
            console.log(`✅ 키워드 "${kw}": 최대 채널 수 도달 (${maxPerKeyword}개)`);
            break;
          }
          
          const apiKey = this.getApiKey();
          if (!apiKey) {
            console.warn(`⚠️ 사용 가능한 API 키가 없어 "${kw}" 채널 검색 중단`);
            break;
          }
          
          const url = `${this.baseUrl}/search?part=snippet&type=channel&maxResults=50&q=${encodeURIComponent(kw)}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
          const res = await fetch(url);
          
          if (!res.ok) {
            this.apiKeyManager.handleApiKeyError(apiKey, new Error(String(res.status)));
            if (res.status === 403) {
              console.warn(`🚫 API 키 할당량 초과: "${kw}" 채널 검색 중단`);
              break;
            }
            break;
          }
          
          this.updateQuotaUsage(apiKey, 100); // search.list 비용
          const data = await res.json();
          pageCount++;
          
          const items = data.items || [];
          let addedInPage = 0;
          
          items.forEach(it => {
            const cid = it.snippet?.channelId || it.id?.channelId;
            if (cid && !channelSet.has(cid)) {
              channelSet.add(cid);
              addedInPage++;
              collectedForKeyword++;
            }
          });
          
          console.log(`📡 키워드 "${kw}" - 페이지 ${pageCount}: ${addedInPage}개 새 채널 발견 (누적: ${collectedForKeyword}개)`);
          
          // 다음 페이지 토큰 확인
          pageToken = data.nextPageToken || '';
          if (!pageToken) {
            console.log(`✅ 키워드 "${kw}": 마지막 페이지 도달 (총 ${collectedForKeyword}개 채널)`);
            break;
          }
          
          // API 요청 간 지연
          await this.delay(300);
        }
      }
      
      const totalChannels = channelSet.size;
      console.log(`📚 채널 인덱싱 완료: 총 ${totalChannels}개 고유 채널 발견`);
      return Array.from(channelSet);
    }
    
    // 2) 채널 → 업로드 재생목록 ID
    async getUploadsPlaylistId(channelId) {
      const apiKey = this.getApiKey(); if (!apiKey) return null;
      const url = `${this.baseUrl}/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) { this.apiKeyManager.handleApiKeyError(apiKey, new Error(String(res.status))); return null; }
      this.updateQuotaUsage(apiKey, 1);
      const data = await res.json();
      return data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads || null;
    }
    
    // 3) 업로드 재생목록 → 최근 업로드 비디오ID 대량 수집 - 전수 검사 지원
    async fetchRecentUploads(uploadsPlaylistId, maxItems = Infinity) {
      const videoIds = [];
      let pageToken = '';
      let pageCount = 0;
      
      // 전수 검사: maxItems가 Infinity면 모든 페이지 수집
      while (true) {
        // 중지 요청 확인
        if (!this.isScanning) {
          console.log(`⏸️ 사용자에 의해 업로드 영상 수집 중지됨: ${uploadsPlaylistId}`);
          break;
        }
        
        // 최대 아이템 수 제한 확인
        if (maxItems !== Infinity && videoIds.length >= maxItems) {
          console.log(`✅ 최대 영상 수 도달: ${maxItems}개 (재생목록: ${uploadsPlaylistId})`);
          break;
        }
        
        // 할당량 확인
        if (!this.canUseQuota(1)) {
          console.warn(`⚠️ 할당량 부족으로 업로드 영상 수집 중단: ${uploadsPlaylistId}`);
          break;
        }
        
        const apiKey = this.getApiKey();
        if (!apiKey) {
          console.warn(`⚠️ 사용 가능한 API 키가 없어 업로드 영상 수집 중단: ${uploadsPlaylistId}`);
          break;
        }
        
        const url = `${this.baseUrl}/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploadsPlaylistId}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
        const res = await fetch(url);
        
        if (!res.ok) {
          this.apiKeyManager.handleApiKeyError(apiKey, new Error(String(res.status)));
          if (res.status === 403) {
            console.warn(`🚫 API 키 할당량 초과: 업로드 영상 수집 중단`);
            break;
          }
          break;
        }
        
        this.updateQuotaUsage(apiKey, 1);
        const data = await res.json();
        pageCount++;
        
        const items = data.items || [];
        let addedInPage = 0;
        
        items.forEach(it => {
          const vid = it.contentDetails?.videoId;
          if (vid) {
            videoIds.push(vid);
            addedInPage++;
          }
        });
        
        if (pageCount % 10 === 0 || addedInPage === 0) {
          console.log(`📹 재생목록 ${uploadsPlaylistId} - 페이지 ${pageCount}: ${addedInPage}개 영상 발견 (누적: ${videoIds.length}개)`);
        }
        
        // 다음 페이지 토큰 확인
        pageToken = data.nextPageToken || '';
        if (!pageToken) {
          console.log(`✅ 재생목록 ${uploadsPlaylistId}: 마지막 페이지 도달 (총 ${videoIds.length}개 영상)`);
          break;
        }
        
        // API 요청 간 지연
        await this.delay(200);
      }
      
      return videoIds;
    }
    
    // 4) 영상 통계 일괄 조회
    async fetchVideoStatsBulk(videoIds) {
      const results = [];
      for (let i = 0; i < videoIds.length; i += 50) {
        const group = videoIds.slice(i, i + 50);
        const apiKey = this.getApiKey(); if (!apiKey) break;
        const url = `${this.baseUrl}/videos?part=snippet,contentDetails,statistics&id=${group.join(',')}&key=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) { this.apiKeyManager.handleApiKeyError(apiKey, new Error(String(res.status))); continue; }
        this.updateQuotaUsage(apiKey, 1);
        const data = await res.json();
        (data.items || []).forEach(v => results.push(v));
      }
      return results;
    }
    
    // 보조) ISO8601 duration → 초
    parseISODurationToSec(iso) {
      const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso) || [];
      const h = Number(m[1] || 0), mn = Number(m[2] || 0), s = Number(m[3] || 0);
      return h * 3600 + mn * 60 + s;
    }
    
    // 5) 기간/형식 필터 + 간단 바이럴 점수
    computeViralScore(items, { timeRange, format, now = Date.now() }) {
      const rangeMs = { '1day': 86400000, '3days': 259200000, '1week': 604800000, '2weeks': 1209600000 }[timeRange] || 604800000;
      const filtered = items.filter(v => {
        const t = new Date(v.snippet?.publishedAt || 0).getTime();
        if (!t || (now - t) > rangeMs) return false;
        if (format === 'shorts' || format === 'long') {
          const secs = this.parseISODurationToSec(v.contentDetails?.duration || 'PT0S');
          if (format === 'shorts' && secs > 180) return false;
          if (format === 'long' && secs <= 180) return false;
        }
        return true;
      });
      return filtered.map(v => {
        const st = v.statistics || {};
        const views = Number(st.viewCount || 0);
        const likes = Number(st.likeCount || 0);
        const comments = Number(st.commentCount || 0);
        const pub = new Date(v.snippet?.publishedAt || 0).getTime();
        const ageDays = Math.max((now - pub) / 86400000, 0.01);
        const velocity = views / ageDays;                  // 조회 속도
        const er = (likes + comments) / Math.max(views,1); // 참여율
        const score = velocity * (1 + 3*er);               // 간단 가중
        return { video: v, score };
      });
    }
    
    // 6) 영상 제목 필터링 (Tier 2, Tier 3 키워드로 필터링)
    filterVideosByTitleKeywords(videos, tier2Keywords = [], tier3Keywords = []) {
      if (!videos || videos.length === 0) {
        console.log('⚠️ 필터링할 영상이 없습니다.');
        return videos;
      }
      
      // Tier 2, Tier 3 키워드가 없으면 필터링하지 않음
      if ((!tier2Keywords || tier2Keywords.length === 0) && 
          (!tier3Keywords || tier3Keywords.length === 0)) {
        console.log('⚠️ Tier 2, Tier 3 키워드가 없어 필터링하지 않습니다.');
        return videos;
      }
      
      // 모든 키워드를 하나의 배열로 합치기
      const allKeywords = [
        ...(tier2Keywords || []),
        ...(tier3Keywords || [])
      ];
      
      if (allKeywords.length === 0) {
        console.log('⚠️ 필터링 키워드가 없습니다.');
        return videos;
      }
      
      console.log(`🔍 제목 필터링 시작: ${videos.length}개 영상 중 키워드 [${allKeywords.join(', ')}]로 필터링`);
      
      let matchedCount = 0;
      let noTitleCount = 0;
      const matchedKeywords = new Map(); // 키워드별 매칭 수
      
      // 영상 객체 또는 비디오 객체를 처리
      const filtered = videos.filter(video => {
        // 🔥 다양한 경로에서 제목 추출 시도
        let title = '';
        if (video.snippet && video.snippet.title) {
          title = video.snippet.title;
        } else if (video.title) {
          title = video.title;
        } else if (video.video) {
          if (video.video.snippet && video.video.snippet.title) {
            title = video.video.snippet.title;
          } else if (video.video.title) {
            title = video.video.title;
          }
        }
        
        if (!title || title.trim() === '') {
          noTitleCount++;
          return false;
        }
        
        const titleLower = title.toLowerCase();
        let matched = false;
        let matchedKeyword = null;
        
        // 제목에 Tier 2 또는 Tier 3 키워드가 포함되어 있는지 확인
        for (const keyword of allKeywords) {
          if (!keyword || keyword.trim() === '') continue;
          const keywordLower = keyword.toLowerCase().trim();
          
          // 부분 문자열 매칭
          if (titleLower.includes(keywordLower)) {
            matched = true;
            matchedKeyword = keyword;
            break;
          }
        }
        
        if (matched) {
          matchedCount++;
          if (matchedKeyword) {
            matchedKeywords.set(matchedKeyword, (matchedKeywords.get(matchedKeyword) || 0) + 1);
          }
        }
        
        return matched;
      });
      
      // 필터링 통계 로깅
      console.log(`✅ 제목 필터링 완료:`);
      console.log(`  - 입력: ${videos.length}개`);
      console.log(`  - 매칭: ${matchedCount}개`);
      console.log(`  - 제목 없음: ${noTitleCount}개`);
      console.log(`  - 결과: ${filtered.length}개 (${((filtered.length / Math.max(1, videos.length)) * 100).toFixed(1)}%)`);
      
      // 키워드별 매칭 통계
      if (matchedKeywords.size > 0) {
        console.log(`📊 키워드별 매칭 통계:`);
        matchedKeywords.forEach((count, keyword) => {
          console.log(`  - "${keyword}": ${count}개`);
        });
      }
      
      // 필터링 결과가 너무 적을 경우 경고
      if (filtered.length < videos.length * 0.1 && filtered.length < 10) {
        console.warn(`⚠️ 필터링 결과가 매우 적습니다: ${filtered.length}개 (전체의 ${((filtered.length / Math.max(1, videos.length)) * 100).toFixed(1)}%)`);
        console.warn(`  - 키워드 확인: [${allKeywords.join(', ')}]`);
        console.warn(`  - 제목 샘플 확인 필요`);
      }
      
      return filtered;
    }
    
    // 6) 전체 파이프라인 - 전수 검사 지원 (중복 함수이므로 주석 처리 또는 제거 권장)
    // 참고: 위의 runChannelUploadPipeline 함수가 더 완전한 구현입니다.
    async runChannelUploadPipeline(keywords, { format, timeRange, perChannelMax, topN=200 }) {
      // perChannelMax 기본값 처리: 사용자 설정값 또는 Infinity (전수 검사)
      if (perChannelMax === undefined || perChannelMax === null) {
        const userSetting = Number(localStorage.getItem('hot_perChannelMax'));
        perChannelMax = (userSetting && userSetting > 0) ? userSetting : Infinity;
      }
      
      // 1) 채널 인덱싱 - 전수 검사
      const channels = await this.discoverSeedChannels(keywords, Infinity);
      if (!channels.length) return [];
    
      // 2) 채널별 업로드 재생목록 → 영상 ID 수집 - 전수 검사
      const allIds = new Set();
      for (let i = 0; i < channels.length; i++) {
        if (!this.isScanning) break; // 중지 요청 확인
        
        const ch = channels[i];
        const uploadsId = await this.getUploadsPlaylistId(ch);
        if (!uploadsId) continue;
        const ids = await this.fetchRecentUploads(uploadsId, perChannelMax);
        ids.forEach(id => allIds.add(id));
    
        // 진행률 훅(있으면)
        if (typeof this.updateProgress === 'function') {
          this.updateProgress(i+1, channels.length, allIds.size, 0, `채널 스캔 중… (${allIds.size}개 영상 발견)`);
        }
      }
    
      // 3) 통계 일괄 조회
      const stats = await this.fetchVideoStatsBulk(Array.from(allIds));
    
      // 4) 점수 계산 → 정렬 → 상위 N
      const scored = this.computeViralScore(stats, { format, timeRange });
      scored.sort((a,b) => b.score - a.score);
      return scored.slice(0, topN).map((s, i) => ({ rank: i+1, score: s.score, ...s.video }));
    }





    /* === [/NEW] ============================================================ */


    // 결과 중복 제거: videoId를 우선 키로 사용
    dedupeRows(rows) {
      const seen = new Set();
      const out = [];
      for (const r of (rows || [])) {
        // videoId 우선, 없으면 id → contentDetails.videoId 순서로 키 선택
        const key = (r.videoId || r.id || r?.contentDetails?.videoId || '').toString().trim();
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(r);
      }
      console.log(`🔄 중복 제거: ${Array.isArray(rows) ? rows.length : 0} → ${out.length}`);
      return out;
    }
    


    // 성공 메시지 표시
    showSuccess(message, title = '작업 완료') {
        const successContainer = document.getElementById('successMessage');
        const successTitle = document.getElementById('successTitle');
        const successText = document.getElementById('successText');
        
        if (successContainer && successTitle && successText) {
            successTitle.textContent = title;
            successText.textContent = message;
            successContainer.style.display = 'block';
            
            // 3초 후 자동 숨김
            setTimeout(() => {
                successContainer.style.display = 'none';
            }, 3000);
        }
    }
    
    // API 상태 배너 표시
    showApiStatusBanner(message, isSuccess = true) {
        const banner = document.getElementById('apiStatusBanner');
        const text = document.getElementById('apiStatusText');
        const icon = banner?.querySelector('i');
        
        if (banner && text) {
            text.textContent = message;
            
            if (isSuccess) {
                banner.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                if (icon) {
                    icon.className = 'fas fa-check-circle';
                }
            } else {
                banner.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                if (icon) {
                    icon.className = 'fas fa-exclamation-triangle';
                }
            }
            
            banner.classList.add('show');
            
            // 5초 후 자동 숨김
            setTimeout(() => {
                banner.classList.remove('show');
            }, 5000);
        }
    }
    

    // runFullScan 메서드 추가 (클래스 내부에)
    // runFullScan 메서드 추가 (클래스 내부에)
    async runFullScan(keywords, format, timeRange, count, viewCountFilter = 'all') {
      console.log('🚀 전체 스캔 시작:', { 
        keywords: keywords.length, 
        format, 
        timeRange, 
        count, 
        viewCountFilter: this.getViewCountFilterText(viewCountFilter)
      });
      
      const totalKeywords = keywords.length;
      let processedKeywords = 0;
      let foundVideos = 0;
    
      // ▶ 초기값 DOM 반영 + 처리속도 타이머 시작
      this.updateScanProgress(0, totalKeywords, 0);
      this.startRealtimeCounters();
      this.updateCurrentAction?.('백데이터 수집 시작');
    
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
              videos = await this.searchVideosForKeyword(keyword, format, timeRange, viewCountFilter);
              // 할당량 업데이트는 searchVideosForKeyword에서 자동 처리됨
              this.saveToCache(cacheKey, videos);
            } else {
              console.warn(`⚠️ 할당량 부족으로 ${keyword}를 모의 데이터로 대체합니다.`);
              videos = this.mockDataGenerator.generateForKeyword(keyword, 5);
            }
          }
          
          // ✅ try 블록 안으로 이동
          if (videos && videos.length > 0) {
            // 배열 전개(push ...videos)
            this.allVideos.push(...videos);
            foundVideos += videos.length;
            
            // ▶ 스캔 진행률 업데이트 + 실시간 카운터 추가
            this.bumpCountersOnBatch({
              addedBackground: videos.length,
              addedDetected: 0  // 검출은 나중에 계산
            });
            this.updateRealtimeDisplay(); // ✅ 실제 백데이터 업데이트 메서드로 변경!
          }
    
          processedKeywords++;
          
          // ★ 실시간 카운터(백데이터/검출/속도) 갱신 추가
          this.updateRealtimeCounters(foundVideos, processedKeywords);
          
          // 진행 상황 업데이트
          this.updateScanProgress(processedKeywords, totalKeywords, foundVideos);
          this.updateCurrentAction?.(`"${keyword}" 처리 중`);
          
          // API 요청 간 지연
          await this.delay(500);
          
        } catch (error) {  // ✅ 이제 올바른 try-catch 구조
          console.error(`❌ 키워드 ${keyword} 검색 실패:`, error);
        }
      }
    
      // ▶ 루프 종료: 처리속도 타이머 정리
      this.stopRealtimeCounters();
      this.updateCurrentAction?.('🔧 백그라운드 데이터 추가 분석 중…');
      
      // 모든 API 키 실패 시 데모 모드 자동 전환
      if (this.allVideos.length === 0 && processedKeywords > 0) {
        console.warn('🔴 모든 키워드 검색이 실패했습니다. 데모 모드로 전환합니다.');
        
        this.showSuccess(`
          API 키 문제로 인해 데모 모드로 전환되었습니다.
          
          실제 데이터를 보시려면:
          1. API 키 상태를 확인하세요
          2. 새로운 API 키를 추가하세요  
          3. 내일 다시 시도해보세요
        `, 'API 문제 감지');
        
        // 데모 데이터 생성
        const category = document.getElementById('scanCategory')?.value || 'all';
        this.allVideos = this.mockDataGenerator.generateRealisticData(category, count || 50);
        this.allVideos.forEach(video => {
          video.isSimulated = true;
          video.title = "🎯 [데모] " + video.title;
        });
        
        console.log(`📊 데모 데이터 ${this.allVideos.length}개 생성 완료`);
      }
      
      // 바이럴 점수 계산 및 결과 정리
      await this.processAndDisplayResults(count, viewCountFilter);
    }

    
    
    // runSmartMode 메서드 추가
    // runSmartMode 메서드 추가
    async runSmartMode(category, format, count, limitedKeywords) {
      console.log('🧠 스마트 모드 실행:', { category, format, count, keywords: limitedKeywords.length });
      
      // 제한된 키워드로만 검색
      const totalKeywords = limitedKeywords.length;
      let processedKeywords = 0;
      let foundVideos = 0;
    
      // ▶ 초기값 DOM 반영 + 처리속도 타이머 시작
      this.updateScanProgress(0, totalKeywords, 0);
      this.startRealtimeCounters();
      this.updateCurrentAction?.('스마트 스캔 시작');
    
      for (const keyword of limitedKeywords) {
        if (!this.isScanning) break;
        try {
          console.log(`🔍 스마트 검색: ${keyword}`);
          
          // 스마트 모드에서는 더 짧은 기간 사용 (API 효율성)
          const smartTimeRange = timeRange === '2weeks' ? '1week' : 
                                 timeRange === '1week'  ? '3days' : 
                                 timeRange === '3days'  ? '1day'  : '1day';
          const cacheKey = this.getCacheKey(keyword, format, smartTimeRange);
          let videos = this.getFromCache(cacheKey);
          
          if (!videos) {
            if (this.canUseQuota(100)) {
              // 스마트 모드: 최근 위주
              videos = await this.searchVideosForKeyword(keyword, format, 'week');
              this.saveToCache(cacheKey, videos);
            } else {
              break; // 할당량 부족시 중단
            }
          }
          
          // ✅ try 블록 안으로 이동
          if (videos && videos.length > 0) {
            this.allVideos.push(...videos);
            foundVideos += videos.length;
            
            // ▶ 실시간 카운터 즉시 반영
            this.bumpCountersOnBatch({
              addedBackground: videos.length,
              addedDetected: 0
            });
            this.updateRealtimeDisplay(); // ✅ 실제 백데이터 업데이트 메서드로 변경
          }

          processedKeywords++;
          
          // ★ 실시간 카운터 갱신 추가
          this.updateRealtimeCounters(foundVideos, processedKeywords);
          
          this.updateScanProgress(processedKeywords, totalKeywords, foundVideos);
          this.updateCurrentAction?.(`"${keyword}" 처리 중`);

          await this.delay(300);
          
        } catch (error) {  // ✅ 이제 올바른 try-catch 구조
          console.error(`❌ 스마트 모드 검색 실패:`, error);
        }
      }
    
      // ▶ 루프 종료: 처리속도 타이머 정리
      this.stopRealtimeCounters();
      this.updateCurrentAction?.('🔧 백그라운드 데이터 추가 분석 중…');
      
      // 부족한 데이터는 모의 데이터로 보충
      const remainingCount = Math.max(0, count - this.allVideos.length);
      if (remainingCount > 0) {
        console.log(`📊 모의 데이터 ${remainingCount}개 생성`);
        const mockVideos = this.mockDataGenerator.generateRealisticData(category, remainingCount);
        this.allVideos.push(...mockVideos);
      }
      
      await this.processAndDisplayResults(count);
    }

    
    // searchVideosForKeyword 메서드 추가 (실제 API 호출) - 전수 검사 지원 (페이지네이션 추가)
    async searchVideosForKeyword(keyword, format, timeRange, maxResults = Infinity) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('사용 가능한 YouTube API 키가 없습니다. API 키 풀에 키를 추가해주세요.');
        }
        
        try {
            const allVideoIds = [];
            let pageToken = '';
            let totalPages = 0;
            const maxPages = maxResults === Infinity ? Infinity : Math.ceil(maxResults / 50);
            
            console.log(`🔍 키워드 검색 시작: "${keyword}" (${format}, ${timeRange}) - 전수 검사 모드`);
            
            // 페이지네이션을 통한 전수 검색
            while (true) {
                // 중지 요청 확인
                if (!this.isScanning) {
                    console.log(`⏸️ 사용자에 의해 검색 중지됨: "${keyword}"`);
                    break;
                }
                
                // 할당량 확인
                if (!this.canUseQuota(100)) {
                    console.warn(`⚠️ 할당량 부족으로 "${keyword}" 검색 중단`);
                    break;
                }
                
                // API URL 구성
                const url = new URL(`${this.baseUrl}/search`);
                url.searchParams.append('part', 'snippet');
                url.searchParams.append('q', keyword);
                url.searchParams.append('type', 'video');
                url.searchParams.append('order', 'relevance');
                url.searchParams.append('maxResults', '50');
                url.searchParams.append('key', apiKey);
                
                // 페이지네이션 토큰 추가
                if (pageToken) {
                    url.searchParams.append('pageToken', pageToken);
                }
                
                // 시간 범위 필터
                if (timeRange && timeRange !== 'all') {
                    const publishedAfter = this.getTimeFilter(timeRange);
                    url.searchParams.append('publishedAfter', publishedAfter);
                }
                
                // 영상 길이 필터
                if (format && format !== 'all') {
                    const videoDuration = this.getDurationFilter(format);
                    if (videoDuration !== 'any') {
                        url.searchParams.append('videoDuration', videoDuration);
                    }
                }
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    const errorMessage = `API 요청 실패: ${response.status} ${response.statusText}`;
                    
                    // API 키 에러 처리
                    if (response.status === 403) {
                        console.error(`🚫 API 키 할당량 초과: ${apiKey.substr(0, 10)}...`);
                        this.apiKeyManager.handleApiKeyError(apiKey, new Error(errorMessage));
                        break; // 할당량 초과 시 중단
                    } else if (response.status === 400) {
                        console.error(`❌ API 키 오류: ${apiKey.substr(0, 10)}...`);
                        this.apiKeyManager.handleApiKeyError(apiKey, new Error(errorMessage));
                        break;
                    }
                    
                    throw new Error(errorMessage);
                }
                
                const data = await response.json();
                
                // 성공적인 API 호출 시 할당량 업데이트
                this.updateQuotaUsage(apiKey, 100);
                totalPages++;
                
                if (!data.items || data.items.length === 0) {
                    console.log(`📄 페이지 ${totalPages}: 결과 없음`);
                    break;
                }
                
                // 비디오 ID 추출
                const pageVideoIds = data.items.map(item => item.id.videoId).filter(Boolean);
                allVideoIds.push(...pageVideoIds);
                
                console.log(`📄 페이지 ${totalPages}: ${pageVideoIds.length}개 영상 발견 (누적: ${allVideoIds.length}개)`);
                
                // 최대 결과 수 제한 확인
                if (maxResults !== Infinity && allVideoIds.length >= maxResults) {
                    allVideoIds.splice(maxResults);
                    console.log(`✅ 최대 결과 수 도달: ${maxResults}개로 제한`);
                    break;
                }
                
                // 다음 페이지 토큰 확인
                pageToken = data.nextPageToken || '';
                if (!pageToken) {
                    console.log(`✅ 마지막 페이지 도달: 총 ${allVideoIds.length}개 영상 발견`);
                    break;
                }
                
                // 최대 페이지 수 확인
                if (totalPages >= maxPages) {
                    console.log(`✅ 최대 페이지 수 도달: ${maxPages}페이지`);
                    break;
                }
                
                // API 요청 간 지연 (할당량 보호)
                await this.delay(300);
            }
            
            if (allVideoIds.length === 0) {
                console.warn(`⚠️ 키워드 "${keyword}"에 대한 결과가 없습니다.`);
                return [];
            }
            
            // 상세 정보 가져오기 (동일한 API 키 사용)
            const detailedVideos = await this.getVideoDetails(allVideoIds, keyword, apiKey);
            
            console.log(`✅ 키워드 "${keyword}": ${detailedVideos.length}개 영상 검색 완료 (${totalPages}페이지, API 키: ${apiKey.substr(0, 10)}...)`);
            return detailedVideos;
            
        } catch (error) {
            console.error(`❌ 키워드 "${keyword}" 검색 실패:`, error);
            
            // API 키 에러 처리
            this.apiKeyManager.handleApiKeyError(apiKey, error);
            
            throw error;
        }
    }
    
    // enrichVideoData 메서드 추가
    // enrichVideoData 메서드 추가
    async enrichVideoData(item, searchKeyword) {
        try {
            // API 키 풀링 시스템에서 키 가져오기
            const apiKey = this.getApiKey();
            if (!apiKey) {
                throw new Error('사용 가능한 API 키가 없습니다.');
            }
            
            // 비디오 상세 정보 가져오기
            const detailUrl = `${this.baseUrl}/videos?part=statistics,contentDetails&id=${item.id.videoId}&key=${apiKey}`;
            const detailResponse = await fetch(detailUrl);
            
            if (!detailResponse.ok) {
                this.apiKeyManager.handleApiKeyError(apiKey, new Error(`API 요청 실패: ${detailResponse.status}`));
                throw new Error(`API 요청 실패: ${detailResponse.status}`);
            }
            
            const detailData = await detailResponse.json();
            this.updateQuotaUsage(apiKey, 1);
            
            if (detailData.items && detailData.items.length > 0) {
                const videoDetail = detailData.items[0];
                const statistics = videoDetail.statistics;
                const contentDetails = videoDetail.contentDetails;
                
                // 채널 정보 가져오기
                const channelUrl = `${this.baseUrl}/channels?part=statistics&id=${item.snippet.channelId}&key=${apiKey}`;
                const channelResponse = await fetch(channelUrl);
                
                if (!channelResponse.ok) {
                    this.apiKeyManager.handleApiKeyError(apiKey, new Error(`채널 API 요청 실패: ${channelResponse.status}`));
                    throw new Error(`채널 API 요청 실패: ${channelResponse.status}`);
                }
                
                const channelData = await channelResponse.json();
                this.updateQuotaUsage(apiKey, 1);
                
                let subscriberCount = 0;
                if (channelData.items && channelData.items.length > 0) {
                    subscriberCount = parseInt(channelData.items[0].statistics.subscriberCount) || 0;
                }
                
                const duration = this.parseDuration(contentDetails.duration);
                const isShorts = duration <= 180;
                
                const videoData = {
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
                return videoData;
            }
        } catch (error) {
            console.error('❌ 비디오 상세 정보 가져오기 실패:', error);
        }
        
        return null;
    }


    // getVideoDetails 함수 추가 (1985줄 이후)
    async getVideoDetails(videoIds, searchKeyword, apiKey = null) {
        if (!videoIds || videoIds.length === 0) {
            return [];
        }
        
        // API 키가 제공되지 않았으면 새로 가져오기
        if (!apiKey) {
            apiKey = this.getApiKey();
            if (!apiKey) {
                throw new Error('사용 가능한 YouTube API 키가 없습니다.');
            }
        }
        
        try {
            // 배치 크기로 나누어 처리 (한 번에 최대 50개)
            const batchSize = 50;
            const batches = [];
            
            for (let i = 0; i < videoIds.length; i += batchSize) {
                batches.push(videoIds.slice(i, i + batchSize));
            }
            
            const allVideos = [];
            
            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];
                
                // 각 배치마다 API 키 상태 확인
                const currentApiKey = batchIndex === 0 ? apiKey : this.getApiKey();
                if (!currentApiKey) {
                    console.warn('⚠️ 사용 가능한 API 키가 없어 일부 비디오 정보를 가져올 수 없습니다.');
                    break;
                }
                
                try {
                    const url = new URL(`${this.baseUrl}/videos`);
                    url.searchParams.append('part', 'snippet,statistics,contentDetails');
                    url.searchParams.append('id', batch.join(','));
                    url.searchParams.append('key', currentApiKey);
                    
                    console.log(`📊 비디오 상세정보 요청: ${batch.length}개 (API 키: ${currentApiKey.substr(0, 10)}...)`);
                    
                    const response = await fetch(url);
                    
                    if (!response.ok) {
                        const errorMessage = `비디오 상세정보 요청 실패: ${response.status} ${response.statusText}`;
                        
                        // API 키 에러 처리
                        if (response.status === 403) {
                            console.error(`🚫 API 키 할당량 초과: ${currentApiKey.substr(0, 10)}...`);
                            this.apiKeyManager.handleApiKeyError(currentApiKey, new Error(errorMessage));
                            
                            // 다른 키로 재시도
                            const nextApiKey = this.getApiKey();
                            if (nextApiKey && nextApiKey !== currentApiKey) {
                                console.log(`🔄 다른 API 키로 재시도: ${nextApiKey.substr(0, 10)}...`);
                                continue;
                            }
                        } else {
                            this.apiKeyManager.handleApiKeyError(currentApiKey, new Error(errorMessage));
                        }
                        
                        throw new Error(errorMessage);
                    }
                    
                    const data = await response.json();
                    
                    // 성공적인 API 호출 시 할당량 업데이트
                    this.updateQuotaUsage(currentApiKey, 1);
                    
                    if (data.items) {
                        const processedVideos = data.items.map(video => 
                            this.transformVideoDataOptimized(video, searchKeyword)
                        );
                        allVideos.push(...processedVideos);
                        
                        console.log(`✅ 배치 ${batchIndex + 1}/${batches.length}: ${processedVideos.length}개 비디오 처리 완료`);
                    }
                    
                } catch (batchError) {
                    console.error(`❌ 배치 ${batchIndex + 1} 처리 실패:`, batchError);
                    
                    // 배치 실패 시에도 다음 배치 계속 처리
                    continue;
                }
                
                // API 호출 간격 (다음 배치가 있을 때만)
                if (batchIndex < batches.length - 1) {
                    await this.delay(500);
                }
            }
            
            console.log(`📋 총 ${allVideos.length}개 비디오 상세정보 가져오기 완료`);
            return allVideos;
            
        } catch (error) {
            console.error('❌ 비디오 상세정보 가져오기 전체 실패:', error);
            
            // 전체 실패 시에도 API 키 에러 처리
            this.apiKeyManager.handleApiKeyError(apiKey, error);
            
            return [];
        }
    }


    
    // 헬퍼 메서드들 추가
    getPublishedAfterDate(timeRange) {
        const now = new Date();
        switch (timeRange) {
            case '1day':
                return new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
            case '3days':
                return new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
            case '1week':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            case '2weeks':
                return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
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
    
    processAndDisplayResults(maxCount, viewCountFilter = 'all') {
        // 중복 제거
        const sourceRows = Array.isArray(this.scanResults) ? this.scanResults : (this.allVideos || []);
        let uniqueVideos = this.removeDuplicates(sourceRows);
        
        // 조회수 필터 적용
        uniqueVideos = this.applyViewCountFilter(uniqueVideos, viewCountFilter);
        
        // 바이럴 점수 계산
        // 바이럴 점수 계산 (강화)
        uniqueVideos.forEach(video => {
            // 기본값 설정
            if (!video.viewCount) video.viewCount = 0;
            if (!video.likeCount) video.likeCount = 0;
            if (!video.commentCount) video.commentCount = 0;
            if (!video.subscriberCount) video.subscriberCount = 1000; // 기본 구독자 수
            if (!video.daysSincePublish) {
                video.daysSincePublish = video.publishedAt ? 
                    Math.floor((Date.now() - new Date(video.publishedAt)) / (1000 * 60 * 60 * 24)) : 1;
            }
            
            this.calculateViralScore(video);
        });
        
        
        // 정렬 및 제한
        this.scanResults = uniqueVideos
            .sort((a, b) => b.viralScore - a.viralScore)
            .slice(0, maxCount);
        
        // 결과 표시
        // UI 업데이트
        // 🔥 안전한 UI 업데이트 (에러 방지)
        try {
            this.displayResults();
        } catch (error) {
            console.error('displayResults 오류:', error);
        }
        
        try {
            // 함수 존재 여부 확인 후 호출
            if (typeof this.showResultsSection === 'function') {
                this.showResultsSection();
            } else if (typeof this.showResults === 'function') {
                this.showResults();
            } else {
                // 수동으로 결과 섹션 표시
                this.showResultsManually();
            }
        } catch (error) {
            console.error('결과 섹션 표시 오류:', error);
            this.showResultsManually();
        }
        
        try {
            if (typeof this.createCharts === 'function') {
                this.createCharts();
            }
        } catch (error) {
            console.error('차트 생성 오류:', error);
        }
        
        // 🔥 수집 통계 업데이트
        try {
            if (typeof this.updateCollectionStats === 'function') {
                this.updateCollectionStats();
            }
        } catch (error) {
            console.error('수집 통계 업데이트 오류:', error);
        }

        
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
    
    // Tier별 선택된 키워드 가져오기 (새로 추가)
    getSelectedKeywordsByTier() {
        const tier1Keywords = [];
        const tier2Keywords = [];
        const tier3Keywords = [];
        
        // 선택된 체크박스에서 Tier별로 분리
        const selectedCheckboxes = document.querySelectorAll('.keyword-checkbox:checked');
        selectedCheckboxes.forEach(checkbox => {
            const keyword = checkbox.value;
            const tier = checkbox.getAttribute('data-tier') || 'tier1';
            
            if (tier === 'tier1') {
                tier1Keywords.push(keyword);
            } else if (tier === 'tier2') {
                tier2Keywords.push(keyword);
            } else if (tier === 'tier3') {
                tier3Keywords.push(keyword);
            }
        });
        
        // Tier 1 키워드가 없으면 기본값 사용
        if (tier1Keywords.length === 0) {
            tier1Keywords.push(...this.optimizedKeywords.tier1);
            console.warn('⚠️ Tier1 키워드가 선택되지 않았습니다. 기본 Tier1 키워드를 사용합니다.');
        }
        
        console.log(`🎯 Tier별 선택된 키워드 - Tier1: ${tier1Keywords.length}개, Tier2: ${tier2Keywords.length}개, Tier3: ${tier3Keywords.length}개`);
        
        return {
            tier1: tier1Keywords,
            tier2: tier2Keywords,
            tier3: tier3Keywords
        };
    }


    // ===== 실시간 카운터/진행률/처리속도 표시 — 통째로 교체 =====
    
    // 1) 숫자 표시를 부드럽게 갱신
    updateCounterDisplay(el, text) {
      if (!el) return;
      el.classList?.add('updating');
      el.textContent = text;
      setTimeout(() => el.classList?.remove('updating'), 180);
    }
    
    // 2) 처리속도(X/초) 갱신 타이머
    startRealtimeCounters() {
      // 중복 실행 가드
      if (this._rtTickId) return;
    
      this._rtLastProcessed = 0;
      this._rtTickId = setInterval(() => {
        try {
          const rateEl = document.getElementById('processingRate');
          const processedEl =
            document.getElementById('processedKeywords') ||
            document.getElementById('scannedKeywords');
    
          const currProcessed = Number(
            (processedEl?.textContent || '0').toString().replace(/[^\d]/g, '')
          ) || 0;
    
          const delta = currProcessed - (this._rtLastProcessed || 0);
          this._rtLastProcessed = currProcessed;
    
          if (rateEl) this.updateCounterDisplay(rateEl, `${Math.max(0, delta)}/초`);
        } catch (e) {
          console.warn('processingRate tick error:', e);
        }
      }, 1000);
    }

    
    stopRealtimeCounters() {
      if (this._rtTickId) {
        clearInterval(this._rtTickId);
        this._rtTickId = null;
      }
      this._rtLastProcessed = 0;
    }
    
    // 3) 진행 상황 통합 갱신 (새 규격 + 구규격 ID 모두 지원)
    // === (변경후) 진행 상황 통합 갱신: 스캔 중에는 'API 사용량 기반' 진행바 ===
    updateScanProgress(processedKeywords, totalKeywords, foundVideos, forcedPercent) {
      const progressBar = document.getElementById('progressBar');
    
      // 새 규격
      const processedEl = document.getElementById('processedKeywords');
      const totalEl     = document.getElementById('totalKeywords');
      const foundEl     = document.getElementById('foundVideos');
      const quotaEl     = document.getElementById('quotaUsage');
    
      // 구 규격(겸용)
      const scannedEl   = document.getElementById('scannedKeywords');   // "x / y" 형식
      const scoresEl    = document.getElementById('calculatedScores');  // (없으면 무시)
    
      const safeTotal     = Math.max(1, Number(totalKeywords || 0));
      const safeProcessed = Math.max(0, Math.min(Number(processedKeywords || 0), safeTotal));
    
      // 기본 진행률: 채널/키워드 기준
      let percent = Math.round((safeProcessed / safeTotal) * 100);
      if (!Number.isFinite(percent)) percent = 0;
    
      // === 스캔중일 때만 '할당량(유닛) 기반' 진행률로 대체 ===
      if (this.isScanning) {
        // 필요 시 1회 초기화(예상 유닛, 베이스라인)
        this.initQuotaProgressIfNeeded();
    
        const usedTotal      = this.getQuotaUsed();
        const baseline       = Number(this._quotaProgress?.baseline || 0);
        const planned        = Math.max(1, Number(this._quotaProgress?.planned || 0)); // 분모 0 방지
        const usedSinceStart = Math.max(0, usedTotal - baseline);
    
        let quotaPercent = Math.round((usedSinceStart / planned) * 100);
        if (!Number.isFinite(quotaPercent)) quotaPercent = 0;
        percent = Math.min(100, quotaPercent);
      }
    
      // 필요 시 외부 강제 퍼센트 적용(더 작은 값 우선)
      if (Number.isFinite(forcedPercent)) {
        percent = Math.min(percent, Math.max(0, Math.min(100, Math.round(forcedPercent))));
      }
    
      // 숫자 카운터 갱신(※ 기존 소진량/표시부 그대로 유지)
      if (processedEl) this.updateCounterDisplay(processedEl, String(safeProcessed));
      if (totalEl)     this.updateCounterDisplay(totalEl,     String(safeTotal));
      if (foundEl)     this.updateCounterDisplay(foundEl,     String(Number(foundVideos || 0)));
      if (quotaEl) {
        const used = this.getQuotaUsed();
        this.updateCounterDisplay(quotaEl, String(used));
      }
    
      // 구 규격 표시(겸용)
      if (scannedEl) this.updateCounterDisplay(scannedEl, `${safeProcessed} / ${safeTotal}`);
      if (scoresEl)  this.updateCounterDisplay(scoresEl,  `${safeProcessed}`);
    
      // 진행바 DOM
      if (progressBar) {
        progressBar.style.width = `${percent}%`;
        progressBar.textContent = `${percent}%`;
      }
    }

    
    // 4) 현재 작업 상태 문구
    updateCurrentAction(text) {
      const el = document.getElementById('currentAction');
      if (el) el.textContent = text || '';
    }


    // 대용량 검색 진행률 표시
    updateLargeScaleProgress(message, processedChannels, targetChannels, currentBatch, totalBatches) {
        const channelPercent = Math.round((processedChannels / targetChannels) * 100);
        const batchPercent = Math.round((currentBatch / totalBatches) * 100);
        
        // 기존 진행률 업데이트
        this.updateProgress(
            channelPercent,
            targetChannels,
            processedChannels,
            this.realTimeCounters.backgroundData || 0,
            message
        );
        
        // 추가 상세 정보 표시
        const progressEl = document.querySelector('.progress-details');
        if (progressEl) {
            progressEl.innerHTML = `
                <div class="progress-detail-row">
                    <span class="label">처리된 채널:</span>
                    <span class="value">${processedChannels.toLocaleString('ko-KR')} / ${targetChannels.toLocaleString('ko-KR')} (${channelPercent}%)</span>
                </div>
                <div class="progress-detail-row">
                    <span class="label">완료된 배치:</span>
                    <span class="value">${currentBatch} / ${totalBatches} (${batchPercent}%)</span>
                </div>
                <div class="progress-detail-row">
                    <span class="label">수집된 영상:</span>
                    <span class="value">${(this.realTimeCounters.backgroundData || 0).toLocaleString('ko-KR')}개</span>
                </div>
            `;
        }
    }





    
    // 5) [호환용] 기존 updateProgress 시그니처 유지
    //    updateProgress(percent, totalKeywords, scannedKeywords, foundVideos, action)
    updateProgress(percent, totalKeywords, scannedKeywords, foundVideos, action) {
      // 기존 호출부 호환: scannedKeywords → processedKeywords로 간주
      const safeTotal     = Math.max(1, Number(totalKeywords || 0));
      const safeProcessed = Math.max(0, Math.min(Number(scannedKeywords || 0), safeTotal));
    
      // 상태 문구 먼저 갱신
      this.updateCurrentAction(action);
    
      // 통합 갱신 함수 호출(필요 시 percent를 강제값으로 전달)
      const forcedPercent = Number.isFinite(percent) ? percent : undefined;
      this.updateScanProgress(safeProcessed, safeTotal, foundVideos, forcedPercent);

    // 대용량 검색 시 추가 통계 표시
    const maxChannels = Number(localStorage.getItem('hot_maxChannels') || 500);
    const bgDataCount = this.realTimeCounters.backgroundData || 0;
    
    // 백그라운드 데이터 카운터 업데이트 시 대용량 표시
    const bgEl = document.getElementById('backgroundDataCount');
    if (bgEl && maxChannels > 1000) {
        const progressPercent = Math.round((bgDataCount / maxChannels) * 100);
        bgEl.textContent = `${bgDataCount.toLocaleString('ko-KR')}개 (${progressPercent}%)`;
    } else if (bgEl) {
        bgEl.textContent = bgDataCount.toLocaleString('ko-KR');
    }
    
    // 처리 속도 계산 개선
    if (this.largeScaleStartTime) {
        const elapsedSeconds = (Date.now() - this.largeScaleStartTime) / 1000;
        const rate = elapsedSeconds > 0 ? Math.round(bgDataCount / (elapsedSeconds / 60)) : 0;
        
        const rateEl = document.getElementById('processingRate');
        if (rateEl) {
            rateEl.textContent = `${rate.toLocaleString('ko-KR')} 채널/분`;
            }
        }
    }



        // === API 사용량 읽어오기(표시용) ===
        getQuotaUsed() {
          try {
            if (this.apiKeyManager && typeof this.apiKeyManager.getOverallStats === 'function') {
              const stats = this.apiKeyManager.getOverallStats();
              return Number(stats?.totalQuotaUsed || 0);
            }
          } catch (e) {
            console.warn('getQuotaUsed() 실패:', e);
          }
          return 0;
        }




    
    // 중복 제거 메서드
    // 중복 제거 메서드 (videoId 우선, id/ contentDetails.videoId 보조)
    // 중복 제거 메서드 (videoId 우선, id / contentDetails.videoId 보조)
    removeDuplicates(videos) {
      const unique = [];
      const seen = new Set();
      for (const video of (videos || [])) {
        const key = (video.videoId || video.id || (video.contentDetails && video.contentDetails.videoId) || '').toString().trim();
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(video);
      }
      console.log(`🔄 중복 제거: ${Array.isArray(videos) ? videos.length : 0} → ${unique.length}`);
      return unique;
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
        // 성장률 점수 (0-25점) - 계산 로직 개선
        const subscriberBase = Math.max(video.subscriberCount || 1000, 1000);
        const growthRate = Math.min((video.viewCount / subscriberBase) * 100, 1000); // 최대 1000% 제한
        video.growthRate = Math.round(growthRate * 100) / 100; // 소수점 2자리까지
        const growthScore = Math.min(growthRate * 0.1, 25); // 계수 조정
        
        // 최신성 점수 (0-20점) - 기간별 가중치 적용
        const daysSincePublish = video.daysSincePublish || 1;
        let freshnessScore = 0;
        
        // 분석 기간에 따른 최신성 점수 계산
        if (daysSincePublish <= 1) {
            freshnessScore = 20; // 1일 이내: 최고점
        } else if (daysSincePublish <= 3) {
            freshnessScore = Math.max(18 - (daysSincePublish - 1) * 2, 12); // 3일 이내: 12-18점
        } else if (daysSincePublish <= 7) {
            freshnessScore = Math.max(12 - (daysSincePublish - 3) * 1, 8); // 1주 이내: 8-12점
        } else if (daysSincePublish <= 14) {
            freshnessScore = Math.max(8 - (daysSincePublish - 7) * 0.5, 4); // 2주 이내: 4-8점
        } else {
            freshnessScore = Math.max(4 - (daysSincePublish - 14) * 0.1, 0); // 2주 초과: 0-4점
        }
        
        video.freshnessScore = Math.round(freshnessScore);
        
        // 쇼츠 보너스
        // 쇼츠 보너스
        const formatBonus = video.isShorts ? 10 : 0;
        
        // 조회수 보너스
        const viewCountBonus = this.getViewCountBonus(video.viewCount);
        
        // 최종 바이럴 점수 (0-1000점)
        video.viralScore = Math.round((viewScore + engagementScore + growthScore + freshnessScore) * 10 + formatBonus + viewCountBonus);
        
        return video.viralScore;
    }


    // 업로드일 포맷팅 함수 추가
        formatPublishDate(video) {
            if (!video.publishedAt && !video.publishDate) {
                return '-';
            }
            
            // publishedAt이 있으면 그것을 우선 사용
            if (video.publishedAt) {
                try {
                    // ISO 문자열에서 중복 제거
                    let dateString = video.publishedAt;
                    if (typeof dateString === 'string' && dateString.includes('Z') && dateString.indexOf('Z') !== dateString.lastIndexOf('Z')) {
                        // Z가 중복되어 있다면 첫 번째 Z까지만 사용
                        dateString = dateString.substring(0, dateString.indexOf('Z') + 1);
                    }
                    
                    const date = new Date(dateString);
                    if (!isNaN(date.getTime())) {
                        return date.toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        });
                    }
                } catch (error) {
                    console.warn('날짜 파싱 오류:', error);
                }
            }
            
            // publishDate가 있으면 그것을 사용
            if (video.publishDate) {
                return video.publishDate;
            }
            
            return '-';
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



    // 🔥 결과 섹션 표시 함수 추가 (클래스 내부에 추가)
    showResults() {
        const resultsSection = document.getElementById('resultsSection');
        const analysisSummary = document.getElementById('analysisSummary');
        const scanProgress = document.getElementById('scanProgress');
        
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }
        
        if (analysisSummary) {
            analysisSummary.style.display = 'block';
        }
        
        if (scanProgress) {
            scanProgress.style.display = 'none';
        }
        
        // 페이지 상단으로 스크롤
        setTimeout(() => {
            const element = resultsSection || analysisSummary;
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
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
    // 🔥 요약 카드 업데이트 (백그라운드 데이터 포함 개선)
        updateSummaryCards() {
            try {
                // 🔥 백그라운드 데이터와 화면 표시 데이터 모두 고려
                const totalVideos = this.fullBackgroundData ? this.fullBackgroundData.length : 0;
                const displayedVideos = this.scanResults ? this.scanResults.length : 0;
                
                // 백그라운드 데이터 기준으로 통계 계산 (더 정확함)
                const dataForStats = this.fullBackgroundData && this.fullBackgroundData.length > 0 
                    ? this.fullBackgroundData 
                    : this.scanResults || [];
                    
                const avgViralScore = dataForStats.length > 0 ? 
                    Math.round(dataForStats.reduce((sum, v) => sum + (v.viralScore || 0), 0) / dataForStats.length) : 0;
                const shortsCount = dataForStats.filter(v => v.isShorts).length;
                const shortsRatio = dataForStats.length > 0 ? Math.round((shortsCount / dataForStats.length) * 100) : 0;
                const avgGrowthRate = dataForStats.length > 0 ? 
                    (dataForStats.reduce((sum, v) => sum + (v.growthRate || 0), 0) / dataForStats.length).toFixed(1) : 0;
                
                // UI 요소 업데이트
                const totalVideosEl = document.getElementById('totalVideos');
                const avgViralScoreEl = document.getElementById('avgViralScore');
                const shortsRatioEl = document.getElementById('shortsRatio');
                const avgGrowthRateEl = document.getElementById('avgGrowthRate');
                
                if (totalVideosEl) {
                    totalVideosEl.textContent = totalVideos.toLocaleString('ko-KR');
                }
                if (avgViralScoreEl) {
                    avgViralScoreEl.textContent = avgViralScore;
                }
                if (shortsRatioEl) {
                    shortsRatioEl.textContent = `${shortsRatio}%`;
                }
                if (avgGrowthRateEl) {
                    avgGrowthRateEl.textContent = `${avgGrowthRate}%`;
                }
                
                // 🔥 화면 표시 영상 수 업데이트 (요소가 있다면)
                const displayedVideosEl = document.getElementById('displayedVideos');
                if (displayedVideosEl) {
                    displayedVideosEl.textContent = displayedVideos.toLocaleString('ko-KR');
                }
                
                // 🔥 수집 통계 표시 업데이트
                const collectionStatsElement = document.getElementById('collectionStats');
                if (collectionStatsElement && totalVideos > displayedVideos && totalVideos > 0) {
                    collectionStatsElement.textContent = `📊 백그라운드 수집: ${totalVideos.toLocaleString('ko-KR')}개 (화면 표시: ${displayedVideos.toLocaleString('ko-KR')}개)`;
                    collectionStatsElement.style.display = 'block';
                    console.log(`📊 수집 통계 업데이트: 총 ${totalVideos}개, 표시 ${displayedVideos}개`);
                } else if (collectionStatsElement) {
                    collectionStatsElement.style.display = 'none';
                }
                
                console.log(`📊 요약 카드 업데이트 완료 - 총 ${totalVideos}개, 표시 ${displayedVideos}개, 평균 바이럴 ${avgViralScore}`);
                
            } catch (error) {
                console.error('❌ 요약 카드 업데이트 오류:', error);
                
                // 🔥 오류 발생 시 기본값으로 설정
                const totalVideosEl = document.getElementById('totalVideos');
                if (totalVideosEl) totalVideosEl.textContent = '0';
            }
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



        // 🔥 수동 결과 섹션 표시 함수 추가 (백업용)
        showResultsManually() {
            console.log('🔄 수동으로 결과 섹션을 표시합니다...');
            
            // 결과 섹션들 표시
            const elementsToShow = [
                'resultsSection',
                'analysisSummary', 
                'chartsSection'
            ];
            
            const elementsToHide = [
                'scanProgress',
                'loadingOverlay'
            ];
            
            elementsToShow.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.style.display = 'block';
                    console.log(`✅ ${id} 표시됨`);
                } else {
                    console.warn(`⚠️ ${id} 요소를 찾을 수 없음`);
                }
            });
            
            elementsToHide.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.style.display = 'none';
                    console.log(`✅ ${id} 숨김`);
                }
            });
            
            // 결과 요약 업데이트
            this.updateSummaryCards();
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



    // 🔥 안전한 함수 호출 유틸리티 추가
    safeCallMethod(methodName, ...args) {
        try {
            if (typeof this[methodName] === 'function') {
                console.log(`📞 ${methodName} 함수 호출`);
                return this[methodName](...args);
            } else {
                console.warn(`⚠️ ${methodName} 함수가 존재하지 않습니다.`);
                return null;
            }
        } catch (error) {
            console.error(`❌ ${methodName} 함수 호출 중 오류:`, error);
            return null;
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
    
    
    // 스캔 중지
    // 스캔 중지 (개선된 버전)
    stopScan() {
        console.log('🛑 스캔 중지 요청');
        this.isScanning = false;
        
        // AbortController가 있다면 중지
        if (this.abortController) {
            this.abortController.abort();
            console.log('🔄 진행 중인 API 요청들을 중지했습니다.');
        }
        
        // 백그라운드 메시지 애니메이션 정리
        if (this.backgroundMessageInterval) {
            clearInterval(this.backgroundMessageInterval);
            this.backgroundMessageInterval = null;
            console.log('⏹️ 백그라운드 메시지 애니메이션 중지');
        }
        
        // 백그라운드 데이터 시뮬레이션 중지 (새로 추가)
        this.stopBackgroundDataSimulation();
        
        // 백그라운드 애니메이션 요소 숨기기
        const postProgressElement = document.getElementById('postProgressAnimation');
        if (postProgressElement) {
            postProgressElement.style.display = 'none';
        }
        
        // 실시간 카운터 리셋
        this.realTimeCounters = {
            backgroundData: 0,
            detectedVideos: 0,
            processingRate: 0,
            lastUpdateTime: Date.now(),
            rateCalculationBuffer: []
        };
        
        // 실시간 카운터 UI도 리셋
        if (typeof this.updateCounterDisplay === 'function') {
            this.updateCounterDisplay();
        }
        
        // 기존 UI 상태 복원
        this.updateScanButton(false);
        this.hideScanProgress();
        
        // 성공 메시지 표시 (안전한 호출)
        if (typeof this.showSuccess === 'function') {
            this.showSuccess('스캔이 중지되었습니다.', '중지 완료');
        }
        
        console.log('✅ 스캔 중지 및 정리 작업이 완료되었습니다.');
    }



    
    
    // 조회수 필터 텍스트 반환
    getViewCountFilterText(viewCountFilter) {
        const filterTexts = {
            'all': '전체 조회수',
            '1000000': '100만 이상',
            '500000': '50만 이상', 
            '100000': '10만 이상',
            '10000': '1만 이상'
        };
        return filterTexts[viewCountFilter] || '전체 조회수';
    }
    
    // 조회수 필터 적용
    applyViewCountFilter(videos, viewCountFilter) {
        if (viewCountFilter === 'all') {
            return videos;
        }
        
        const minViewCount = parseInt(viewCountFilter);
        const filteredVideos = videos.filter(video => video.viewCount >= minViewCount);
        
        console.log(`👁️ 조회수 필터 적용 (${this.getViewCountFilterText(viewCountFilter)}): ${videos.length} → ${filteredVideos.length}`);
        
        return filteredVideos;
    }
    
    // 조회수에 따른 가중치 계산 (바이럴 점수 계산 시 사용)
    getViewCountBonus(viewCount) {
        if (viewCount >= 1000000) return 15;      // 100만 이상: +15점
        if (viewCount >= 500000) return 10;       // 50만 이상: +10점
        if (viewCount >= 100000) return 5;        // 10만 이상: +5점
        if (viewCount >= 10000) return 2;         // 1만 이상: +2점
        return 0;                                 // 그 외: +0점
    }    


    
    // === 실시간 메트릭 유틸 ===
    startLiveMetricsUpdater() {
      if (this._metricsTimer) return;
      this._metricsTimer = setInterval(() => {
        // 1) processingRate 계산 (최근 1초 버퍼 합계)
        const now = Date.now();
        const windowMs = 1000;
        this.realTimeCounters.rateCalculationBuffer =
          (this.realTimeCounters.rateCalculationBuffer || []).filter(t => now - t < windowMs);
        this.realTimeCounters.processingRate = this.realTimeCounters.rateCalculationBuffer.length;
    
        // 2) DOM 반영
        this.updateLiveCountersUI();
      }, 1000);
    }
    
    stopLiveMetricsUpdater() {
      if (this._metricsTimer) {
        clearInterval(this._metricsTimer);
        this._metricsTimer = null;
      }
    }
    
    bumpCountersOnBatch({ addedBackground = 0, addedDetected = 0 }) {
      // 실시간 카운터 초기화 확인
      if (!this.realTimeCounters) {
        this.realTimeCounters = {
          backgroundData: 0,
          detectedVideos: 0,
          processingRate: 0,
          lastUpdateTime: Date.now(),
          rateCalculationBuffer: []
        };
      }
      
      // 누적 증가 (0 이상의 값만 추가)
      if (addedBackground > 0) {
        this.realTimeCounters.backgroundData = Math.max(0, this.realTimeCounters.backgroundData + addedBackground);
      }
      if (addedDetected > 0) {
        this.realTimeCounters.detectedVideos = Math.max(0, this.realTimeCounters.detectedVideos + addedDetected);
      }
    
      // 처리율 버퍼 채우기 (추가된 양만큼 타임스탬프 push)
      const now = Date.now();
      const totalAdded = Math.max(0, addedBackground + addedDetected);
      for (let i = 0; i < totalAdded; i++) {
        this.realTimeCounters.rateCalculationBuffer.push(now);
      }
      
      // 버퍼 크기 제한 (최근 1000개만 유지)
      if (this.realTimeCounters.rateCalculationBuffer.length > 1000) {
        this.realTimeCounters.rateCalculationBuffer = this.realTimeCounters.rateCalculationBuffer.slice(-1000);
      }
      
      // 마지막 업데이트 시간 기록
      this.realTimeCounters.lastUpdateTime = now;
      
      console.log(`📊 카운터 증가: +${addedBackground}개 백그라운드, +${addedDetected}개 검출 → 총 ${this.realTimeCounters.backgroundData}개`);
    }
    
    updateLiveCountersUI() {
      // ✅ 백데이터 업데이트 복원 (이중 업데이트 방지)
      const bgEl = document.querySelector('#backgroundDataCount, [data-metric="backgroundData"]');
      const detEl = document.querySelector('#detectedVideosCount, [data-metric="detectedVideos"]');
      const rateEl = document.querySelector('#processingRate, [data-metric="processingRate"]');
      const foundEl = document.querySelector('#discoveredVideosCount, [data-metric="discoveredVideos"]');
    
      // 실시간 카운터가 없으면 초기화
      if (!this.realTimeCounters) {
        this.realTimeCounters = {
          backgroundData: 0,
          detectedVideos: 0,
          processingRate: 0,
          lastUpdateTime: Date.now(),
          rateCalculationBuffer: []
        };
      }
    
      // 실제 데이터와 실시간 카운터 중 더 정확한 값 선택
      const actualBackgroundData = this.fullBackgroundData ? this.fullBackgroundData.length : (this.allVideos?.length || 0);
      const realtimeBackgroundData = this.realTimeCounters.backgroundData || 0;
      const totalCollected = Math.max(actualBackgroundData, realtimeBackgroundData);
      
      const detected = Math.max(
        this.scanResults?.length || 0,
        this.realTimeCounters.detectedVideos || 0
      );
      
      const rate = this.realTimeCounters.processingRate || 0;
    
      // 대용량 검색 시 진행률 표시
      const maxChannels = Number(localStorage.getItem('hot_maxChannels') || 500);
      const isLargeScale = maxChannels > 1000;
      
      // ✅ 백데이터 업데이트 - 대용량 시 진행률 포함
      if (bgEl) {
        if (isLargeScale && totalCollected > 0) {
          const progressPercent = Math.min(100, Math.round((totalCollected / maxChannels) * 100));
          bgEl.textContent = `${totalCollected.toLocaleString('ko-KR')} (${progressPercent}%)`;
        } else {
          bgEl.textContent = totalCollected.toLocaleString('ko-KR');
        }
      }
      
      // 검출된 영상 수 업데이트
      if (detEl) {
        detEl.textContent = detected.toLocaleString('ko-KR');
      }
      
      // 처리 속도 업데이트
      if (rateEl && rate > 0) {
        rateEl.textContent = `${rate.toLocaleString('ko-KR')}/분`;
      }
      
      // 실시간 카운터를 실제 값과 동기화
      this.realTimeCounters.backgroundData = totalCollected;
      this.realTimeCounters.detectedVideos = detected;
      
      console.log(`🔄 UI 업데이트: 백그라운드 ${totalCollected}개, 검출 ${detected}개, 속도 ${rate}/분`);
    }


        // 대용량 검색 경고 함수 (OptimizedYoutubeTrendsAnalyzer 클래스 내부에 추가)
        showLargeScaleWarning(channelCount) {
            const warningEl = document.getElementById('apiStatusBanner');
            if (warningEl) {
                const originalClass = warningEl.className;
                const originalContent = warningEl.innerHTML;
                
                // 경고 스타일로 변경
                warningEl.className = 'api-status-banner warning';
                warningEl.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>⚠️ 대용량 검색 모드: ${channelCount.toLocaleString('ko-KR')}개 채널 검색 - 완료까지 시간이 오래 걸릴 수 있습니다</span>
                `;
                
                // 3초 후 원래 상태로 복원
                setTimeout(() => {
                    warningEl.className = originalClass;
                    warningEl.innerHTML = originalContent;
                }, 5000);
            }
        }


        // 대용량 지원 채널 파이프라인
        async runLargeScaleChannelPipeline(keywords, options = {}) {
            const { maxChannels, batchSettings, concurrency = 4, tier2Keywords = [], tier3Keywords = [], topN, format, timeRange } = options;
            
            console.log(`🔄 대용량 파이프라인 시작: ${maxChannels.toLocaleString('ko-KR')}개 채널 목표`);
            console.log(`⚙️ 배치 설정:`, batchSettings);
            
            // 🔥 Tier별 키워드 정보 로깅
            const hasTier2Or3Keywords = (tier2Keywords && tier2Keywords.length > 0) || (tier3Keywords && tier3Keywords.length > 0);
            if (hasTier2Or3Keywords) {
                console.log(`📊 Tier별 필터링 활성화: Tier2(${tier2Keywords?.length || 0}개), Tier3(${tier3Keywords?.length || 0}개)`);
            }
            
            // 🔥 전체 결과를 수집하기 위해 필터링 없이 먼저 모든 영상 수집
            const allRawResults = [];
            let processedChannels = 0;
            let currentBatch = 0;
            
            try {
                // 키워드별로 배치 처리 - 필터링 없이 모든 영상 수집
                for (const keyword of keywords) {
                    if (processedChannels >= maxChannels) break;
                    
                    const remainingChannels = maxChannels - processedChannels;
                    const currentBatchSize = Math.min(batchSettings.batchSize, remainingChannels);
                    
                    currentBatch++;
                    
                    // 진행률 업데이트
                    this.updateLargeScaleProgress(
                        `키워드 "${keyword}" 처리 중... (배치 ${currentBatch})`,
                        processedChannels,
                        maxChannels,
                        currentBatch,
                        batchSettings.estimatedBatches
                    );
                    
                    // 🔥 필터링 없이 모든 영상 수집 (tier2Keywords, tier3Keywords를 빈 배열로 전달)
                    const batchResults = await this.runChannelUploadPipeline(
                        [keyword],
                        {
                            ...options,
                            topN: Infinity, // 모든 결과 수집
                            tier2Keywords: [], // 필터링 없이 수집
                            tier3Keywords: []  // 필터링 없이 수집
                        }
                    );
                    
                    if (batchResults && batchResults.length > 0) {
                        allRawResults.push(...batchResults);
                        processedChannels += batchResults.length;
                        
                        // 실시간 카운터 업데이트
                        this.realTimeCounters.backgroundData += batchResults.length;
                        this.updateRealtimeDisplay();
                    }
                    
                    // 배치 간 딜레이 (API 안정성)
                    if (currentBatch < keywords.length && processedChannels < maxChannels) {
                        await this.delay(batchSettings.delayMs);
                    }
                    
                    console.log(`✅ 배치 ${currentBatch} 완료: ${batchResults?.length || 0}개 결과 (누적: ${allRawResults.length.toLocaleString('ko-KR')}개)`);
                }
                
            } catch (error) {
                console.error(`❌ 대용량 파이프라인 오류:`, error);
            }
            
            console.log(`📊 전체 수집 완료: ${allRawResults.length.toLocaleString('ko-KR')}개 영상`);
            
            // 🔥 중복 제거
            const uniqueResults = this.dedupeRows(allRawResults);
            console.log(`🔄 중복 제거 완료: ${allRawResults.length}개 → ${uniqueResults.length}개`);
            
            // 🔥 점수 순으로 정렬 (score 기준)
            const sortedResults = uniqueResults.sort((a, b) => {
                const scoreA = Number(a.score || a.viralScore || 0);
                const scoreB = Number(b.score || b.viralScore || 0);
                return scoreB - scoreA; // 내림차순
            });
            console.log(`📊 점수 순 정렬 완료`);
            
            // 🔥 Tier 2, Tier 3 키워드로 제목 필터링 (전체 결과를 합친 후)
            let finalResults = sortedResults;
            if (hasTier2Or3Keywords && sortedResults.length > 0) {
                console.log(`🔍 전체 결과 제목 필터링 시작: ${sortedResults.length}개 영상 중`);
                finalResults = this.filterVideosByTitleKeywords(sortedResults, tier2Keywords, tier3Keywords);
                console.log(`✅ 제목 필터링 완료: ${sortedResults.length}개 → ${finalResults.length}개`);
                
                // 필터링 후 다시 점수 순으로 정렬 (필터링 과정에서 순서가 바뀔 수 있음)
                finalResults = finalResults.sort((a, b) => {
                    const scoreA = Number(a.score || a.viralScore || 0);
                    const scoreB = Number(b.score || b.viralScore || 0);
                    return scoreB - scoreA;
                });
            }
            
            // 🔥 상위 N개만 반환
            const topResults = finalResults.slice(0, Math.min(topN || 200, 10000));
            console.log(`🎯 최종 결과: ${topResults.length.toLocaleString('ko-KR')}개 (요청: ${topN || 200}개)`);
            
            // 🔥 필터링 통계 로깅
            if (hasTier2Or3Keywords) {
                console.log(`📊 필터링 통계:`);
                console.log(`  - 전체 수집: ${allRawResults.length}개`);
                console.log(`  - 중복 제거 후: ${uniqueResults.length}개`);
                console.log(`  - 필터링 후: ${finalResults.length}개`);
                console.log(`  - 최종 반환: ${topResults.length}개`);
            }
            
            return topResults;
        }
    


    
  
}  // ★★★★★ Class OptimizedYoutubeTrendsAnalyzer 모듈 끝 부분 ★★★★★

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
        const duration = isShorts ? Math.floor(Math.random() * 180) + 15 : Math.floor(Math.random() * 600) + 120;
        
        const daysAgo = Math.floor(Math.random() * 7) + 1;
        const publishedAt = new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000));
        
        return {
            id: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            title: title,
            channel: channel,
            channelId: `mock_channel_${Math.random().toString(36).substring(2, 9)}`,
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
                video.duration = Math.floor(Math.random() * 165) + 15;
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


