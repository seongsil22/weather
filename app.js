/* ==========================================================================
   AURA Weather - Core Application Javascript
   ========================================================================== */

// --- Constants & Configurations ---
const ENCODED_SERVICE_KEY = 'OaRLlfpKOXJH%2BFeghkAojoaSAQbb1bkFF9COvGfjixpiLkEYTHFLqIcBYqFb0HCrcX8H3A47X9QNiRpgcCXAOA%3D%3D';
const BASE_URL = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';

// Preset Regional Grid Coordinates database
const PRESET_CITIES = [
    { name: '서울', x: 60, y: 127, fullName: '서울특별시 종로구' },
    { name: '부산', x: 98, y: 76, fullName: '부산광역시 중구' },
    { name: '인천', x: 55, y: 124, fullName: '인천광역시 중구' },
    { name: '대구', x: 89, y: 90, fullName: '대구광역시 중구' },
    { name: '대전', x: 67, y: 100, fullName: '대전광역시 중구' },
    { name: '광주', x: 58, y: 74, fullName: '광주광역시 동구' },
    { name: '울산', x: 102, y: 84, fullName: '울산광역시 중구' },
    { name: '세종', x: 66, y: 103, fullName: '세종특별자치시' },
    { name: '경기 (수원)', x: 60, y: 121, fullName: '경기도 수원시 팔달구' },
    { name: '강원 (춘천)', x: 73, y: 134, fullName: '강원도 춘천시' },
    { name: '충북 (청주)', x: 69, y: 107, fullName: '충청북도 청주시 상당구' },
    { name: '충남 (홍성)', x: 55, y: 106, fullName: '충청남도 홍성군' },
    { name: '전북 (전주)', x: 63, y: 89, fullName: '전라북도 전주시 완산구' },
    { name: '전남 (무안)', x: 51, y: 67, fullName: '전라남도 무안군' },
    { name: '경북 (안동)', x: 91, y: 106, fullName: '경상북도 안동시' },
    { name: '경남 (창원)', x: 90, y: 77, fullName: '경상남도 창원시 의창구' },
    { name: '제주', x: 52, y: 38, fullName: '제주특별자치도 제주시' }
];

// App State
let appState = {
    currentX: 61,
    currentY: 127,
    currentLocationLabel: '서울특별시 종로구',
    isSimulatorMode: false,
    selectedSimWeather: 'clear', // 'clear', 'cloudy', 'rainy', 'snowy', 'night'
    searchHistory: []
};

// --- DOM Elements Cache ---
const el = {
    inputX: document.getElementById('inputX'),
    inputY: document.getElementById('inputY'),
    btnSearchCoords: document.getElementById('btnSearchCoords'),
    btnMyLocation: document.getElementById('btnMyLocation'),
    presetBadgesContainer: document.getElementById('presetBadgesContainer'),
    toggleSimulator: document.getElementById('toggleSimulator'),
    simulatorControls: document.getElementById('simulatorControls'),
    simulatorGroup: document.querySelector('.simulator-group'),
    historyList: document.getElementById('historyList'),
    currentLocationName: document.getElementById('currentLocationName'),
    currentCoordBadge: document.getElementById('currentCoordBadge'),
    btnRefresh: document.getElementById('btnRefresh'),
    refreshIcon: document.getElementById('refreshIcon'),
    currentTemp: document.getElementById('currentTemp'),
    weatherDesc: document.getElementById('weatherDesc'),
    weatherIconContainer: document.getElementById('weatherIconContainer'),
    weatherIconGlow: document.getElementById('weatherIconGlow'),
    metricHumidity: document.getElementById('metricHumidity'),
    metricRain: document.getElementById('metricRain'),
    metricWind: document.getElementById('metricWind'),
    metricUpdateTime: document.getElementById('metricUpdateTime'),
    forecastScrollContainer: document.getElementById('forecastScrollContainer'),
    digitalClock: document.getElementById('digitalClock'),
    apiStatusBadge: document.getElementById('apiStatusBadge'),
    apiStatusText: document.getElementById('apiStatusText'),
    toastNotification: document.getElementById('toastNotification'),
    toastMessage: document.getElementById('toastMessage'),
    skyEffectContainer: document.getElementById('skyEffectContainer'),
    windIcon: document.getElementById('windIcon')
};

// --- Lambert Conformal Conic Conversion Formula (dfs_xy_conv) ---
// RE: earth radius (km), GRID: grid spacing (km), SLAT1, SLAT2: standard parallels, OLON, OLAT: reference coordinates, XO, YO: reference grid coords
const RE = 6371.00877;
const GRID = 5.0;
const SLAT1 = 30.0;
const SLAT2 = 60.0;
const OLON = 126.0;
const OLAT = 38.0;
const XO = 43;
const YO = 136;

