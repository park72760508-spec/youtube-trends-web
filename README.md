# 📊 시니어 YouTube 트렌드 분석기 (엑셀 다운로드)

[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-brightgreen)](https://github.com)
[![Excel Download](https://img.shields.io/badge/Excel-Download-success)](https://github.com)
[![CSV Support](https://img.shields.io/badge/CSV-Support-blue)](https://github.com)
[![JSON Export](https://img.shields.io/badge/JSON-Export-orange)](https://github.com)
[![PDF Report](https://img.shields.io/badge/PDF-Report-red)](https://github.com)

> 🎯 **시니어 특화 YouTube 트렌드 분석 및 데이터 다운로드 솔루션**

시니어 관련 YouTube 콘텐츠의 트렌드를 분석하고, **Excel, CSV, JSON, PDF** 형태로 다운로드할 수 있는 전문적인 웹 애플리케이션입니다.

## ✨ 핵심 기능

### 📥 **강력한 다운로드 기능**
- **📊 Excel (.xlsx)**: 상세한 데이터 분석이 가능한 다중 시트 구조
- **📄 CSV (.csv)**: 간편한 데이터 처리용 표준 형식 
- **📋 JSON (.json)**: 개발자 및 API 연동용 구조화된 데이터
- **📑 PDF Report**: 시각적 분석 보고서

### 🎯 **시니어 특화 분석**
- **건강 & 운동**: 시니어 운동, 관절 건강, 치매 예방 등
- **시니어 테크**: 스마트폰 사용법, 디지털 교육 등
- **요리 & 레시피**: 건강식단, 간편 요리 등
- **여행**: 시니어 여행, 효도 여행 등
- **취미 & 여가**: 문화활동, 평생교육 등
- **생활 정보**: 노후 준비, 연금 정보 등

### 📈 **데이터 분석 & 시각화**
- **실시간 트렌드 모니터링**: 성장률, 조회수, 참여도 분석
- **인터랙티브 차트**: Chart.js 기반 카테고리별 분포도
- **다양한 정렬 옵션**: 성장률, 조회수, 좋아요, 최신순
- **카드/테이블 뷰**: 사용자 편의성을 고려한 다중 뷰

## 🚀 빠른 시작

### 1️⃣ 로컬 실행
```bash
# 프로젝트 클론
git clone https://github.com/your-username/senior-youtube-trends-excel.git
cd senior-youtube-trends-excel

# 로컬 웹 서버 실행
python -m http.server 8000
# 또는
npx http-server . -p 8000 -o

# 브라우저에서 http://localhost:8000 접속
```

### 2️⃣ GitHub Pages 배포
```bash
# GitHub 저장소 생성 후
git init
git add .
git commit -m "🎯 시니어 YouTube 트렌드 분석기 - 엑셀 다운로드"
git remote add origin https://github.com/your-username/senior-youtube-trends-excel.git
git push -u origin main

# GitHub → Settings → Pages → Source: main branch → Save
# 배포 URL: https://your-username.github.io/senior-youtube-trends-excel/
```

## 📊 Excel 다운로드 기능 상세

### 📋 **다중 시트 구조**

#### 1️⃣ **요약 시트**
- 전체 통계 요약
- TOP 5 인기 영상
- 카테고리별 분포
- 분석 메타데이터

#### 2️⃣ **상세데이터 시트**
| 컬럼 | 설명 | 예시 |
|------|------|------|
| 순위 | 트렌드 순위 | 1, 2, 3... |
| 제목 | 영상 제목 | "60대도 쉽게 따라하는..." |
| 채널 | 채널명 | "실버헬스TV" |
| 카테고리 | 분류 | "건강 & 운동" |
| 조회수 | 현재 조회수 | "156,432" |
| 좋아요 | 좋아요 수 | "3,240" |
| 댓글수 | 댓글 수 | "187" |
| 성장률(%) | 시간당 성장률 | "12.5" |
| 참여도(%) | 참여율 | "4.7" |
| 게시시간 | 업로드 시점 | "2시간 전" |
| 영상길이 | 재생시간 | "15:30" |
| 태그 | 관련 태그 | "시니어건강, 실버운동" |
| 게시일 | 업로드 날짜 | "2025-01-15" |
| 비디오ID | YouTube ID | "dQw4w9WgXcQ" |
| 썸네일URL | 이미지 링크 | "https://..." |

#### 3️⃣ **카테고리분석 시트**
- 카테고리별 상세 통계
- 평균 조회수, 성장률, 참여도
- 각 카테고리의 TOP 영상

### 🎨 **Excel 파일 특징**
- **한글 인코딩 완벽 지원**: 엑셀에서 바로 열림
- **자동 열 너비 조정**: 가독성 최적화
- **타임스탬프 포함**: 파일명에 생성시간 자동 추가
- **대용량 데이터 지원**: 최대 1,000개 영상 분석

## 📱 사용자 인터페이스

### 🔍 **검색 설정**
- **카테고리 선택**: 전체 또는 특정 분야 필터링
- **정렬 기준**: 성장률, 조회수, 좋아요, 최신순
- **영상 개수**: 10개 ~ 100개 선택 가능

### 📊 **대시보드**
- **실시간 통계**: 분석된 영상 수, 총 조회수, 평균 참여도
- **트렌드 지표**: 성장률 기반 인기 상승 영상 표시
- **시각적 차트**: 카테고리별 분포 및 성장률 분석

### 🎛 **뷰 모드**
- **카드 뷰**: 썸네일과 함께 직관적 표시
- **테이블 뷰**: 데이터 중심의 표 형태

## 🛠 기술 스택

### **Frontend**
- **HTML5**: 시맨틱 마크업, 접근성 최적화
- **CSS3**: Flexbox/Grid, 반응형 디자인, 시니어 친화적 UI
- **JavaScript (ES6+)**: 클래스 기반 모듈화, async/await
- **Chart.js**: 데이터 시각화 라이브러리

### **라이브러리**
- **SheetJS (xlsx)**: Excel 파일 생성 및 다운로드
- **Font Awesome**: 아이콘 라이브러리
- **Chart.js**: 차트 및 그래프 생성

### **배포**
- **GitHub Pages**: 무료 정적 웹 호스팅
- **CDN**: 외부 라이브러리 최적화

## 📋 프로젝트 구조

```
senior-youtube-trends-excel/
├── 📄 index.html              # 메인 HTML 파일
├── 🎨 styles.css              # 스타일시트
├── ⚡ script.js               # 메인 JavaScript 로직
├── 📖 README.md               # 프로젝트 문서
├── 🚀 deployment-guide.md     # 배포 가이드
├── 📦 package.json            # 프로젝트 메타데이터
└── ⚖️ LICENSE                 # MIT 라이선스
```

## 🎯 시니어 특화 키워드

### **건강 & 운동**
```
시니어 운동, 실버 체조, 노인 건강, 관절 건강, 혈압 관리, 당뇨 관리, 
치매 예방, 건강식품, 한방치료, 실버 피트니스, 무릎 건강, 척추 건강
```

### **시니어 테크** 
```
시니어 스마트폰, 노인 컴퓨터, 실버 디지털, 시니어 앱, 디지털 교육,
온라인 쇼핑, 시니어 SNS, 유튜브 사용법, 카카오톡, 화상통화
```

### **요리 & 레시피**
```
시니어 요리, 간편 요리, 건강 레시피, 노인 식단, 당뇨식단, 
고혈압 식단, 시니어 영양, 건강 간식, 소화 잘 되는 음식
```

### **여행**
```
시니어 여행, 실버 여행, 노년 여행, 시니어 투어, 효도 여행,
버스투어, 온천 여행, 국내 여행, 해외 여행, 시니어 캠핑
```

### **취미 & 여가**
```
시니어 취미, 노년 여가, 서예, 원예, 합창, 악기 연주,
사진 취미, 독서 모임, 봉사활동, 문화활동, 평생교육
```

### **생활 정보**
```
연금 정보, 실버타운, 노후 준비, 시니어 패션, 노인 돌봄,
보험 정리, 재정 관리, 안전한 집, 법적 준비사항
```

## 📊 데이터 구조

### **영상 데이터 객체**
```javascript
{
  id: "video_unique_id",
  rank: 1,
  title: "영상 제목",
  channel: "채널명",
  category: "health",
  categoryName: "건강 & 운동",
  views: "156,432",
  likes: "3,240", 
  comments: "187",
  duration: "15:30",
  publishTime: "2시간 전",
  growthRate: "12.5",
  engagement: "4.7",
  tags: ["시니어건강", "실버운동"],
  description: "영상 설명",
  publishedAt: "2025-01-15",
  videoId: "dQw4w9WgXcQ",
  thumbnail: "https://..."
}
```

### **통계 데이터**
```javascript
{
  metadata: {
    title: "시니어 YouTube 트렌드 분석 데이터",
    generatedAt: "2025-01-15T10:30:00.000Z",
    totalVideos: 20,
    categories: ["건강 & 운동", "시니어 테크", ...],
    summary: {
      totalViews: 2547890,
      avgGrowthRate: "8.7"
    }
  },
  data: [/* 영상 데이터 배열 */]
}
```

## 🎨 시니어 친화적 디자인

### **접근성 최적화**
- ✅ **큰 폰트**: 기본 18px, 제목 24px+
- ✅ **높은 대비**: WCAG 2.1 AA 준수
- ✅ **명확한 네비게이션**: 직관적 버튼과 레이블
- ✅ **키보드 지원**: Tab 네비게이션 완벽 지원
- ✅ **반응형**: 모바일, 태블릿, 데스크톱 최적화

### **색상 팔레트**
```css
/* 주요 색상 */
--primary-blue: #3b82f6      /* 메인 액션 버튼 */
--success-green: #10b981     /* 성공, 다운로드 */
--warning-orange: #f59e0b    /* 주의, 강조 */
--danger-red: #ef4444        /* 오류, 경고 */
--purple: #8b5cf6            /* 차트, 장식 */
--gray: #64748b              /* 텍스트, 보조 */
```

### **타이포그래피**
- **폰트**: Segoe UI, Malgun Gothic (한글 최적화)
- **제목**: 600~700 Weight, 충분한 line-height
- **본문**: 400 Weight, 1.6 line-height
- **버튼**: 600 Weight, 명확한 액션 표시

## 🔧 고급 기능

### **YouTube API 연동** (선택사항)
```javascript
// API 키 설정
localStorage.setItem('youtube_api_key', 'YOUR_API_KEY');

// 실제 데이터 모드로 전환
// DEMO_MODE에서 실제 YouTube 데이터로 자동 전환
```

### **데이터 필터링**
- 조회수 범위 설정
- 게시 날짜 필터
- 성장률 임계값 조정
- 카테고리별 가중치 적용

### **고급 분석**
- 시간대별 업로드 패턴
- 카테고리별 성과 비교
- 채널별 트렌드 분석
- 키워드 연관성 분석

## 📈 활용 사례

### **콘텐츠 크리에이터**
- 시니어 타겟 콘텐츠 기획
- 경쟁 채널 분석
- 트렌드 키워드 발굴
- 업로드 타이밍 최적화

### **마케팅 전문가**
- 시니어 마케팅 전략 수립
- 인플루언서 발굴
- 광고 타겟팅 최적화
- ROI 분석 데이터

### **연구자/교육자**
- 시니어 디지털 리터러시 연구
- 세대별 콘텐츠 선호도 분석
- 사회 트렌드 연구
- 논문 데이터 수집

### **사업자**
- 시니어 대상 서비스 기획
- 시장 트렌드 파악
- 제품 개발 방향성
- 비즈니스 인텔리전스

## 📱 모바일 지원

### **반응형 디자인**
- **데스크톱**: 1200px+ (풀 기능)
- **태블릿**: 768px-1199px (최적화된 레이아웃)
- **모바일**: 767px 이하 (터치 친화적)

### **모바일 최적화**
- 터치 친화적 버튼 크기 (44px+)
- 스와이프 제스처 지원
- 모바일 다운로드 최적화
- 세로/가로 모드 지원

## 🔧 커스터마이징

### **키워드 수정**
```javascript
// script.js에서 키워드 추가/수정
this.seniorKeywords = {
  health: [
    '시니어 운동', '실버 체조', // 기존 키워드
    '노인 요가', '시니어 필라테스' // 새 키워드 추가
  ],
  // 새 카테고리 추가
  finance: [
    '시니어 투자', '연금 관리', '노후 자금'
  ]
};
```

### **스타일 커스터마이징**
```css
/* styles.css에서 색상 변경 */
:root {
  --primary-color: #your-color;
  --font-size-base: 18px; /* 시니어용 기본 폰트 크기 */
}
```

## 🚀 성능 최적화

### **로딩 최적화**
- 이미지 지연 로딩 (Lazy Loading)
- CDN 기반 라이브러리 로딩
- 파일 압축 및 최적화

### **브라우저 지원**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🛡 보안 고려사항

### **API 키 보안**
```javascript
// 실제 프로덕션에서는 환경변수 사용
const API_KEY = process.env.YOUTUBE_API_KEY;

// 또는 서버사이드 프록시 구현
fetch('/api/youtube-proxy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: searchQuery })
});
```

### **XSS 방지**
```javascript
// HTML 이스케이프 처리
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

## 📞 지원 및 문의

### **GitHub Repository**
- **Issues**: [문제 신고](https://github.com/your-username/senior-youtube-trends-excel/issues)
- **Discussions**: [질문 및 토론](https://github.com/your-username/senior-youtube-trends-excel/discussions)
- **Wiki**: [상세 문서](https://github.com/your-username/senior-youtube-trends-excel/wiki)

### **기여하기**
1. Fork 저장소
2. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치 Push (`git push origin feature/amazing-feature`)
5. Pull Request 생성

### **라이선스**
이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

## 🙏 감사의 글

- **YouTube Data API**: Google/YouTube 개발팀
- **SheetJS**: Excel 파일 처리 라이브러리
- **Chart.js**: 데이터 시각화 라이브러리  
- **Font Awesome**: 아이콘 라이브러리
- **시니어 사용자**: 소중한 피드백을 제공해주신 실제 사용자분들

---

## 🎯 **빠른 시작 요약**

```bash
# 1. 클론 및 실행
git clone https://github.com/your-username/senior-youtube-trends-excel.git
cd senior-youtube-trends-excel
python -m http.server 8000

# 2. 브라우저에서 http://localhost:8000 접속
# 3. 카테고리 선택 후 "트렌드 분석하기" 클릭
# 4. Excel/CSV/JSON/PDF 다운로드 버튼 클릭!
```

**⭐ 이 프로젝트가 도움이 되셨다면 Star를 눌러주세요!**

![GitHub stars](https://img.shields.io/github/stars/your-username/senior-youtube-trends-excel?style=social)
![GitHub forks](https://img.shields.io/github/forks/your-username/senior-youtube-trends-excel?style=social)