function dfs_xy_conv(code, v1, v2) {
    const DEGRAD = Math.PI / 180.0;
    const RADDEG = 180.0 / Math.PI;

    const re = RE / GRID;
    const slat1 = SLAT1 * DEGRAD;
    const slat2 = SLAT2 * DEGRAD;
    const olon = OLON * DEGRAD;
    const olat = OLAT * DEGRAD;

    let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = re * sf / Math.pow(ro, sn);
    
    let rs = {};
    if (code === "toXY") {
        rs['lat'] = v1;
        rs['lng'] = v2;
        let ra = Math.tan(Math.PI * 0.25 + (v1) * DEGRAD * 0.5);
        ra = re * sf / Math.pow(ra, sn);
        let theta = v2 * DEGRAD - olon;
        if (theta > Math.PI) theta -= 2.0 * Math.PI;
        if (theta < -Math.PI) theta += 2.0 * Math.PI;
        theta *= sn;
        rs['x'] = Math.floor(ra * Math.sin(theta) + XO + 0.5);
        rs['y'] = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
    } else {
        rs['x'] = v1;
        rs['y'] = v2;
        let xn = v1 - XO;
        let yn = ro - v2 + YO;
        let ra = Math.sqrt(xn * xn + yn * yn);
        if (sn < 0.0) ra = -ra;
        let alat = Math.pow((re * sf / ra), (1.0 / sn));
        alat = 2.0 * Math.atan(alat) - Math.PI * 0.5;
        let theta = 0.0;
        if (Math.abs(xn) <= 0.0) {
            theta = 0.0;
        } else {
            if (Math.abs(yn) <= 0.0) {
                theta = Math.PI * 0.5;
                if (xn < 0.0) theta = -theta;
            } else theta = Math.atan2(xn, yn);
        }
        let alon = theta / sn + olon;
        rs['lat'] = alat * RADDEG;
        rs['lng'] = alon * RADDEG;
    }
    return rs;
}

// --- Digital Clock ---
function startClock() {
    function updateClock() {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        el.digitalClock.textContent = `${hrs}:${mins}:${secs}`;
    }
    updateClock();
    setInterval(updateClock, 1000);
}

// --- Dynamic Particle Generation System (Visual Themes) ---
function renderWeatherParticles(theme) {
    // Clear old elements
    el.skyEffectContainer.innerHTML = '';
    
    // De-register dynamic sizing observers if any
    document.body.className = `weather-${theme}`;

    if (theme === 'clear') {
        // No heavy particles, just a subtle background ambient glow
        return;
    }

    if (theme === 'night') {
        // Generate glowing twinkling stars
        const starCount = 35;
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.width = star.style.height = `${Math.random() * 2 + 1}px`;
            star.style.left = `${Math.random() * 100}vw`;
            star.style.top = `${Math.random() * 60}vh`;
            star.style.animationDelay = `${Math.random() * 3}s`;
            star.style.animationDuration = `${2 + Math.random() * 3}s`;
            el.skyEffectContainer.appendChild(star);
        }
        return;
    }

    if (theme === 'cloudy') {
        // Generate big slow moving atmospheric clouds
        const cloudCount = 3;
        for (let i = 0; i < cloudCount; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'atmosphere-cloud';
            cloud.style.width = cloud.style.height = `${Math.random() * 300 + 300}px`;
            cloud.style.left = `${Math.random() * 100 - 20}vw`;
            cloud.style.top = `${Math.random() * 40 - 10}vh`;
            cloud.style.animationDelay = `${-Math.random() * 45}s`;
            el.skyEffectContainer.appendChild(cloud);
        }
        return;
    }

    if (theme === 'rainy') {
        // Generate falling rain drops
        const dropCount = 60;
        for (let i = 0; i < dropCount; i++) {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            drop.style.left = `${Math.random() * 120 - 10}vw`; // wider range because slanted
            drop.style.top = `${-80 - Math.random() * 100}px`;
            drop.style.animationDelay = `${Math.random() * 1.5}s`;
            drop.style.animationDuration = `${0.8 + Math.random() * 0.5}s`;
            el.skyEffectContainer.appendChild(drop);
        }
        return;
    }

    if (theme === 'snowy') {
        // Generate soft drifting snowflakes
        const flakeCount = 45;
        for (let i = 0; i < flakeCount; i++) {
            const flake = document.createElement('div');
            flake.className = 'snow-particle';
            const size = Math.random() * 5 + 3;
            flake.style.width = flake.style.height = `${size}px`;
            flake.style.left = `${Math.random() * 100}vw`;
            flake.style.top = `${-20 - Math.random() * 50}px`;
            flake.style.animationDelay = `${Math.random() * 4}s`;
            flake.style.animationDuration = `${3.5 + Math.random() * 2.5}s`;
            el.skyEffectContainer.appendChild(flake);
        }
    }
}

// --- Animated SVG Weather Icons ---
function generateWeatherSVG(pty, sky, isNight = false) {
    let type = 'clear'; // default
    
    // Map KMA parameters to logical SVG categories
    const ptyVal = parseInt(pty) || 0;
    const skyVal = parseInt(sky) || 1;

    if (ptyVal > 0) {
        if (ptyVal === 3 || ptyVal === 7) {
            type = 'snowy';
        } else if (ptyVal === 2 || ptyVal === 6) {
            type = 'rain-snow';
        } else {
            type = 'rainy';
        }
    } else {
        if (skyVal === 4) {
            type = 'overcast';
        } else if (skyVal === 3) {
            type = 'cloudy';
        } else {
            type = isNight ? 'clear-night' : 'clear';
        }
    }

    // Dynamic HSL coloring based on theme properties
    const sunColor = 'url(#sunGradient)';
    const cloudColor = 'url(#cloudGradient)';
    const rainColor = '#00f5d4';
    const snowColor = '#90e0ef';

    // SVG templates with rich inline CSS animations
    const defs = `
        <defs>
            <linearGradient id="sunGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffb703" />
                <stop offset="100%" stop-color="#ff4d00" />
            </linearGradient>
            <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
                <stop offset="100%" stop-color="#a3b1c6" stop-opacity="0.6" />
            </linearGradient>
            <linearGradient id="moonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#e2eafc" />
                <stop offset="100%" stop-color="#b7094c" />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.25"/>
            </filter>
        </defs>
    `;

    const svgStyles = `
        <style>
            .sun-pulse { animation: sun-scale 4s ease-in-out infinite alternate; transform-origin: center; }
            .sun-rays { animation: spin 24s linear infinite; transform-origin: center; }
            .cloud-drift { animation: cloud-bounce 5s ease-in-out infinite alternate; }
            .cloud-back { animation: cloud-bounce 6s ease-in-out infinite alternate-reverse; }
            .rain-drop-svg { animation: rain-drip 1s linear infinite; }
            .rain-drop-2 { animation-delay: 0.3s; }
            .rain-drop-3 { animation-delay: 0.6s; }
            .snow-spin { animation: flake-rotate 3s linear infinite; transform-origin: center; }
            .snow-fall-svg { animation: snow-descend 2s linear infinite; }
            .snow-fall-2 { animation-delay: 0.6s; }
            .snow-fall-3 { animation-delay: 1.2s; }
            .moon-tilt { animation: moon-sway 4s ease-in-out infinite alternate; transform-origin: center; }
            @keyframes sun-scale { 0% { transform: scale(0.92); } 100% { transform: scale(1.03); } }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes cloud-bounce { 0% { transform: translateY(0); } 100% { transform: translateY(-4px); } }
            @keyframes rain-drip { 0% { transform: translateY(-8px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(12px); opacity: 0; } }
            @keyframes flake-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes snow-descend { 0% { transform: translateY(-6px) translateX(0); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(10px) translateX(3px); opacity: 0; } }
            @keyframes moon-sway { 0% { transform: rotate(-5deg); } 100% { transform: rotate(5deg); } }
        </style>
    `;

    switch(type) {
        case 'clear':
            return `
                <svg viewBox="0 0 100 100" width="100%" height="100%" filter="url(#shadow)">
                    ${defs}
                    ${svgStyles}
                    <g class="sun-rays">
                        <circle cx="50" cy="50" r="22" fill="none" stroke="${sunColor}" stroke-width="4" stroke-dasharray="4,8" />
                        <circle cx="50" cy="50" r="28" fill="none" stroke="${sunColor}" stroke-width="3" stroke-dasharray="2,12" />
                    </g>
                    <circle class="sun-pulse" cx="50" cy="50" r="16" fill="${sunColor}" />
                </svg>
            `;
        case 'clear-night':
            return `
                <svg viewBox="0 0 100 100" width="100%" height="100%" filter="url(#shadow)">
                    ${defs}
                    ${svgStyles}
                    <g class="moon-tilt">
                        <path d="M42,24 C58,24 66,35 66,48 C66,62 53,72 38,72 C32,72 26,69 22,65 C32,68 45,63 48,49 C50,38 46,28 42,24 Z" fill="url(#moonGradient)" />
                        <!-- Twinkling Micro Star inside SVG -->
                        <circle cx="68" cy="28" r="2" fill="#fff" opacity="0.8" />
                        <circle cx="78" cy="38" r="1.5" fill="#fff" opacity="0.6" />
                    </g>
                </svg>
            `;
        case 'cloudy':
            return `
                <svg viewBox="0 0 100 100" width="100%" height="100%" filter="url(#shadow)">
                    ${defs}
                    ${svgStyles}
                    <!-- Behind Cloud / Sun -->
                    <circle cx="38" cy="36" r="12" fill="${sunColor}" opacity="0.6" class="sun-pulse" />
                    <path class="cloud-drift" d="M30,66 C22,66 18,58 22,50 C20,44 26,38 34,40 C38,32 48,32 52,38 C58,36 64,42 62,48 C68,52 66,66 54,66 Z" fill="${cloudColor}" />
                </svg>
            `;
        case 'overcast':
            return `
                <svg viewBox="0 0 100 100" width="100%" height="100%" filter="url(#shadow)">
                    ${defs}
                    ${svgStyles}
                    <path class="cloud-back" d="M32,58 C26,58 22,52 25,46 C24,41 29,36 35,38 C38,31 46,31 50,36 C54,34 59,39 58,44 C63,47 61,58 51,58 Z" fill="rgba(255, 255, 255, 0.4)" />
                    <path class="cloud-drift" d="M44,72 C36,72 32,64 36,56 C34,50 40,44 48,46 C52,38 62,38 66,44 C72,42 78,48 76,54 C82,58 80,72 68,72 Z" fill="${cloudColor}" />
                </svg>
            `;
        case 'rainy':
            return `
                <svg viewBox="0 0 100 100" width="100%" height="100%" filter="url(#shadow)">
                    ${defs}
                    ${svgStyles}
                    <path class="cloud-drift" d="M36,58 C28,58 24,50 28,42 C26,36 32,30 40,32 C44,24 54,24 58,30 C64,28 70,34 68,40 C74,44 72,58 60,58 Z" fill="${cloudColor}" />
                    <!-- Raindrops -->
                    <g fill="${rainColor}" stroke="none">
                        <rect class="rain-drop-svg" x="38" y="64" width="2" height="6" rx="1" />
                        <rect class="rain-drop-svg rain-drop-2" x="48" y="66" width="2" height="6" rx="1" />
                        <rect class="rain-drop-svg rain-drop-3" x="58" y="64" width="2" height="6" rx="1" />
                    </g>
                </svg>
            `;
        case 'snowy':
            return `
                <svg viewBox="0 0 100 100" width="100%" height="100%" filter="url(#shadow)">
                    ${defs}
                    ${svgStyles}
                    <path class="cloud-drift" d="M36,58 C28,58 24,50 28,42 C26,36 32,30 40,32 C44,24 54,24 58,30 C64,28 70,34 68,40 C74,44 72,58 60,58 Z" fill="${cloudColor}" />
                    <!-- Snowflakes -->
                    <g fill="${snowColor}" stroke="none" class="snow-spin">
                        <circle class="snow-fall-svg" cx="38" cy="65" r="2" />
                        <circle class="snow-fall-svg snow-fall-2" cx="48" cy="67" r="1.5" />
                        <circle class="snow-fall-svg snow-fall-3" cx="58" cy="65" r="2" />
                    </g>
                </svg>
            `;
        case 'rain-snow':
            return `
                <svg viewBox="0 0 100 100" width="100%" height="100%" filter="url(#shadow)">
                    ${defs}
                    ${svgStyles}
                    <path class="cloud-drift" d="M36,58 C28,58 24,50 28,42 C26,36 32,30 40,32 C44,24 54,24 58,30 C64,28 70,34 68,40 C74,44 72,58 60,58 Z" fill="${cloudColor}" />
                    <!-- Rain drop and snowflake combo -->
                    <rect class="rain-drop-svg" x="38" y="64" width="2" height="6" rx="1" fill="${rainColor}" />
                    <circle class="snow-fall-svg snow-fall-2" cx="48" cy="66" r="2" fill="${snowColor}" />
                    <rect class="rain-drop-svg rain-drop-3" x="58" y="64" width="2" height="6" rx="1" fill="${rainColor}" />
                </svg>
            `;
    }
}

// --- Textual Weather Translators ---
function getSkyStatusDesc(pty, sky) {
    const ptyVal = parseInt(pty) || 0;
    const skyVal = parseInt(sky) || 1;

    if (ptyVal > 0) {
        switch(ptyVal) {
            case 1: return '비';
            case 2: return '비/눈';
            case 3: return '눈';
            case 4: return '소나기';
            case 5: return '빗방울';
            case 6: return '빗방울 눈날림';
            case 7: return '눈날림';
            default: return '강수 있음';
        }
    } else {
        switch(skyVal) {
            case 1: return '맑음';
            case 3: return '구름많음';
            case 4: return '흐림';
            default: return '맑음';
        }
    }
}

function getWindDirectionDesc(vec) {
    const angle = parseFloat(vec);
    if (isNaN(angle)) return '북풍';
    // Divide 360 into 16 directions (22.5 degrees each)
    const index = Math.floor((angle + 11.25) / 22.5) % 16;
    const directions = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동', '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'];
    return directions[index] + '풍';
}

// --- High-Fidelity Simulation Weather Engine ---
function generateSimulatedData(nx, ny, simWeather) {
    const now = new Date();
    const isNight = now.getHours() < 6 || now.getHours() > 19;
    
    // 1. Determine local temperature variation cycle (sine wave peaking at 15:00)
    const baseTemps = { clear: 22, cloudy: 17, rainy: 14, snowy: 1, night: 11 };
    const tempAmp = 5; // daily temperature swing
    const hrRad = (now.getHours() - 6) * (Math.PI / 12);
    const dayTempFactor = Math.sin(hrRad - (Math.PI / 2)) * tempAmp;
    
    // Add minor variation based on Grid coords (higher latitude, slightly colder)
    const latFactor = (127 - ny) * 0.15;
    
    let currentTemp = (baseTemps[simWeather] || 15) + dayTempFactor + latFactor;
    currentTemp = parseFloat(currentTemp.toFixed(1));

    // 2. Set metrics based on simulated weather state
    let humidity, precipitation, windSpeed, windDirection, sky, pty, desc;
    
    windSpeed = parseFloat((2.0 + Math.random() * 4.5).toFixed(1));
    windDirection = Math.floor(Math.random() * 360);

    switch(simWeather) {
        case 'clear':
            sky = 1; pty = 0;
            humidity = Math.floor(40 + Math.random() * 15);
            precipitation = '0';
            desc = '맑음';
            break;
        case 'cloudy':
            sky = 3 + Math.floor(Math.random() * 2); // 3 or 4
            pty = 0;
            humidity = Math.floor(65 + Math.random() * 15);
            precipitation = '0';
            desc = sky === 4 ? '흐림' : '구름많음';
            break;
        case 'rainy':
            sky = 4; pty = 1;
            humidity = Math.floor(88 + Math.random() * 10);
            precipitation = (0.5 + Math.random() * 4.5).toFixed(1);
            desc = '비';
            break;
        case 'snowy':
            sky = 4; pty = 3;
            humidity = Math.floor(80 + Math.random() * 15);
            precipitation = (0.2 + Math.random() * 1.5).toFixed(1);
            desc = '눈';
            break;
        case 'night':
            sky = 1; pty = 0;
            humidity = Math.floor(55 + Math.random() * 15);
            precipitation = '0';
            desc = '맑음 (밤)';
            break;
        default:
            sky = 1; pty = 0; humidity = 50; precipitation = '0'; desc = '맑음';
    }

    // 3. Generate 6-Hour Hourly Forecast
    const forecastList = [];
    for (let i = 1; i <= 6; i++) {
        const fcstHour = (now.getHours() + i) % 24;
        const fcstTimeStr = String(fcstHour).padStart(2, '0') + '00';
        
        // Temperature progression
        const fRad = (fcstHour - 6) * (Math.PI / 12);
        let fTemp = (baseTemps[simWeather] || 15) + (Math.sin(fRad - (Math.PI / 2)) * tempAmp) + latFactor;
        
        // Add smooth random noise
        fTemp += (Math.random() - 0.5) * 1.5;
        fTemp = parseFloat(fTemp.toFixed(1));

        // Minor variation in sky/pty over forecast hours
        let fSky = sky;
        let fPty = pty;
        
        // Sometimes clouds gather or clear up
        if (simWeather === 'clear' && i > 3 && Math.random() > 0.6) fSky = 3;
        if (simWeather === 'cloudy' && i > 4 && Math.random() > 0.7) { fSky = 1; }

        let rainProb = 0;
        if (fPty > 0) rainProb = Math.floor(70 + Math.random() * 30);
        else if (fSky === 4) rainProb = Math.floor(30 + Math.random() * 30);
        else if (fSky === 3) rainProb = Math.floor(10 + Math.random() * 20);

        forecastList.push({
            time: fcstTimeStr,
            temp: fTemp,
            sky: fSky,
            pty: fPty,
            rainProb: rainProb
        });
    }

    const padZero = (n) => String(n).padStart(2, '0');
    const updateTimeStr = `${padZero(now.getHours())}:${padZero(now.getMinutes())} (시뮬레이션)`;

    return {
        current: {
            temp: currentTemp,
            humidity: humidity,
            rain: precipitation,
            windSpeed: windSpeed,
            windDir: windDirection,
            sky: sky,
            pty: pty,
            desc: desc,
            isNight: isNight || simWeather === 'night',
            updateTime: updateTimeStr
        },
        forecast: forecastList
    };
}

// --- Date/Time Parsing Logic for KMA API ---
function getKMABaseDateTime(apiType) {
    const now = new Date();
    let baseDate, baseTime;
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    let hours = now.getHours();
    let minutes = now.getMinutes();

    baseDate = `${year}${month}${day}`;

    if (apiType === 'ncst') {
        // getUltraSrtNcst: Updated hourly at minute 40.
        // If current minute < 40, base time is previous hour.
        if (minutes < 40) {
            hours -= 1;
        }
        if (hours < 0) {
            // Roll back to previous day
            const prevDay = new Date(now);
            prevDay.setDate(now.getDate() - 1);
            const pYear = prevDay.getFullYear();
            const pMonth = String(prevDay.getMonth() + 1).padStart(2, '0');
            const pDay = String(prevDay.getDate()).padStart(2, '0');
            baseDate = `${pYear}${pMonth}${pDay}`;
            hours = 23;
        }
        baseTime = String(hours).padStart(2, '0') + '00';
    } else {
        // getUltraSrtFcst: Updated hourly at minute 45. Base times are strict HH30.
        // If current minute < 45, base time is previous hour's 30m.
        if (minutes < 45) {
            hours -= 1;
        }
        if (hours < 0) {
            const prevDay = new Date(now);
            prevDay.setDate(now.getDate() - 1);
            const pYear = prevDay.getFullYear();
            const pMonth = String(prevDay.getMonth() + 1).padStart(2, '0');
            const pDay = String(prevDay.getDate()).padStart(2, '0');
            baseDate = `${pYear}${pMonth}${pDay}`;
            hours = 23;
        }
        baseTime = String(hours).padStart(2, '0') + '30';
    }

    return { baseDate, baseTime };
}

// --- KMA API Data Fetcher ---
async function fetchFromKMA(endpointName, params) {
    // Manually construct query params to prevent double-encoding of Service Key
    let queryString = `?serviceKey=${ENCODED_SERVICE_KEY}`;
    for (const key in params) {
        queryString += `&${key}=${encodeURIComponent(params[key])}`;
    }

    const url = `${BASE_URL}/${endpointName}${queryString}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if KMA returns application-level error
    const header = data?.response?.header;
    if (header && header.resultCode !== '00') {
        throw new Error(`KMA API Error: [${header.resultCode}] ${header.resultMsg}`);
    }

    return data?.response?.body?.items?.item || [];
}

// Fetch both observation and forecast data, with previous hour retry logic
async function loadKMAData(nx, ny, hourOffset = 0) {
    // 1. Get Base times adjusting for offset in case of retries
    const ncstTimeData = getKMABaseDateTime('ncst');
    const fcstTimeData = getKMABaseDateTime('fcst');
    
    // Apply hour offset if previous attempt returned empty or failed
    if (hourOffset > 0) {
        const adjustOffset = (dateStr, timeStr, offset) => {
            const y = parseInt(dateStr.slice(0, 4));
            const m = parseInt(dateStr.slice(4, 6)) - 1;
            const d = parseInt(dateStr.slice(6, 8));
            const hr = parseInt(timeStr.slice(0, 2));
            const min = parseInt(timeStr.slice(2, 4));
            
            const tempDate = new Date(y, m, d, hr - offset, min);
            const rYear = tempDate.getFullYear();
            const rMonth = String(tempDate.getMonth() + 1).padStart(2, '0');
            const rDay = String(tempDate.getDate()).padStart(2, '0');
            const rHour = String(tempDate.getHours()).padStart(2, '0');
            const rMin = String(tempDate.getMinutes()).padStart(2, '0');
            
            return { date: `${rYear}${rMonth}${rDay}`, time: `${rHour}${rMin}` };
        };
        
        const adjNcst = adjustOffset(ncstTimeData.baseDate, ncstTimeData.baseTime, hourOffset);
        ncstTimeData.baseDate = adjNcst.date;
        ncstTimeData.baseTime = adjNcst.time;

        const adjFcst = adjustOffset(fcstTimeData.baseDate, fcstTimeData.baseTime, hourOffset);
        fcstTimeData.baseDate = adjFcst.date;
        fcstTimeData.baseTime = adjFcst.time;
    }

    // 2. Fetch Live Observation (초단기실황)
    const ncstItems = await fetchFromKMA('getUltraSrtNcst', {
        numOfRows: 20,
        pageNo: 1,
        dataType: 'JSON',
        base_date: ncstTimeData.baseDate,
        base_time: ncstTimeData.baseTime,
        nx: nx,
        ny: ny
    });

    // 3. Fetch Forecast (초단기예보)
    const fcstItems = await fetchFromKMA('getUltraSrtFcst', {
        numOfRows: 60,
        pageNo: 1,
        dataType: 'JSON',
        base_date: fcstTimeData.baseDate,
        base_time: fcstTimeData.baseTime,
        nx: nx,
        ny: ny
    });

    if (ncstItems.length === 0 || fcstItems.length === 0) {
        throw new Error("KMA API returned empty results (NODATA)");
    }

    // 4. Process Observation Items
    const current = {};
    ncstItems.forEach(item => {
        const val = parseFloat(item.obsrValue);
        switch(item.category) {
            case 'T1H': current.temp = val; break;
            case 'REH': current.humidity = val; break;
            case 'RN1': current.rain = isNaN(val) || val <= 0 ? '0' : val; break;
            case 'WSD': current.windSpeed = val; break;
            case 'VEC': current.windDir = val; break;
        }
    });

    // 5. Process Forecast Items to extract sky status & precipitation status
    // Also build the hourly projection
    const sortedFcst = {};
    fcstItems.forEach(item => {
        const key = item.fcstDate + item.fcstTime;
        if (!sortedFcst[key]) {
            sortedFcst[key] = { time: item.fcstTime };
        }
        const val = parseFloat(item.fcstValue);
        switch(item.category) {
            case 'T1H': sortedFcst[key].temp = val; break;
            case 'SKY': sortedFcst[key].sky = val; break;
            case 'PTY': sortedFcst[key].pty = val; break;
            case 'RN1': sortedFcst[key].rain = val; break;
        }
    });

    const forecastList = Object.values(sortedFcst)
        .sort((a, b) => a.time.localeCompare(b.time))
        .slice(0, 6)
        .map(f => {
            // Estimate rain probability based on sky & pty
            let rainProb = 0;
            if (f.pty > 0) rainProb = 80;
            else if (f.sky === 4) rainProb = 45;
            else if (f.sky === 3) rainProb = 20;

            return {
                time: f.time,
                temp: f.temp,
                sky: f.sky,
                pty: f.pty,
                rainProb: rainProb
            };
        });

    // Extract current sky and precipitation types from the earliest forecast element
    const currentForecast = forecastList[0] || { sky: 1, pty: 0 };
    current.sky = currentForecast.sky;
    current.pty = currentForecast.pty;
    current.desc = getSkyStatusDesc(current.pty, current.sky);

    const now = new Date();
    current.isNight = now.getHours() < 6 || now.getHours() > 19;
    
    // Format announcement hour cleanly
    const formatedHour = ncstTimeData.baseTime.slice(0, 2);
    const formatedMin = ncstTimeData.baseTime.slice(2, 4);
    current.updateTime = `${formatedHour}:${formatedMin} 발표`;

    return { current, forecast: forecastList };
}

// --- Weather Visualizer & Render UI ---
function updateWeatherUI(data) {
    const cur = data.current;
    
    // 1. Digital Values
    el.currentTemp.textContent = cur.temp;
    el.weatherDesc.textContent = cur.desc;
    el.metricHumidity.textContent = `${cur.humidity} %`;
    
    const rainVal = parseFloat(cur.rain) || 0;
    el.metricRain.textContent = rainVal > 0 ? `${cur.rain} mm` : '0 mm';
    
    const windDirText = getWindDirectionDesc(cur.windDir);
    el.metricWind.textContent = `${cur.windSpeed} m/s (${windDirText})`;
    el.metricUpdateTime.textContent = cur.updateTime;
    
    // 2. Animated Wind Vane Rotate
    el.windIcon.style.transform = `rotate(${cur.windDir}deg)`;

    // 3. Main Dynamic Weather SVG
    const weatherSVG = generateWeatherSVG(cur.pty, cur.sky, cur.isNight);
    el.weatherIconContainer.innerHTML = weatherSVG;

    // 4. Update dynamic background classes & physical sky effects
    let themeClass = 'clear';
    if (cur.pty > 0) {
        themeClass = (cur.pty === 3 || cur.pty === 7) ? 'snowy' : 'rainy';
    } else {
        if (cur.sky === 4) themeClass = 'cloudy';
        else if (cur.sky === 3) themeClass = 'cloudy'; // will render subtle clouds
        else if (cur.isNight) themeClass = 'night';
    }
    
    // Set simulator buttons to match if in simulator mode
    if (appState.isSimulatorMode) {
        document.querySelectorAll('.sim-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.weather === appState.selectedSimWeather);
        });
        themeClass = appState.selectedSimWeather;
    }

    renderWeatherParticles(themeClass);

    // 5. Render 6-Hour Forecast Carousel
    el.forecastScrollContainer.innerHTML = '';
    
    data.forecast.forEach(item => {
        const fcstItem = document.createElement('div');
        fcstItem.className = 'forecast-item';
        
        // format time HH:00
        const fTime = item.time.slice(0, 2) + ':00';
        
        // forecast weather svg
        const fSVG = generateWeatherSVG(item.pty, item.sky, parseInt(item.time.slice(0, 2)) < 6 || parseInt(item.time.slice(0, 2)) > 19);
        
        fcstItem.innerHTML = `
            <span class="forecast-time">${fTime}</span>
            <div class="forecast-icon" style="width: 42px; height: 42px;">
                ${fSVG}
            </div>
            <span class="forecast-temp">${item.temp}°C</span>
            <span class="forecast-rain-prob"><i class="fa-solid fa-umbrella"></i> ${item.rainProb}%</span>
        `;
        el.forecastScrollContainer.appendChild(fcstItem);
    });
}

// --- Main Weather Controller ---
async function handleWeatherRefresh() {
    el.refreshIcon.classList.add('spin-animation');
    
    // 1. Coordinates validation
    const nx = parseInt(el.inputX.value);
    const ny = parseInt(el.inputY.value);
    
    if (isNaN(nx) || nx < 1 || nx > 149 || isNaN(ny) || ny < 1 || ny > 253) {
        showToast("유효한 기상청 격자 좌표를 입력하세요 (X: 1~149, Y: 1~253)");
        el.refreshIcon.classList.remove('spin-animation');
        return;
    }

    appState.currentX = nx;
    appState.currentY = ny;

    // Render title/badges
    el.currentCoordBadge.textContent = `격자 X: ${nx}, Y: ${ny}`;
    el.currentLocationName.textContent = appState.currentLocationLabel;

    // 2. Load weather data (API vs Simulation)
    if (appState.isSimulatorMode) {
        // Simulated Weather Mode
        setAPIStatus('orange', '시뮬레이션 모드');
        const simulatedData = generateSimulatedData(nx, ny, appState.selectedSimWeather);
        
        setTimeout(() => {
            updateWeatherUI(simulatedData);
            el.refreshIcon.classList.remove('spin-animation');
            saveSearchToHistory(appState.currentLocationLabel, nx, ny);
        }, 600);
    } else {
        // Real API Mode
        setAPIStatus('green', 'API 연결 중...');
        let success = false;
        
        // Robust retry loop (attempts current hour, then -1 hour, then -2 hours in case of KMA database lag)
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const data = await loadKMAData(nx, ny, attempt);
                updateWeatherUI(data);
                setAPIStatus('green', '실시간 데이터 연결');
                success = true;
                saveSearchToHistory(appState.currentLocationLabel, nx, ny);
                break;
            } catch (err) {
                console.warn(`Attempt ${attempt + 1} failed: ${err.message}`);
            }
        }

        if (!success) {
            showToast("실시간 기상청 API 연결이 지연되어 시뮬레이션 날씨 모드로 자동 전환되었습니다.");
            setAPIStatus('orange', '시뮬레이션 전환');
            
            // Switch to simulation
            const simulatedData = generateSimulatedData(nx, ny, 'clear');
            updateWeatherUI(simulatedData);
            saveSearchToHistory(appState.currentLocationLabel, nx, ny);
        }
        
        el.refreshIcon.classList.remove('spin-animation');
    }
}

// --- Geolocation (Browser GPS to Grid Conversion) ---
function handleMyLocationQuery() {
    if (!navigator.geolocation) {
        showToast("이 브라우저에서는 위치 서비스를 지원하지 않습니다.");
        return;
    }

    setAPIStatus('green', 'GPS 위치 측정 중...');
    
    navigator.geolocation.getCurrentPosition(
        position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Convert Lat/Lon to KMA Grid (NX, NY)
            const gridCoords = dfs_xy_conv("toXY", lat, lng);
            
            el.inputX.value = gridCoords.x;
            el.inputY.value = gridCoords.y;
            
            appState.currentLocationLabel = `내 인근 지역 (GPS)`;
            showToast("GPS 좌표를 기상청 격자 좌표로 변환하였습니다.");
            
            handleWeatherRefresh();
        },
        error => {
            let errorMsg = "위치 서비스를 활성화할 수 없습니다.";
            if (error.code === error.PERMISSION_DENIED) {
                errorMsg = "위치 정보 획득 권한이 거부되었습니다.";
            }
            showToast(errorMsg + " 기본 좌표(서울)로 조회합니다.");
            
            // Revert to 서울
            el.inputX.value = 61;
            el.inputY.value = 127;
            appState.currentLocationLabel = '서울특별시 종로구';
            handleWeatherRefresh();
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

// --- Presets Badges Manager ---
function initPresetBadges() {
    el.presetBadgesContainer.innerHTML = '';
    PRESET_CITIES.forEach(city => {
        const badge = document.createElement('span');
        badge.className = 'preset-badge';
        if (appState.currentX === city.x && appState.currentY === city.y) {
            badge.classList.add('active');
        }
        badge.textContent = city.name;
        badge.addEventListener('click', () => {
            document.querySelectorAll('.preset-badge').forEach(b => b.classList.remove('active'));
            badge.classList.add('active');
            
            el.inputX.value = city.x;
            el.inputY.value = city.y;
            appState.currentLocationLabel = city.fullName;
            
            handleWeatherRefresh();
        });
        el.presetBadgesContainer.appendChild(badge);
    });
}

// --- Search History Manager (localStorage) ---
function loadSearchHistory() {
    try {
        const saved = localStorage.getItem('aura_weather_history');
        if (saved) {
            appState.searchHistory = JSON.parse(saved);
            renderHistoryList();
        }
    } catch (e) {
        console.error(e);
    }
}

function saveSearchToHistory(label, x, y) {
    const newItem = { label, x, y, time: new Date().getTime() };
    
    // Filter duplicates
    appState.searchHistory = appState.searchHistory.filter(h => !(h.x === x && h.y === y));
    
    // Unshift & Slice max 5
    appState.searchHistory.unshift(newItem);
    appState.searchHistory = appState.searchHistory.slice(0, 5);

    try {
        localStorage.setItem('aura_weather_history', JSON.stringify(appState.searchHistory));
        renderHistoryList();
    } catch(e) {
        console.error(e);
    }
}

function renderHistoryList() {
    el.historyList.innerHTML = '';
    
    if (appState.searchHistory.length === 0) {
        el.historyList.innerHTML = '<div class="empty-history">최근 조회 이력이 없습니다.</div>';
        return;
    }

    appState.searchHistory.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        div.innerHTML = `
            <div class="history-details" style="flex: 1;">
                <div class="history-name">${item.label}</div>
                <div class="history-coord">X: ${item.x}, Y: ${item.y}</div>
            </div>
            <button class="btn-delete-history" data-index="${index}" title="삭제">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;

        // Click list item to recall query
        div.querySelector('.history-details').addEventListener('click', () => {
            el.inputX.value = item.x;
            el.inputY.value = item.y;
            appState.currentLocationLabel = item.label;
            
            // Sync presets badge visual status
            document.querySelectorAll('.preset-badge').forEach(b => {
                b.classList.toggle('active', b.textContent === item.label.split(' ')[0]);
            });

            handleWeatherRefresh();
        });

        // Click delete button
        div.querySelector('.btn-delete-history').addEventListener('click', (e) => {
            e.stopPropagation();
            appState.searchHistory.splice(index, 1);
            localStorage.setItem('aura_weather_history', JSON.stringify(appState.searchHistory));
            renderHistoryList();
        });

        el.historyList.appendChild(div);
    });
}

// --- Helpers & Utilities ---
function setAPIStatus(color, text) {
    const dot = el.apiStatusBadge.querySelector('.status-dot');
    dot.className = `status-dot ${color}`;
    el.apiStatusText.textContent = text;
}

let toastTimeout;
function showToast(message) {
    clearTimeout(toastTimeout);
    el.toastMessage.textContent = message;
    el.toastNotification.classList.add('show');
    toastTimeout = setTimeout(() => {
        el.toastNotification.classList.remove('show');
    }, 4500);
}

// --- Initialization Event Listeners ---
function initApp() {
    startClock();
    loadSearchHistory();
    initPresetBadges();

    // Refresh Event
    el.btnRefresh.addEventListener('click', handleWeatherRefresh);

    // Coordinates Search Event
    el.btnSearchCoords.addEventListener('click', () => {
        const x = parseInt(el.inputX.value);
        const y = parseInt(el.inputY.value);
        
        // Find matching preset city if possible to give it a neat name, else default
        const matchedCity = PRESET_CITIES.find(c => c.x === x && c.y === y);
        appState.currentLocationLabel = matchedCity ? matchedCity.fullName : `격자 인근 지역`;
        
        initPresetBadges();
        handleWeatherRefresh();
    });

    // GPS Geolocation trigger
    el.btnMyLocation.addEventListener('click', handleMyLocationQuery);

    // Simulator Toggle Controller
    el.toggleSimulator.addEventListener('change', (e) => {
        appState.isSimulatorMode = e.target.checked;
        el.simulatorGroup.classList.toggle('enabled', appState.isSimulatorMode);
        
        if (appState.isSimulatorMode) {
            showToast("비주얼 시뮬레이터가 켜졌습니다. 아래 날씨 탭을 탭해 보세요!");
        } else {
            showToast("실시간 기상청 API 모드로 전환되었습니다.");
        }
        handleWeatherRefresh();
    });

    // Simulator Weather State Select Buttons
    document.querySelectorAll('.sim-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!appState.isSimulatorMode) return;
            
            document.querySelectorAll('.sim-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            appState.selectedSimWeather = btn.dataset.weather;
            handleWeatherRefresh();
        });
    });

    // Default Load on X=61, Y=127
    appState.currentLocationLabel = '서울특별시 종로구';
    handleWeatherRefresh();
}

// Kickstart the app when DOM loads
window.addEventListener('DOMContentLoaded', initApp);
