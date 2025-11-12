// 🎮 우주 슈팅 게임 
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 게임 상태
let gameStarted = false;
let currentLanguage = 'ko';

// 프레임 시간 관리 (프레임레이트 독립적 이동)
let lastFrameTime = Date.now();
let deltaTime = 0;

// 언어별 텍스트
const translations = {
  ko: {
    instructions: [
      "▶ 방향키로 이동하세요!",
      "▶ 스페이스 바로 총알을 발사하여 적들을 처치하세요!",
      "▶ 적들은 확률적으로 ★공격속도를 올릴 수 있는 아이템과\n   ♥체력 회복 아이템을 드랍합니다!"
    ]
  },
  en: {
    instructions: [
      "▶ Use arrow keys to move!",
      "▶ Press SPACE BAR to shoot and destroy enemies!",
      "▶ Enemies randomly drop ★Attack Speed items and\n   ♥Health Recovery items!"
    ]
  }
};

// 시작 화면 제어
document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('startButton');
  const startScreen = document.getElementById('startScreen');
  const languageSelect = document.getElementById('languageSelect');

  // 언어 변경
  languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    updateInstructions();
  });

  // 게임 시작
  startButton.addEventListener('click', () => {
    startScreen.style.display = 'none';
    canvas.style.display = 'block';
    gameStarted = true;
    gameStartTime = Date.now();  // 게임 시작 시각 기록
    update();
  });
});

function updateInstructions() {
  const instructionList = document.querySelector('.instruction-list');
  const texts = translations[currentLanguage].instructions;
  
  instructionList.innerHTML = texts.map(text => {
    let formatted = text
      .replace(/방향키|arrow keys/gi, '<span class="key-hint">$&</span>')
      .replace(/스페이스 바|SPACE BAR/gi, '<span class="key-hint">$&</span>')
      .replace(/★공격속도|★Attack Speed/gi, '<span class="item-star">$&</span>')
      .replace(/♥체력 회복|♥Health Recovery/gi, '<span class="item-health">$&</span>');
    return `<p>${formatted}</p>`;
  }).join('');
}

// ▶ 전투기 이미지 로드
const playerImage = new Image();
playerImage.src = "images/fighter.png"; // 플레이어 전투기 이미지

// ========================================
// 🎨 적 타입 시스템 (Canvas HD 그래픽)
// ========================================

const enemyTypes = {
  bee: {
    name: 'Bee',
    width: 30,
    height: 30,
    hitboxScale: 1.3,  // 히트박스 1.3배 확대
    health: 1,
    score: 50,
    speed: 2,
    color: '#FFD700',
    secondaryColor: '#FFA500',
    glowColor: '#FFD700',
    // 특성: 기본 적 (직선 하강, 단발 사격)
    attackType: 'single'
  },
  butterfly: {
    name: 'Butterfly',
    width: 35,
    height: 35,
    hitboxScale: 1.3,  // 히트박스 1.3배 확대
    health: 2,
    score: 100,
    speed: 1.5,
    color: '#4169E1',
    secondaryColor: '#87CEEB',
    glowColor: '#00BFFF',
    // 특성: 부채꼴 3연발
    attackType: 'spread',
    spreadCount: 3,
    spreadAngle: Math.PI / 6  // 30도 간격
  },
  moth: {
    name: 'Moth',
    width: 40,
    height: 40,
    hitboxScale: 1.3,  // 히트박스 1.3배 확대
    health: 2,
    score: 150,
    speed: 1.8,
    color: '#9370DB',
    secondaryColor: '#FF69B4',
    glowColor: '#FF00FF',
    // 특성: 처치 시 체력 회복 아이템 100% 드롭
    attackType: 'single',
    guaranteedDrop: 'health'
  },
  drone: {
    name: 'Drone',
    width: 25,
    height: 25,
    hitboxScale: 1.4,  // 히트박스 1.4배 확대
    health: 3,
    score: 80,
    speed: 2.5,
    color: '#C0C0C0',
    secondaryColor: '#808080',
    glowColor: '#FFFFFF',
    // 특성: 레이저 조준 (멈춤 → 2초 조준 → 1초 후 발사)
    attackType: 'laser',
    stopDistance: 450,  // 플레이어와 450px 거리에서 멈춤 (300 → 450으로 증가)
    laserChargeTime: 2000,  // 2초 조준
    laserFireDelay: 1000    // 1초 후 발사
  },
  commander: {
    name: 'Commander',
    width: 200,
    height: 200,
    health: 100,
    score: 500,
    speed: 1,
    color: '#FF4500',
    secondaryColor: '#FF6347',
    glowColor: '#FFD700',
    isBoss: true,
    // 특성: 원형 탄막 (360도 8발)
    attackType: 'circular',
    circularCount: 8
  },
  flagship: {
    name: 'Flagship',
    width: 200,
    height: 200,
    health: 300,
    score: 2000,
    speed: 0.5,
    color: '#8B0000',
    secondaryColor: '#DC143C',
    glowColor: '#FFD700',
    isBoss: true,
    isFinalBoss: true,
    // 특성: 유도 미사일 + 원형 탄막
    attackType: 'homing',
    circularCount: 12
  }
};

// 🎨 적 그리기 함수들 (우주선 테마)
function drawBeeEnemy(ctx, enemy) {
  const x = enemy.x + enemy.width / 2;
  const y = enemy.y + enemy.height / 2;
  const size = enemy.width / 2;
  
  ctx.save();
  ctx.translate(x, y);
  
  // 발광 효과
  ctx.shadowColor = enemy.type.glowColor;
  ctx.shadowBlur = 10;
  
  // 날개 (삼각형 2개)
  ctx.fillStyle = enemy.type.secondaryColor;
  ctx.beginPath();
  ctx.moveTo(-size * 1.2, size * 0.5);
  ctx.lineTo(-size * 0.3, 0);
  ctx.lineTo(-size * 0.5, size * 0.7);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(size * 1.2, size * 0.5);
  ctx.lineTo(size * 0.3, 0);
  ctx.lineTo(size * 0.5, size * 0.7);
  ctx.fill();
  
  // 본체 (날렵한 전투기)
  const gradient = ctx.createLinearGradient(0, -size, 0, size);
  gradient.addColorStop(0, enemy.type.color);
  gradient.addColorStop(1, enemy.type.secondaryColor);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.5, size * 0.3);
  ctx.lineTo(0, size * 0.8);
  ctx.lineTo(-size * 0.5, size * 0.3);
  ctx.closePath();
  ctx.fill();
  
  // 엔진 (빛나는 점)
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(0, size * 0.6, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
  
  // 조종석
  ctx.fillStyle = '#00FFFF';
  ctx.beginPath();
  ctx.arc(0, -size * 0.3, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

function drawButterflyEnemy(ctx, enemy) {
  const x = enemy.x + enemy.width / 2;
  const y = enemy.y + enemy.height / 2;
  const size = enemy.width / 2;
  
  ctx.save();
  ctx.translate(x, y);
  
  // 발광 효과
  ctx.shadowColor = enemy.type.glowColor;
  ctx.shadowBlur = 15;
  
  // 큰 날개 (삼각형, Y-윙 스타일)
  ctx.fillStyle = enemy.type.secondaryColor;
  ctx.beginPath();
  ctx.moveTo(-size * 1.3, size * 0.8);
  ctx.lineTo(-size * 0.4, 0);
  ctx.lineTo(-size * 0.6, size * 1);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(size * 1.3, size * 0.8);
  ctx.lineTo(size * 0.4, 0);
  ctx.lineTo(size * 0.6, size * 1);
  ctx.fill();
  
  // 본체 (타원형 중형기)
  const gradient = ctx.createLinearGradient(0, -size, 0, size);
  gradient.addColorStop(0, '#FFFFFF');
  gradient.addColorStop(0.5, enemy.type.color);
  gradient.addColorStop(1, enemy.type.secondaryColor);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.5, size * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // 무기 포드 (좌우)
  ctx.fillStyle = enemy.type.color;
  ctx.fillRect(-size * 0.7, size * 0.2, size * 0.3, size * 0.5);
  ctx.fillRect(size * 0.4, size * 0.2, size * 0.3, size * 0.5);
  
  // 엔진 (2개)
  ctx.fillStyle = '#FFA500';
  ctx.beginPath();
  ctx.arc(-size * 0.55, size * 0.7, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(size * 0.55, size * 0.7, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

function drawMothEnemy(ctx, enemy) {
  const x = enemy.x + enemy.width / 2;
  const y = enemy.y + enemy.height / 2;
  const size = enemy.width / 2;
  
  ctx.save();
  ctx.translate(x, y);
  
  // 발광 효과
  ctx.shadowColor = enemy.type.glowColor;
  ctx.shadowBlur = 20;
  
  // 큰 델타 날개 (스텔스 폭격기 스타일)
  const wingGradient = ctx.createLinearGradient(-size, 0, size, 0);
  wingGradient.addColorStop(0, enemy.type.secondaryColor);
  wingGradient.addColorStop(0.5, enemy.type.color);
  wingGradient.addColorStop(1, enemy.type.secondaryColor);
  ctx.fillStyle = wingGradient;
  ctx.beginPath();
  ctx.moveTo(-size * 1.4, size * 0.7);
  ctx.lineTo(0, -size * 0.9);
  ctx.lineTo(size * 1.4, size * 0.7);
  ctx.lineTo(0, size * 0.9);
  ctx.closePath();
  ctx.fill();
  
  // 조종석 (빛나는 라인)
  ctx.strokeStyle = '#FF00FF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-size * 0.3, 0);
  ctx.lineTo(0, -size * 0.5);
  ctx.lineTo(size * 0.3, 0);
  ctx.stroke();
  
  // 엔진 (3개, 빛나는 삼각형 배열)
  ctx.fillStyle = '#FF69B4';
  [-size * 0.5, 0, size * 0.5].forEach(offsetX => {
    ctx.beginPath();
    ctx.arc(offsetX, size * 0.6, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // 센서 (중앙)
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

function drawDroneEnemy(ctx, enemy) {
  const x = enemy.x + enemy.width / 2;
  const y = enemy.y + enemy.height / 2;
  const size = enemy.width / 2;
  
  ctx.save();
  ctx.translate(x, y);
  
  // 차징 중일 때 강렬한 발광 효과 (tracking 또는 locked 상태)
  if (enemy.state === 'tracking' || enemy.state === 'locked') {
    const elapsed = Date.now() - enemy.laserChargeStart;
    const chargeProgress = Math.min(elapsed / enemy.type.laserChargeTime, 1);
    const chargePulse = Math.sin(elapsed / 100) * 0.3 + 0.7;
    
    // 차징 외곽 링 (점점 밝아짐)
    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = 20 * chargeProgress * chargePulse;
    ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + 0.7 * chargeProgress})`;
    ctx.lineWidth = 3 * chargeProgress;
    ctx.beginPath();
    ctx.arc(0, 0, size * (1.2 + 0.3 * chargeProgress), 0, Math.PI * 2);
    ctx.stroke();
    
    // 차징 경고선 (플레이어 방향)
    if (enemy.laserTarget) {
      // 드론 중앙 기준 (translate로 이미 중앙에 있음)
      const dx = enemy.laserTarget.x - (enemy.x + enemy.width / 2);
      const dy = enemy.laserTarget.y - (enemy.y + enemy.height / 2);
      const angle = Math.atan2(dy, dx);
      
      // locked 상태에서는 빨간색으로 변경
      const lineColor = enemy.state === 'locked' ? 
        `rgba(255, 0, 0, ${0.6 * chargePulse})` : 
        `rgba(255, 255, 0, ${0.4 * chargePulse})`;
      
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);  // 드론 중앙에서 시작
      ctx.lineTo(Math.cos(angle) * 500, Math.sin(angle) * 500);
      ctx.stroke();
      
      // 디버그: 타겟 좌표 표시
      // ctx.fillStyle = 'yellow';
      // ctx.font = '10px Arial';
      // ctx.fillText(`Target: ${Math.round(enemy.laserTarget.x)}, ${Math.round(enemy.laserTarget.y)}`, -30, -20);
    }
  }
  
  // 발광 효과
  ctx.shadowColor = enemy.type.glowColor;
  ctx.shadowBlur = 12;
  
  // 외곽 링 (회전하는 스캐너)
  ctx.strokeStyle = enemy.type.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.9, 0, Math.PI * 2);
  ctx.stroke();
  
  // 본체 (정육각형 드론)
  ctx.fillStyle = enemy.type.secondaryColor;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const px = Math.cos(angle) * size * 0.6;
    const py = Math.sin(angle) * size * 0.6;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  
  // 센서 아이 (4개, 모서리)
  ctx.fillStyle = '#00FFFF';
  const positions = [
    [-size * 0.5, -size * 0.5],
    [size * 0.5, -size * 0.5],
    [-size * 0.5, size * 0.5],
    [size * 0.5, size * 0.5]
  ];
  positions.forEach(([px, py]) => {
    ctx.beginPath();
    ctx.arc(px, py, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // 중앙 레이저 포트 (차징 중 빨갛게 깜빡임)
  if (enemy.state === 'tracking' || enemy.state === 'locked') {
    const elapsed = Date.now() - enemy.laserChargeStart;
    const chargePulse = Math.sin(elapsed / 80) * 0.4 + 0.6;
    ctx.fillStyle = `rgba(255, 0, 0, ${chargePulse})`;
  } else {
    ctx.fillStyle = '#FF0000';
  }
  ctx.fillRect(-size * 0.15, -size * 0.15, size * 0.3, size * 0.3);
  
  ctx.restore();
}

function drawCommanderBoss(ctx, enemy) {
  const x = enemy.x + enemy.width / 2;
  const y = enemy.y + enemy.height / 2;
  const size = enemy.width / 2;
  
  ctx.save();
  ctx.translate(x, y);
  
  // 강력한 발광 효과
  ctx.shadowColor = enemy.type.glowColor;
  ctx.shadowBlur = 30;
  
  // 후면 엔진 (6개, 팔각형 모서리)
  ctx.fillStyle = '#FF4500';
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const ex = Math.cos(angle) * size * 0.95;
    const ey = Math.sin(angle) * size * 0.95;
    ctx.beginPath();
    ctx.arc(ex, ey, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 외곽 아머 (팔각형)
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
  gradient.addColorStop(0, enemy.type.color);
  gradient.addColorStop(0.5, enemy.type.secondaryColor);
  gradient.addColorStop(1, '#8B0000');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i;
    const px = Math.cos(angle) * size;
    const py = Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  
  // 무기 포트 (4개)
  ctx.fillStyle = '#FFD700';
  const weaponPos = [
    [0, -size * 0.8],
    [0, size * 0.8],
    [-size * 0.8, 0],
    [size * 0.8, 0]
  ];
  weaponPos.forEach(([px, py]) => {
    ctx.beginPath();
    ctx.arc(px, py, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // 코어 (회전하는 느낌)
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

function drawFlagshipBoss(ctx, enemy) {
  const x = enemy.x + enemy.width / 2;
  const y = enemy.y + enemy.height / 2;
  const size = enemy.width / 2;
  
  ctx.save();
  ctx.translate(x, y);
  
  // 매우 강력한 발광 효과
  ctx.shadowColor = enemy.type.glowColor;
  ctx.shadowBlur = 40;
  
  // 외부 쉴드 (회전 애니메이션)
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, size * 1.15, 0, Math.PI * 2);
  ctx.stroke();
  
  // 후면 엔진 뱅크 (12개, 삼각 배열)
  ctx.fillStyle = '#FF8C00';
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI / 6) * i;
    const ex = Math.cos(angle) * size * 1.05;
    const ey = Math.sin(angle) * size * 1.05;
    ctx.beginPath();
    ctx.arc(ex, ey, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 본체 (복잡한 형태 - 육각 베이스)
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
  gradient.addColorStop(0, '#FFD700');
  gradient.addColorStop(0.3, enemy.type.color);
  gradient.addColorStop(0.7, enemy.type.secondaryColor);
  gradient.addColorStop(1, '#000');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.8, -size * 0.3);
  ctx.lineTo(size, size * 0.5);
  ctx.lineTo(0, size * 0.8);
  ctx.lineTo(-size, size * 0.5);
  ctx.lineTo(-size * 0.8, -size * 0.3);
  ctx.closePath();
  ctx.fill();
  
  // 장갑 라인 (6개 방향)
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const px = Math.cos(angle) * size * 0.5;
    const py = Math.sin(angle) * size * 0.5;
    const px2 = Math.cos(angle) * size * 0.9;
    const py2 = Math.sin(angle) * size * 0.9;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px2, py2);
    ctx.stroke();
  }
  
  // 메인 캐논 (중앙)
  ctx.fillStyle = '#FF0000';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // 사이드 캐논 (6개)
  ctx.fillStyle = '#FFD700';
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const px = Math.cos(angle) * size * 0.7;
    const py = Math.sin(angle) * size * 0.7;
    ctx.beginPath();
    ctx.arc(px, py, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 에너지 코어
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

// 적 그리기 메인 함수
function drawEnemy(enemy) {
  // 그림자 효과 초기화
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  
  // 보스 체력바 (항상 표시, 크고 명확하게)
  if (enemy.isBoss) {
    const barWidth = enemy.width;
    const barHeight = 15;  // 높이 증가
    const barX = enemy.x;
    const barY = enemy.y - 25;
    
    // 배경 (검은색)
    ctx.fillStyle = '#000';
    ctx.fillRect(barX - 3, barY - 3, barWidth + 6, barHeight + 6);
    
    // 체력바 배경 (빨간색)
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // 체력 (금색 → 빨간색 그라데이션)
    const healthPercentage = enemy.health / enemy.maxHealth;
    const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth * healthPercentage, 0);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(1, '#FF4500');
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
    
    // 보스 이름 표시
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(enemy.type.name.toUpperCase(), enemy.x + enemy.width / 2, barY - 5);
    ctx.textAlign = 'left';
  } 
  // 일반 적 체력바 (체력이 최대가 아닐 때만)
  else if (enemy.health < enemy.maxHealth) {
    const barWidth = enemy.width;
    const barHeight = 4;
    const barX = enemy.x;
    const barY = enemy.y - 8;
    
    // 배경 (빨간색)
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // 체력 (초록색)
    const healthPercentage = enemy.health / enemy.maxHealth;
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
  }
  
  // 적 타입에 따라 그리기
  switch(enemy.type.name) {
    case 'Bee':
      drawBeeEnemy(ctx, enemy);
      break;
    case 'Butterfly':
      drawButterflyEnemy(ctx, enemy);
      break;
    case 'Moth':
      drawMothEnemy(ctx, enemy);
      break;
    case 'Drone':
      drawDroneEnemy(ctx, enemy);
      break;
    case 'Commander':
      drawCommanderBoss(ctx, enemy);
      break;
    case 'Flagship':
      drawFlagshipBoss(ctx, enemy);
      break;
  }
  
  // 그림자 효과 완전 초기화
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
} 

// ▶ 플레이어 설정 
const player = {
  x: 280,  // 캔버스 크기 증가에 맞춰 중앙 조정 (600 / 2 - 20)
  y: 750,  // 캔버스 크기 증가에 맞춰 하단 조정 (800 - 50)
  width: 40,
  height: 40,
  speed: 5,
  health: 3,
  invincible: false,        // 무적 상태 여부
  invincibleUntil: 0,       // 무적 종료 시각
  blinkVisible: true        // 깜빡임 표시용
};

// ▶ 상태 변수
let bullets = [];
let enemies = [];
let enemyBullets = [];  // 1️⃣ 적 총알
let items = [];    // 3️⃣ 아이템
let effects = [];  // 2️⃣ 폭발 이펙트
let score = 0;
let gameOver = false;
let isPaused = false;  // 일시정지 상태
let keys = {};
// shooting control
let lastShotTime = 0;
let shotCooldown = 500;  // let으로 변경 (동적으로 감소 가능)
const minShotCooldown = 50;  // 최소 발사 주기 (0.05초)
let attackLevel = 1;  // 공격 속도 레벨 (1~10, 1부터 시작)
let bulletCount = 1;  // 동시 발사 총알 수 (1~5)
let bulletDamage = 1; // 총알 데미지

// 통계 관련 변수
let enemiesKilled = 0;  // 처치한 적 수
let gameStartTime = 0;  // 게임 시작 시각
let maxAttackLevelTime = 0;  // 최고 공속 유지 시간 (초)
let maxAttackLevelStartTime = 0;  // 최고 공속 도달 시각

// 무적 관련 변수
const invincibleDuration = 1500;  // 1.5초 무적
const blinkInterval = 100;        // 0.1초마다 깜빡임
let lastBlinkTime = 0; // milliseconds (0.5s)

// 난이도 증가 관련 변수
let gameTime = 0;  // 게임 경과 시간 (초)
let lastEnemySpawn = 0;  // 마지막 적 생성 시간
let lastEnemyShot = 0;   // 마지막 적 총알 발사 시간

// 보스 관련 변수
let lastBossSpawnTime = 0;  // 마지막 보스 생성 시간
let bossActive = false;     // 보스가 활성 상태인지
let nextBossType = 'commander';  // 다음 보스 타입 ('commander' -> 'flagship' 교대)
let bossWarningActive = false;  // 보스 경고 표시 중인지
let bossWarningStart = 0;       // 보스 경고 시작 시각
let bossHealthMultiplier = 1;   // 보스 체력 배율 (처치할 때마다 2배)
let bossKillCount = 0;          // 보스 처치 횟수

// 알림 메시지 관련
let notifications = [];  // {text, x, y, alpha, createdAt}

// 난이도 곡선 함수
function getEnemySpawnInterval() {
  // 초기 2000ms에서 시작, 시간이 지날수록 감소 (최소 600ms) - 기존의 2배로 느리게
  const baseInterval = 2000;
  const minInterval = 600;
  const reduction = Math.min(1400, gameTime * 8);  // 초당 8ms씩 감소
  return Math.max(minInterval, baseInterval - reduction);
}

function getEnemyShootInterval() {
  // 초기 1500ms에서 시작, 시간이 지날수록 감소 (최소 500ms)
  const baseInterval = 1500;
  const minInterval = 500;
  const reduction = Math.min(1000, gameTime * 10);  // 초당 10ms씩 감소
  return Math.max(minInterval, baseInterval - reduction);
}

function getEnemySpawnCount() {
  // 초기 1개, 시간이 지날수록 증가 (최대 3개)
  if (gameTime < 30) return 1;
  if (gameTime < 60) return Math.random() < 0.3 ? 2 : 1;  // 30% 확률로 2개
  if (gameTime < 90) return Math.random() < 0.5 ? 2 : 1;  // 50% 확률로 2개
  return Math.random() < 0.7 ? 2 : (Math.random() < 0.3 ? 3 : 1);  // 2개 70%, 3개 21%, 1개 9%
}

// 보스 생성 함수
function spawnBoss(bossType) {
  const boss = enemyTypes[bossType];
  const x = (canvas.width - boss.width) / 2;  // 화면 중앙
  
  // 보스 체력에 배율 적용
  const scaledHealth = Math.floor(boss.health * bossHealthMultiplier);
  
  enemies.push({
    x: x,
    y: -boss.height,  // 화면 위에서 등장
    width: boss.width,
    height: boss.height,
    speed: boss.speed,
    health: scaledHealth,
    maxHealth: scaledHealth,
    type: boss,
    score: boss.score,
    isBoss: true,
    targetY: 100,  // 목표 Y 위치 (화면 상단에 정착)
    arrived: false,  // 목표 지점 도착 여부
    moveDirection: 1,  // 좌우 이동 방향
    state: 'entering',  // entering, hovering, moving
    lastShot: 0,
    laserTarget: null,
    laserChargeStart: 0,
    stopped: false,
    // 보스 패턴 관련
    currentPattern: 0,  // 현재 패턴 (0: 원형, 1: 나선, 2: 확산, 3: 전방집중, 4: 거대레이저, 5: 드론소환)
    patternTimer: 0,    // 패턴 전환 타이머
    patternDuration: 3000,  // 3초마다 패턴 전환
    lastPatternChange: Date.now(),
    // 거대 레이저 관련
    isChargingLaser: false,
    laserWarningX: null
  });
}

// 공격 레벨에 따라 쿨다운 설정 (1~10레벨)
function updateShotCooldownByLevel() {
  // 레벨 1 = 500ms, 레벨 2 = 455ms, ..., 레벨 10 = 95ms
  shotCooldown = Math.max(minShotCooldown, 500 - ((attackLevel - 1) * 45));
}

// 피격 시 공격 레벨 절반으로 감소
function reduceAttackLevel() {
  if (attackLevel <= 1) return;  // 레벨 0, 1은 변동 없음
  
  // 특정 홀수 레벨 처리
  if (attackLevel === 3) attackLevel = 1;
  else if (attackLevel === 5) attackLevel = 2;
  else if (attackLevel === 7) attackLevel = 3;
  else if (attackLevel === 9) attackLevel = 4;
  else attackLevel = Math.floor(attackLevel / 2);
  
  updateShotCooldownByLevel();
}

// ▶ 별 배경 (움직이는 우주 느낌)
const stars = Array.from({ length: 100 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  size: Math.random() * 1.5 + 0.3,  // 0.3 ~ 1.8 크기 (더 작게)
  speed: Math.random() * 3 + 1     // 1 ~ 4 속도 (더 빠르게)
}));

// ▶ 키 입력 처리
document.addEventListener("keydown", e => {
  keys[e.key] = true;
  
  // ESC 키로 일시정지/재개
  if (e.key === "Escape" && gameStarted && !gameOver) {
    isPaused = !isPaused;
  }
});
document.addEventListener("keyup", e => keys[e.key] = false);

// ▶ 플레이어 총알 발사
function shoot() {
  // 총알 개수에 따라 발사 위치 계산
  const spacing = 10;  // 총알 간격
  const totalWidth = (bulletCount - 1) * spacing;
  const startX = player.x + player.width / 2 - totalWidth / 2;
  
  for (let i = 0; i < bulletCount; i++) {
    bullets.push({
      x: startX + i * spacing - 2,
      y: player.y,
      width: 4,
      height: 10,
      speed: 7,
      damage: bulletDamage
    });
  }
}

// ▶ 적 생성 (여러 개 생성 가능)
function spawnEnemy() {
  const count = getEnemySpawnCount();
  for (let i = 0; i < count; i++) {
    const x = Math.random() * (canvas.width - 50);
    
    // 적 타입 선택 (확률 기반)
    let selectedType;
    const rand = Math.random() * 100;
    
    if (rand < 50) {
      selectedType = enemyTypes.bee;       // 50% - Bee
    } else if (rand < 75) {
      selectedType = enemyTypes.butterfly; // 25% - Butterfly
    } else if (rand < 90) {
      selectedType = enemyTypes.moth;      // 15% - Moth
    } else {
      selectedType = enemyTypes.drone;     // 10% - Drone
    }
    
    const enemy = { 
      x: x, 
      y: 0, 
      width: selectedType.width, 
      height: selectedType.height, 
      speed: selectedType.speed,
      health: selectedType.health,
      maxHealth: selectedType.health,
      type: selectedType,
      score: selectedType.score,
      hitboxScale: selectedType.hitboxScale || 1.0,  // 히트박스 스케일 적용
      // 특수 능력 상태
      state: 'moving',  // moving, charging, firing
      lastShot: 0,
      laserTarget: null,  // 레이저 목표 위치
      laserChargeStart: 0,
      stopped: false
    };
    
    enemies.push(enemy);
  }
}


// ▶ 적 총알 발사
function enemyShoot() {
  if (enemies.length === 0) return;
  const shooter = enemies[Math.floor(Math.random() * enemies.length)];
  
  // 플레이어 방향으로 발사하기 위한 각도 계산
  const dx = player.x + player.width / 2 - (shooter.x + shooter.width / 2);
  const dy = player.y + player.height / 2 - (shooter.y + shooter.height);
  
  // 플레이어가 적보다 앞(아래)에 있는지 확인
  if (dy <= 0) return;
  
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  
  // 보스의 경우 패턴 전환 체크
  if (shooter.isBoss) {
    const now = Date.now();
    if (now - shooter.lastPatternChange >= shooter.patternDuration) {
      shooter.currentPattern = (shooter.currentPattern + 1) % 6;  // 0~5 순환 (레이저 패턴 2개 추가)
      shooter.lastPatternChange = now;
    }
    
    // 보스 패턴별 공격
    switch(shooter.currentPattern) {
      case 0:
        fireCircularBullets(shooter);  // 원형 탄막
        break;
      case 1:
        fireSpiralPattern(shooter);  // 나선형
        break;
      case 2:
        fireWavePattern(shooter);  // 광역 확산
        break;
      case 3:
        fireConcentratedPattern(shooter);  // 전방 집중
        // 유도 미사일 제거 (플레이어 실시간 추적 방지)
        break;
      case 4:
        fireBossGiantLaser(shooter);  // 거대 레이저
        break;
      case 5:
        spawnBossDrones(shooter);  // 드론 소환
        break;
    }
    return;
  }
  
  // 일반 적 타입별 공격 패턴
  switch(shooter.type.attackType) {
    case 'single':
      // Bee, Moth: 단발 사격
      fireSingleBullet(shooter, angle);
      break;
      
    case 'spread':
      // Butterfly: 부채꼴 3연발
      fireSpreadBullets(shooter, angle);
      break;
      
    case 'circular':
      // Commander: 360도 원형 탄막
      fireCircularBullets(shooter);
      break;
      
    case 'homing':
      // Flagship: 유도 미사일 + 원형 탄막
      fireHomingMissile(shooter);
      if (Math.random() < 0.5) fireCircularBullets(shooter);
      break;
  }
}

// 단발 총알
function fireSingleBullet(shooter, angle) {
  const bulletSpeed = 4;
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  
  enemyBullets.push({
    x: shooter.x + shooter.width / 2 - 4,
    y: shooter.y + shooter.height,
    width: 8,
    height: 14,
    speedX: dirX * bulletSpeed,
    speedY: dirY * bulletSpeed,
    damage: 1,
    type: 'normal'
  });
}

// 부채꼴 3연발 (Butterfly)
function fireSpreadBullets(shooter, baseAngle) {
  const bulletSpeed = 4;
  const spreadAngle = shooter.type.spreadAngle;
  const count = shooter.type.spreadCount;
  
  for (let i = 0; i < count; i++) {
    const angle = baseAngle + (i - Math.floor(count / 2)) * spreadAngle;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    
    enemyBullets.push({
      x: shooter.x + shooter.width / 2 - 4,
      y: shooter.y + shooter.height,
      width: 8,
      height: 14,
      speedX: dirX * bulletSpeed,
      speedY: dirY * bulletSpeed,
      damage: 1,
      type: 'spread',
      color: '#00BFFF'  // 밝은 파란색 (Deep Sky Blue)
    });
  }
}

// 원형 탄막 (Commander, Flagship)
function fireCircularBullets(shooter) {
  const bulletSpeed = 3;
  const count = shooter.type.circularCount || 8;
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    
    enemyBullets.push({
      x: shooter.x + shooter.width / 2 - 5,
      y: shooter.y + shooter.height / 2 - 5,
      width: 10,
      height: 10,
      speedX: dirX * bulletSpeed,
      speedY: dirY * bulletSpeed,
      damage: 1,
      type: 'circular',
      color: '#FFD700'  // 금색
    });
  }
}

// 유도 미사일 (Flagship)
function fireHomingMissile(shooter) {
  enemyBullets.push({
    x: shooter.x + shooter.width / 2 - 5,
    y: shooter.y + shooter.height,
    width: 10,
    height: 15,
    speedX: 0,
    speedY: 2,
    damage: 1,
    type: 'homing',
    color: '#FF4500',  // 밝은 주황색
    homingSpeed: 3,
    turnRate: 0.05
  });
}


// 레이저 발사 (Drone)
function fireLaser(drone) {
  if (!drone.laserTarget) return;
  
  // 드론 중앙에서 레이저 발사 (경고선과 동일한 지점)
  const startX = drone.x + drone.width / 2;
  const startY = drone.y + drone.height / 2;
  
  // 고정된 타겟 위치 (locked 상태에서 저장된 좌표)
  const targetX = drone.laserTarget.x;
  const targetY = drone.laserTarget.y;
  
  // 경고선과 동일한 각도 계산
  const dx = targetX - startX;
  const dy = targetY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  
  // 디버그 출력
  console.log('=== 레이저 발사 ===');
  console.log('드론 위치:', startX, startY);
  console.log('타겟 위치:', targetX, targetY);
  console.log('각도(라디안):', angle, '각도(도):', angle * 180 / Math.PI);
  
  // 레이저 빔 길이는 충분히 길게 (화면 끝까지)
  const maxDistance = Math.max(distance, canvas.height);
  
  // 고정된 레이저 빔 생성 (위치 고정, 확장만)
  const laserWidth = 8;
  
  enemyBullets.push({
    x: startX,
    y: startY,
    width: laserWidth,
    height: 0,  // 처음엔 길이 0, 점점 확장
    maxHeight: maxDistance,  // 최대 길이 (화면 끝까지)
    speedX: 0,  // 레이저는 이동하지 않음
    speedY: 0,  // 레이저는 이동하지 않음
    damage: 1,
    type: 'laser',
    color: '#FF0000',
    targetX: targetX,
    targetY: targetY,
    angle: angle,  // 레이저 각도 저장
    alpha: 1,
    expandSpeed: 30,  // 확장 속도
    currentLength: 0,  // 현재 길이
    lifetime: 0,  // 생존 시간
    maxLifetime: 60  // 최대 생존 시간 (약 1초)
  });
}

// ▶ 보스 패턴 공격 함수들
// 패턴 1: 나선형 탄막
function fireSpiralPattern(shooter) {
  const bulletSpeed = 3;
  const count = 12;
  const rotationOffset = (Date.now() / 50) % (Math.PI * 2);  // 회전 효과
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + rotationOffset;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    
    enemyBullets.push({
      x: shooter.x + shooter.width / 2 - 5,
      y: shooter.y + shooter.height / 2 - 5,
      width: 10,
      height: 10,
      speedX: dirX * bulletSpeed,
      speedY: dirY * bulletSpeed,
      damage: 1,
      type: 'circular',
      color: '#FF1493'  // 핫핑크
    });
  }
}

// 패턴 2: 전방 집중 탄막 (플레이어 방향)
function fireConcentratedPattern(shooter) {
  const bulletSpeed = 5;
  const centerAngle = Math.atan2(player.y - shooter.y, player.x - shooter.x);
  
  // 5발을 좁은 각도로 발사
  for (let i = -2; i <= 2; i++) {
    const angle = centerAngle + (i * Math.PI / 24);  // ±15도 범위
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    
    enemyBullets.push({
      x: shooter.x + shooter.width / 2 - 5,
      y: shooter.y + shooter.height / 2 - 5,
      width: 10,
      height: 10,
      speedX: dirX * bulletSpeed,
      speedY: dirY * bulletSpeed,
      damage: 1,
      type: 'circular',
      color: '#FF4500'  // 주황색
    });
  }
}

// 패턴 3: 광역 확산 탄막
function fireWavePattern(shooter) {
  const bulletSpeed = 4;
  const count = 16;
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    
    enemyBullets.push({
      x: shooter.x + shooter.width / 2 - 5,
      y: shooter.y + shooter.height / 2 - 5,
      width: 12,
      height: 12,
      speedX: dirX * bulletSpeed,
      speedY: dirY * bulletSpeed,
      damage: 1,
      type: 'circular',
      color: '#00FF00'  // 초록색
    });
  }
}

// 패턴 4: 유도 미사일 연속 발사
function fireMultipleHoming(shooter, count = 3) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      enemyBullets.push({
        x: shooter.x + shooter.width / 2 - 5,
        y: shooter.y + shooter.height,
        width: 10,
        height: 15,
        speedX: 0,
        speedY: 2,
        damage: 1,
        type: 'homing',
        color: '#FF4500',
        homingSpeed: 3,
        turnRate: 0.05
      });
    }, i * 300);  // 0.3초 간격
  }
}

// ▶ 보스 레이저 패턴
// 패턴 5-A: 거대 레이저 (경고 구역 표시 → 발사)
function fireBossGiantLaser(shooter) {
  if (shooter.isChargingLaser) return;
  
  shooter.isChargingLaser = true;
  shooter.laserChargeStart = Date.now();
  shooter.laserWarningX = player.x + player.width / 2;  // 플레이어 위치 저장
  
  // 2초 후 레이저 발사
  setTimeout(() => {
    if (!shooter.dead && shooter.isChargingLaser) {
      const laserWidth = 80;  // 거대 레이저 폭
      const laserX = shooter.laserWarningX - laserWidth / 2;
      
      enemyBullets.push({
        x: laserX,
        y: shooter.y + shooter.height,
        width: laserWidth,
        height: 0,  // 초기 높이 0에서 시작
        currentLength: 0,  // 현재 길이
        maxHeight: canvas.height,  // 최대 높이
        expandSpeed: 50,  // 확장 속도
        speedX: 0,
        speedY: 0,  // 레이저는 위치 이동 안 함
        damage: 2,  // 더 강력한 데미지
        type: 'laser',
        color: '#FF0000',
        alpha: 1,
        isGiantLaser: true,
        lifetime: 0,  // 생존 시간
        maxLifetime: 60,  // 최대 생존 시간 (60프레임 = 약 1초)
        angle: Math.PI / 2  // 수직 (아래쪽)
      });
      
      shooter.isChargingLaser = false;
      shooter.laserWarningX = null;  // 경고 위치 초기화
    }
  }, 2000);
}

// 패턴 5-B: 드론 소환 (양쪽에 각 2기씩)
function spawnBossDrones(shooter) {
  const leftX1 = shooter.x - 60;
  const leftX2 = shooter.x - 120;
  const rightX1 = shooter.x + shooter.width + 60;
  const rightX2 = shooter.x + shooter.width + 120;
  const spawnY = shooter.y + shooter.height / 2;
  
  const droneType = enemyTypes.drone;
  const positions = [
    { x: leftX1, y: spawnY },
    { x: leftX2, y: spawnY },
    { x: rightX1, y: spawnY },
    { x: rightX2, y: spawnY }
  ];
  
  positions.forEach(pos => {
    // 화면 밖이면 스폰 안 함
    if (pos.x < 0 || pos.x > canvas.width - droneType.width) return;
    
    const drone = {
      x: pos.x,
      y: pos.y,
      width: droneType.width,
      height: droneType.height,
      speed: droneType.speed,
      health: droneType.health,
      maxHealth: droneType.health,
      type: droneType,
      score: droneType.score,
      hitboxScale: droneType.hitboxScale || 1.0,
      state: 'moving',
      lastShot: 0,
      laserTarget: null,
      laserChargeStart: 0,
      stopped: false,
      spawnedByBoss: true  // 보스가 소환한 드론 표시
    };
    
    enemies.push(drone);
  });
}

// ▶ 충돌 판정
function isColliding(a, b) {
  // a가 적(enemy)인 경우 히트박스 확대 적용
  let aRect = { ...a };
  if (a.hitboxScale) {
    const scale = a.hitboxScale;
    const scaledWidth = a.width * scale;
    const scaledHeight = a.height * scale;
    const offsetX = (scaledWidth - a.width) / 2;
    const offsetY = (scaledHeight - a.height) / 2;
    
    aRect = {
      x: a.x - offsetX,
      y: a.y - offsetY,
      width: scaledWidth,
      height: scaledHeight
    };
  }
  
  // b가 적(enemy)인 경우 히트박스 확대 적용
  let bRect = { ...b };
  if (b.hitboxScale) {
    const scale = b.hitboxScale;
    const scaledWidth = b.width * scale;
    const scaledHeight = b.height * scale;
    const offsetX = (scaledWidth - b.width) / 2;
    const offsetY = (scaledHeight - b.height) / 2;
    
    bRect = {
      x: b.x - offsetX,
      y: b.y - offsetY,
      width: scaledWidth,
      height: scaledHeight
    };
  }
  
  return aRect.x < bRect.x + bRect.width &&
         aRect.x + aRect.width > bRect.x &&
         aRect.y < bRect.y + bRect.height &&
         aRect.y + aRect.height > bRect.y;
}

// ▶ 원형 충돌 판정 (플레이어 히트박스용)
function isCollidingCircle(circle, rect) {
  // 적의 히트박스 확대 처리
  const scale = rect.hitboxScale || 1.0;
  const scaledWidth = rect.width * scale;
  const scaledHeight = rect.height * scale;
  const offsetX = (scaledWidth - rect.width) / 2;
  const offsetY = (scaledHeight - rect.height) / 2;
  
  const scaledRect = {
    x: rect.x - offsetX,
    y: rect.y - offsetY,
    width: scaledWidth,
    height: scaledHeight
  };
  
  // 원의 중심과 사각형의 가장 가까운 점 사이의 거리 계산
  const closestX = Math.max(scaledRect.x, Math.min(circle.x, scaledRect.x + scaledRect.width));
  const closestY = Math.max(scaledRect.y, Math.min(circle.y, scaledRect.y + scaledRect.height));
  
  const distanceX = circle.x - closestX;
  const distanceY = circle.y - closestY;
  const distanceSquared = distanceX * distanceX + distanceY * distanceY;
  
  return distanceSquared < (circle.radius * circle.radius);
}

// ▶ 플레이어 히트박스 정보
function getPlayerHitbox() {
  return {
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
    radius: 6
  };
}


// ▶ 폭발 이펙트 생성
function spawnEffect(x, y) {
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 1;
    effects.push({
      x,
      y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 3,
      life: 30,
      color: `hsl(${Math.random() * 360}, 100%, 60%)`
    });
  }
}



// ▶ 아이템 생성 (type: 'score' = 점수/공격력, 'health' = 체력 회복)
function spawnItem(x, y, type = 'score') {
  items.push({
    x,
    y,
    width: 24,
    height: 24,
    speed: 2,
    type: type  // 'score' 또는 'health'
  });
}


// ▶ 별 배경 업데이트 - deltaTime 적용
function updateStars() {
  for (let s of stars) {
    s.y += s.speed * deltaTime;
    if (s.y > canvas.height) {
      s.y = 0;
      s.x = Math.random() * canvas.width;
    }
  }
}


// ▶ 이펙트 업데이트 - deltaTime 적용
function updateEffects() {
  effects.forEach(e => {
    e.x += e.dx * deltaTime;
    e.y += e.dy * deltaTime;
    e.life -= deltaTime;
  });
  effects = effects.filter(e => e.life > 0);
}



// ▶ 아이템 업데이트 - deltaTime 적용
function updateItems() {
  items.forEach(item => {
    // 플레이어와의 거리 계산
    const dx = (player.x + player.width / 2) - (item.x + item.width / 2);
    const dy = (player.y + player.height / 2) - (item.y + item.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 흡수 범위 (100px 이내)
    const magnetRange = 100;
    
    if (distance < magnetRange && distance > 0) {
      // 플레이어 방향으로 이동 (자석 효과) - deltaTime 적용
      const magnetSpeed = 8;  // 흡수 속도
      const angle = Math.atan2(dy, dx);
      item.x += Math.cos(angle) * magnetSpeed * deltaTime;
      item.y += Math.sin(angle) * magnetSpeed * deltaTime;
    } else {
      // 일반 하강 - deltaTime 적용
      item.y += item.speed * deltaTime;
    }
    
    if (isColliding(item, player)) {
      item.collected = true;
      
      if (item.type === 'score') {
        // 노란색 별: 점수 +10, 공격 레벨 증가
        score += 10;
        if (attackLevel < 10) {
          attackLevel++;
          updateShotCooldownByLevel();
          
          // 최고 공속(레벨 10) 도달 시각 기록
          if (attackLevel === 10 && maxAttackLevelStartTime === 0) {
            maxAttackLevelStartTime = Date.now();
          }
          
          // LEVEL UP! 알림 표시
          showNotification('LEVEL UP!', player.x + player.width / 2, player.y - 20, '#FFD700');
        }
      } else if (item.type === 'health') {
        // 초록색 별: 체력 회복 (최대 3, 절대 초과 불가)
        player.health = Math.min(3, player.health + 1);
        
        // HEALTH UP! 알림 표시
        showNotification('HEALTH UP!', player.x + player.width / 2, player.y - 20, '#00FF00');
      } else if (item.type === 'power') {
        // 파란색 별: 파워업 (총알 수 증가 또는 데미지 증가)
        if (bulletCount < 5) {
          bulletCount++;
          showNotification('BULLET +1!', player.x + player.width / 2, player.y - 20, '#00BFFF');
        } else {
          bulletDamage++;
          showNotification('DAMAGE +1!', player.x + player.width / 2, player.y - 20, '#FF69B4');
        }
      }
    }
  });
  items = items.filter(i => i.y < canvas.height && !i.collected);
}

// ▶ 알림 메시지 표시 함수
function showNotification(text, x, y, color) {
  notifications.push({
    text: text,
    x: x,
    y: y,
    alpha: 1.0,
    color: color,
    createdAt: Date.now()
  });
}

// ▶ 알림 메시지 업데이트 - deltaTime 적용
function updateNotifications() {
  const now = Date.now();
  notifications.forEach(n => {
    n.y -= 1.5 * deltaTime;  // 위로 떠오름
    const elapsed = now - n.createdAt;
    if (elapsed > 1000) {
      n.alpha = Math.max(0, 1.0 - (elapsed - 1000) / 500);  // 1초 후 0.5초 동안 페이드아웃
    }
  });
  notifications = notifications.filter(n => n.alpha > 0);
}

// ▶ 알림 메시지 그리기
function drawNotifications() {
  notifications.forEach(n => {
    ctx.save();
    ctx.globalAlpha = n.alpha;
    
    // 아날로그 게임 스타일 텍스트
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 외곽선 (검은색, 두껍게)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(n.text, n.x, n.y);
    
    // 내부 텍스트 (색상)
    ctx.fillStyle = n.color;
    ctx.fillText(n.text, n.x, n.y);
    
    ctx.restore();
  });
}


// ▶ 배경 별 그리기
function drawStars() {
  // 깊은 우주 그라데이션 배경
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#000033');      // 짙은 남색
  gradient.addColorStop(0.5, '#000011');    // 거의 검은색
  gradient.addColorStop(1, '#110022');      // 어두운 보라
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 별 그리기 (크기별 다른 밝기)
  for (let s of stars) {
    // 큰 별은 더 밝게
    const brightness = Math.floor(150 + (s.size / 3) * 105);
    ctx.fillStyle = `rgb(${brightness}, ${brightness}, 255)`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
    
    // 큰 별은 발광 효과
    if (s.size > 2) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * (s.size / 3)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // 은하수 효과 (흐릿한 구름)
  ctx.save();
  ctx.globalAlpha = 0.1;
  const galaxyGradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width);
  galaxyGradient.addColorStop(0, '#6644AA');
  galaxyGradient.addColorStop(0.5, '#332266');
  galaxyGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = galaxyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}


// ▶ 이펙트 그리기
function drawEffects() {
  for (let e of effects) {
    const alpha = e.life / 30;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}



// ⭐ 별 모양 아이템 그리기 함수
function drawStarShape(x, y, radius, points, inset) {
  ctx.save();
  ctx.beginPath();
  ctx.translate(x, y);
  ctx.moveTo(0, 0 - radius);
  for (let i = 0; i < points; i++) {
    ctx.rotate(Math.PI / points);
    ctx.lineTo(0, 0 - (radius * inset));
    ctx.rotate(Math.PI / points);
    ctx.lineTo(0, 0 - radius);
  }
  ctx.closePath();
  ctx.restore();
}

// ⭐ 아이템 그리기
// ⭐ 아이템 그리기
function drawItems() {
  for (let item of items) {
    // 아이템 타입에 따라 색상 구분
    if (item.type === 'health') {
      ctx.fillStyle = "lime";  // 초록색 별 (체력 회복)
    } else if (item.type === 'power') {
      ctx.fillStyle = "#00BFFF";  // 파란색 별 (파워업)
    } else {
      ctx.fillStyle = "orange";  // 노란색 별 (점수/공격력)
    }
    ctx.beginPath();
    drawStarShape(item.x + item.width / 2, item.y + item.height / 2, 12, 5, 0.5);  // 크기 6 -> 12로 증가
    ctx.fill();
  }
}


// ▶ 메인 게임 루프
function update() {
  if (gameOver) return;
  
  // deltaTime 계산 (밀리초 → 초 단위, 60fps 기준으로 정규화)
  const currentFrameTime = Date.now();
  deltaTime = (currentFrameTime - lastFrameTime) / 1000 * 60; // 60fps 기준
  lastFrameTime = currentFrameTime;
  
  // deltaTime이 너무 크면 제한 (탭 전환 등으로 인한 큰 점프 방지)
  if (deltaTime > 5) deltaTime = 1;
  
  if (isPaused) {
    // 일시정지 상태일 때 PAUSE 텍스트 표시
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "white";
    ctx.font = "80px 'Courier New'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PAUSE", canvas.width / 2, canvas.height / 2);
    ctx.font = "24px 'Courier New'";
    ctx.fillText("Press ESC to Resume", canvas.width / 2, canvas.height / 2 + 60);
    
    requestAnimationFrame(update);
    return;
  }

  updateStars();
  updateEffects();
  updateItems();    // 3️⃣ 아이템
  updateNotifications();  // 4️⃣ 알림 메시지

  // 게임 시간 업데이트 (난이도 증가)
  gameTime += 1/60;  // 60fps 기준으로 초 단위 증가
  
  // 최고 공속 유지 시간 업데이트
  if (attackLevel === 10 && maxAttackLevelStartTime > 0) {
    maxAttackLevelTime = (Date.now() - maxAttackLevelStartTime) / 1000;
  }

  // 동적 적 생성 (시간에 따라 간격 감소)
  const now = Date.now();
  const spawnInterval = getEnemySpawnInterval();
  
  // 보스 생성 조건: 1분(60초)마다
  const timeSinceStart = (now - gameStartTime) / 1000;  // 초 단위
  const timeSinceLastBoss = (now - lastBossSpawnTime) / 1000;  // 초 단위
  
  // 보스 경고 표시 (보스 생성 2초 전)
  if (!bossActive && !bossWarningActive && timeSinceStart >= 58 && timeSinceLastBoss >= 58) {
    bossWarningActive = true;
    bossWarningStart = now;
  }
  
  // 보스 경고 후 2초 뒤 보스 생성
  if (bossWarningActive && now - bossWarningStart >= 2000) {
    // 1분마다 보스 생성 (Commander와 Flagship 교대)
    spawnBoss(nextBossType);
    lastBossSpawnTime = now;
    bossActive = true;
    bossWarningActive = false;
    // 다음 보스 타입 교대
    nextBossType = (nextBossType === 'commander') ? 'flagship' : 'commander';
  } else if (!bossActive && !bossWarningActive && now - lastEnemySpawn >= spawnInterval) {
    // 보스가 없을 때만 일반 적 생성
    spawnEnemy();
    lastEnemySpawn = now;
  }

  // 동적 적 총알 발사 (시간에 따라 간격 감소)
  const shootInterval = getEnemyShootInterval();
  if (now - lastEnemyShot >= shootInterval) {
    enemyShoot();
    lastEnemyShot = now;
  }

  // 플레이어 이동 (십자 이동 허용) - deltaTime 적용
  if ((keys["ArrowLeft"] || keys["a"]) && player.x > 0) player.x -= player.speed * deltaTime;
  if ((keys["ArrowRight"] || keys["d"]) && player.x + player.width < canvas.width) player.x += player.speed * deltaTime;
  if ((keys["ArrowUp"] || keys["w"]) && player.y > 0) player.y -= player.speed * deltaTime;
  if ((keys["ArrowDown"] || keys["s"]) && player.y + player.height < canvas.height) player.y += player.speed * deltaTime;

  // 스페이스를 누르고 있으면 0.5초 간격으로 발사 (연속 발사 가능하지만 내부 쿨다운 적용)
  if (keys[" "]) {
    const now = Date.now();
    if (now - lastShotTime >= shotCooldown) {
      shoot();
      lastShotTime = now;
    }
  }

  // 총알 이동 - deltaTime 적용
  bullets.forEach(b => b.y -= b.speed * deltaTime);
  bullets = bullets.filter(b => b.y > 0);

  // 무적 상태 업데이트 (깜빡임 효과)
  const currentTime = Date.now();
  if (player.invincible) {
    if (currentTime >= player.invincibleUntil) {
      // 무적 종료
      player.invincible = false;
      player.blinkVisible = true;
    } else {
      // 0.2초마다 깜빡임
      if (currentTime - lastBlinkTime >= blinkInterval) {
        player.blinkVisible = !player.blinkVisible;
        lastBlinkTime = currentTime;
      }
    }
  }

  // 적 이동 및 특수 능력 처리
  enemies.forEach(e => {
    // 보스 전용 이동 (화면 상단 고정 + 좌우 이동) - deltaTime 적용
    if (e.isBoss) {
      if (e.state === 'entering') {
        // 목표 위치까지 하강
        e.y += e.speed * 2 * deltaTime;
        if (e.y >= e.targetY) {
          e.y = e.targetY;
          e.state = 'hovering';
          e.arrived = true;
        }
      } else if (e.state === 'hovering') {
        // 좌우 이동
        e.x += e.moveDirection * e.speed * deltaTime;
        
        // 화면 경계 체크 (반대 방향으로 전환)
        if (e.x <= 0 || e.x >= canvas.width - e.width) {
          e.moveDirection *= -1;
        }
      }
    }
    // Drone의 레이저 조준 시스템
    else if (e.type.attackType === 'laser') {
      const distanceToPlayer = Math.abs(e.y - player.y);
      
      if (e.state === 'moving' && distanceToPlayer < e.type.stopDistance) {
        // 멈춤 + 조준 시작
        e.state = 'tracking';  // 추적 상태로 변경
        e.stopped = true;
        e.laserChargeStart = Date.now();
        e.laserTarget = { x: player.x + player.width / 2, y: player.y + player.height / 2 };  // 플레이어 중앙
      }
      
      if (e.state === 'tracking') {
        const chargeTime = Date.now() - e.laserChargeStart;
        
        // 2초 동안 계속 플레이어 추적
        if (chargeTime < e.type.laserChargeTime) {
          e.laserTarget = { x: player.x + player.width / 2, y: player.y + player.height / 2 };  // 플레이어 중앙
        }
        // 2초 추적 완료 → 1초 고정 대기
        else if (chargeTime >= e.type.laserChargeTime && chargeTime < e.type.laserChargeTime + e.type.laserFireDelay) {
          // 타겟 위치 고정 (이미 저장된 laserTarget 유지)
          e.state = 'locked';  // 고정 상태로 전환
        }
      }
      
      if (e.state === 'locked') {
        const chargeTime = Date.now() - e.laserChargeStart;
        
        // 1초 고정 대기 완료 → 레이저 발사
        if (chargeTime >= e.type.laserChargeTime + e.type.laserFireDelay) {
          fireLaser(e);
          e.state = 'moving';
          e.stopped = false;
          e.laserTarget = null;
        }
      }
      
      // 멈춰있지 않으면 이동 - deltaTime 적용
      if (!e.stopped) {
        e.y += e.speed * deltaTime;
      }
    } else {
      // 일반 이동 - deltaTime 적용
      e.y += e.speed * deltaTime;
    }
    
    // 플레이어 충돌 처리 (히트박스 기준)
    const playerHitbox = getPlayerHitbox();
    if (isCollidingCircle(playerHitbox, e) && !player.invincible) {
      // 플레이어가 적과 충돌 -> 체력 감소, 적 제거, 무적 시작
      player.health--;
      spawnEffect(e.x + e.width / 2, e.y + e.height / 2);
      
      // 보스는 충돌해도 제거 안 됨
      if (!e.isBoss) {
        e.dead = true;
      }
      
      // 공격 레벨 감소
      reduceAttackLevel();
      
      // 무적 상태 시작
      const now = Date.now();
      player.invincible = true;
      player.invincibleUntil = now + invincibleDuration;
      lastBlinkTime = now;
      player.blinkVisible = true;
      
      if (player.health <= 0) {
        gameOver = true;
        showGameOver();
      }
    }
  });

  enemies = enemies.filter(e => {
    for (let b of bullets) {
      if (isColliding(e, b)) {
        // 적에게 데미지 적용
        e.health -= b.damage || 1;
        bullets = bullets.filter(bullet => bullet !== b);
        
        // 적이 죽었을 때만 점수, 이펙트, 아이템 처리
        if (e.health <= 0) {
          score += e.score || 1;  // 적 타입별 점수 추가
          enemiesKilled++;  // 처치한 적 수 증가
          spawnEffect(e.x + e.width / 2, e.y + e.height / 2);

          // 보스 처치 시 bossActive 플래그 해제 + 파워업 아이템 드롭
          if (e.isBoss) {
            bossActive = false;
            bossKillCount++;
            bossHealthMultiplier *= 2;  // 다음 보스 체력 2배
            // 파란색 별 (파워업) 아이템 드롭
            spawnItem(e.x + e.width / 2 - 12, e.y, 'power');
          }

          // Moth: 체력 회복 아이템 100% 드롭
          if (e.type.guaranteedDrop === 'health') {
            spawnItem(e.x + e.width / 2 - 12, e.y, 'health');
          } else if (!e.isBoss) {
            // 일반 아이템 생성 로직 (보스는 제외)
            const rand = Math.random();
            if (rand < 0.1 && player.health < 3) {
              // 10% 확률로 체력 회복 아이템 (초록 별) - 체력이 3 미만일 때만
              spawnItem(e.x + e.width / 2 - 12, e.y, 'health');
            } else if (rand < 0.5) {
              // 40% 확률로 점수/공격력 아이템 (노란 별)
              spawnItem(e.x + e.width / 2 - 12, e.y, 'score');
            }
          }

          return false;  // 적 제거
        }
        
        return true;  // 적 살아있음 (체력 남음)
      }
    }
    // 보스는 화면 밖으로 나가도 제거 안 됨
    if (e.isBoss) return !e.dead;
    // 일반 적은 화면 밖으로 나가면 제거
    return e.y < canvas.height && !e.dead;
  });


  // 적 총알 이동 및 특수 효과 처리
  enemyBullets.forEach(b => {
    // 유도 미사일 (Flagship)
    if (b.type === 'homing') {
      const dx = (player.x + player.width / 2) - b.x;
      const dy = (player.y + player.height / 2) - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        const targetAngle = Math.atan2(dy, dx);
        const currentAngle = Math.atan2(b.speedY, b.speedX);
        
        let angleDiff = targetAngle - currentAngle;
        // 각도 정규화 (-PI ~ PI)
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        const newAngle = currentAngle + angleDiff * b.turnRate;
        const speed = b.homingSpeed;
        b.speedX = Math.cos(newAngle) * speed;
        b.speedY = Math.sin(newAngle) * speed;
      }
    }
    
    // 레이저는 고정된 위치에서 확장 애니메이션 + 페이드 아웃
    if (b.type === 'laser') {
      b.lifetime = (b.lifetime || 0) + deltaTime;
      
      // 레이저 길이 확장 (빠르게) - deltaTime 적용
      if (b.currentLength < b.maxHeight) {
        b.currentLength += b.expandSpeed * deltaTime;
        b.height = Math.min(b.currentLength, b.maxHeight);
      }
      
      // 최대 생존 시간 도달 시 페이드 아웃
      if (b.lifetime > b.maxLifetime - 20) {
        b.alpha -= 0.05 * deltaTime;
      }
      
      if (b.lifetime > b.maxLifetime || b.alpha <= 0) {
        b.dead = true;
      }
      
      // 레이저는 위치 이동 안 함
    } else {
      // 일반 총알만 이동 - deltaTime 적용
      b.x += b.speedX * deltaTime;
      b.y += b.speedY * deltaTime;
    }
    
    // 플레이어 충돌 처리 (히트박스 기준)
    const playerHitbox = getPlayerHitbox();
    
    // 레이저는 회전된 빔의 선분 충돌 체크
    if (b.type === 'laser' && b.angle !== undefined) {
      // 레이저 시작점과 끝점 계산
      const laserStartX = b.x;
      const laserStartY = b.y;
      const laserEndX = b.x + Math.cos(b.angle) * b.height;
      const laserEndY = b.y + Math.sin(b.angle) * b.height;
      
      // 선분과 원의 최단 거리 계산
      const dx = laserEndX - laserStartX;
      const dy = laserEndY - laserStartY;
      const lenSq = dx * dx + dy * dy;
      
      let closestX, closestY;
      
      if (lenSq === 0) {
        // 선분 길이가 0이면 시작점과의 거리
        closestX = laserStartX;
        closestY = laserStartY;
      } else {
        // 플레이어를 선분에 투영
        const t = Math.max(0, Math.min(1, 
          ((playerHitbox.x - laserStartX) * dx + (playerHitbox.y - laserStartY) * dy) / lenSq
        ));
        closestX = laserStartX + t * dx;
        closestY = laserStartY + t * dy;
      }
      
      // 가장 가까운 점과 플레이어의 거리
      const distX = playerHitbox.x - closestX;
      const distY = playerHitbox.y - closestY;
      const distance = Math.sqrt(distX * distX + distY * distY);
      
      if (distance < playerHitbox.radius + b.width / 2 && !player.invincible) {
        player.health--;
        b.dead = true;
        spawnEffect(playerHitbox.x, playerHitbox.y);
        
        // 공격 레벨 감소
        reduceAttackLevel();
        
        // 무적 상태 시작
        const now = Date.now();
        player.invincible = true;
        player.invincibleUntil = now + invincibleDuration;
        lastBlinkTime = now;
        player.blinkVisible = true;
        
        if (player.health <= 0) {
          gameOver = true;
          showGameOver();
        }
      }
    }
    // 일반 총알은 기존 충돌 체크
    else if (isCollidingCircle(playerHitbox, b) && !player.invincible) {
      player.health--;
      b.dead = true;
      spawnEffect(b.x + b.width / 2, b.y + b.height / 2);
      
      // 공격 레벨 감소
      reduceAttackLevel();
      
      // 무적 상태 시작
      const now = Date.now();
      player.invincible = true;
      player.invincibleUntil = now + invincibleDuration;
      lastBlinkTime = now;
      player.blinkVisible = true;
      
      if (player.health <= 0) {
        gameOver = true;
        showGameOver();
      }
    }
  });
  enemyBullets = enemyBullets.filter(b => 
    b.x > -10 && b.x < canvas.width + 10 && 
    b.y > -10 && b.y < canvas.height + 10 && 
    !b.dead
  );


  // ▶ 그리기
  drawStars();       // 배경
  drawEffects();     // 2️⃣ 이펙트 폭발 효과
  drawItems();       // 3️⃣ 아이템
  drawNotifications(); // 4️⃣ 알림 메시지

  // ▶ 적 (Canvas HD 그래픽)
  enemies.forEach(e => {
    drawEnemy(e);
  });

  // ▶ 플레이어 총알
  bullets.forEach(b => {
    ctx.fillStyle = "yellow";
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });


  // ▶ Drone 레이저 조준선 표시 (드론 본체에서 나오는 경고선만)
  enemies.forEach(e => {
    if (e.type.attackType === 'laser' && (e.state === 'tracking' || e.state === 'locked') && e.laserTarget) {
      const chargeTime = Date.now() - e.laserChargeStart;
      const chargeProgress = Math.min(1, chargeTime / e.type.laserChargeTime);
      
      // 드론 중앙 좌표
      const droneX = e.x + e.width / 2;
      const droneY = e.y + e.height / 2;
      
      // 디버그용 선 그리기 (드론 중앙 → 타겟)
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';  // 초록색 디버그선
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(droneX, droneY);
      ctx.lineTo(e.laserTarget.x, e.laserTarget.y);
      ctx.stroke();
      
      // 2초 동안 추적 - 조준점만 표시
      if (chargeTime < e.type.laserChargeTime) {
        // 조준점 표시 (노란색)
        ctx.fillStyle = `rgba(255, 255, 0, ${0.4 + chargeProgress * 0.6})`;
        ctx.beginPath();
        ctx.arc(e.laserTarget.x, e.laserTarget.y, 8 + 5 * chargeProgress, 0, Math.PI * 2);
        ctx.fill();
        
        // 조준점 중심 (빨간색)
        ctx.fillStyle = `rgba(255, 0, 0, ${chargeProgress})`;
        ctx.beginPath();
        ctx.arc(e.laserTarget.x, e.laserTarget.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // 1초 대기 - 고정된 위치에서 조준점 깜빡임
      else if (chargeTime < e.type.laserChargeTime + e.type.laserFireDelay) {
        const lockTime = chargeTime - e.type.laserChargeTime;
        const blinkRate = Math.sin(lockTime / 100) * 0.5 + 0.5;  // 부드러운 깜빡임
        
        // 고정된 조준점 (빨간색 깜빡임)
        ctx.fillStyle = `rgba(255, 0, 0, ${blinkRate})`;
        ctx.beginPath();
        ctx.arc(e.laserTarget.x, e.laserTarget.y, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // 조준점 중심 (밝은 빨간색)
        ctx.fillStyle = `rgba(255, 100, 100, ${blinkRate})`;
        ctx.beginPath();
        ctx.arc(e.laserTarget.x, e.laserTarget.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // 디버그 텍스트
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(`Target: ${Math.round(e.laserTarget.x)}, ${Math.round(e.laserTarget.y)}`, e.laserTarget.x + 20, e.laserTarget.y);
      }
    }
  });

  // ▶ 보스 거대 레이저 경고 구역 표시
  enemies.forEach(e => {
    if (e.isBoss && e.isChargingLaser && e.laserWarningX) {
      const chargeTime = Date.now() - e.laserChargeStart;
      const chargeProgress = Math.min(1, chargeTime / 2000);
      const flashSpeed = Math.sin(chargeTime / 100);
      const flashAlpha = flashSpeed * 0.4 + 0.6;  // 0.2 ~ 1.0
      
      const laserWidth = 80;
      const warningX = e.laserWarningX - laserWidth / 2;
      
      // 경고 구역 (빨간색 반투명 사각형, 깜빡임)
      ctx.fillStyle = `rgba(255, 0, 0, ${0.15 * flashAlpha})`;
      ctx.fillRect(warningX, e.y + e.height, laserWidth, canvas.height - e.y - e.height);
      
      // 경계선 (더 밝게 깜빡임)
      ctx.strokeStyle = `rgba(255, 0, 0, ${0.8 * flashAlpha})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(warningX, e.y + e.height, laserWidth, canvas.height - e.y - e.height);
      
      // 경고 텍스트
      if (chargeProgress < 0.9) {
        ctx.fillStyle = `rgba(255, 255, 0, ${flashAlpha})`;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('DANGER!', e.laserWarningX, e.y + e.height + 100);
        ctx.textAlign = 'left';
      }
    }
  });

  // ▶ 적 총알 (타입별 렌더링)
  enemyBullets.forEach(b => {
    if (b.type === 'laser') {
      // 레이저 애니메이션 (펄스 효과)
      const pulseSpeed = 0.05;
      b.animFrame = (b.animFrame || 0) + pulseSpeed;
      const pulse = Math.sin(b.animFrame) * 0.3 + 0.7;  // 0.4 ~ 1.0
      const glow = Math.sin(b.animFrame * 2) * 0.2 + 0.8;  // 0.6 ~ 1.0
      
      // 레이저를 회전해서 대각선으로 그리기
      ctx.save();
      ctx.translate(b.x, b.y);  // 레이저 시작점으로 이동
      ctx.rotate(b.angle - Math.PI / 2);  // 각도 조정: Canvas는 0도가 오른쪽, 우리는 아래쪽이 기준
      
      // 외곽 발광 (깜빡임)
      ctx.fillStyle = `rgba(255, 0, 0, ${(b.alpha || 1) * 0.3 * glow})`;
      ctx.fillRect(-b.width / 2 - 6, 0, b.width + 12, b.height);
      
      // 중간 레이어 (더 밝은 발광)
      ctx.fillStyle = `rgba(255, 50, 50, ${(b.alpha || 1) * 0.5 * pulse})`;
      ctx.fillRect(-b.width / 2 - 3, 0, b.width + 6, b.height);
      
      // 레이저 본체 (핵심 빔)
      ctx.fillStyle = `rgba(255, 150, 150, ${(b.alpha || 1) * pulse})`;
      ctx.fillRect(-b.width / 2, 0, b.width, b.height);
      
      // 중심 하이라이트 (흰색 코어)
      ctx.fillStyle = `rgba(255, 255, 255, ${(b.alpha || 1) * 0.7 * pulse})`;
      ctx.fillRect(-b.width / 4, 0, b.width / 2, b.height);
      
      ctx.restore();
      
      // 디버그: 레이저 시작점 표시
      ctx.fillStyle = 'cyan';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fill();
      
      // 디버그: 레이저 끝점 표시
      const endX = b.x + Math.cos(b.angle) * b.height;
      const endY = b.y + Math.sin(b.angle) * b.height;
      ctx.fillStyle = 'magenta';
      ctx.beginPath();
      ctx.arc(endX, endY, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.type === 'homing') {
      // 유도 미사일 (원형, 발광 효과)
      // 외곽 발광
      ctx.fillStyle = 'rgba(255, 69, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, b.width / 2 + 4, 0, Math.PI * 2);
      ctx.fill();
      // 본체
      ctx.fillStyle = b.color || '#FF4500';
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, b.width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.type === 'circular') {
      // 원형 탄막 (둥근 모양, 발광 효과)
      // 외곽 발광
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, b.width / 2 + 3, 0, Math.PI * 2);
      ctx.fill();
      // 본체
      ctx.fillStyle = b.color || '#FFD700';
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, b.width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.type === 'spread') {
      // 부채꼴 총알 (원형, 밝은 파란색)
      // 외곽 발광
      ctx.fillStyle = 'rgba(0, 191, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, b.width / 2 + 2, 0, Math.PI * 2);
      ctx.fill();
      // 본체
      ctx.fillStyle = b.color || '#00BFFF';
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, b.width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 일반 총알 (원형, 빨간색)
      // 외곽 발광
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, b.width / 2 + 2, 0, Math.PI * 2);
      ctx.fill();
      // 본체
      ctx.fillStyle = "#FF3333";
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2, b.y + b.height / 2, b.width / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });


  // ▶ 플레이어 (깜빡임 효과 적용)
  if (player.blinkVisible) {
    ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    
    // 히트박스 표시 (중앙 작은 원)
    const hitboxRadius = 6;  // 히트박스 반지름
    const hitboxX = player.x + player.width / 2;
    const hitboxY = player.y + player.height / 2;
    
    // 흰색 원
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(hitboxX, hitboxY, hitboxRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // 검은색 얇은 테두리
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(hitboxX, hitboxY, hitboxRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // ▶ 플레이어 체력 표시 (플레이어 아래 3칸)
  const heartSize = 12;
  const heartSpacing = 16;
  const totalWidth = heartSpacing * 2;  // 3칸 (0, 1, 2)
  const startX = player.x + player.width / 2 - totalWidth / 2;
  const heartY = player.y + player.height + 10;
  
  for (let i = 0; i < 3; i++) {
    const hx = startX + i * heartSpacing;
    if (i < player.health) {
      // 채워진 하트 (빨간색)
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(hx, heartY, heartSize / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // 하트 하이라이트
      ctx.fillStyle = '#FF6666';
      ctx.beginPath();
      ctx.arc(hx - 2, heartY - 2, heartSize / 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 빈 하트 (회색 윤곽)
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, heartY, heartSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ▶ 점수 표시
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText("Score: " + score, 10, 20);

  // ▶ 공격 레벨 표시 - 좌측 상단 (점수 아래)
  ctx.fillStyle = "yellow";
  ctx.font = "14px Arial";
  ctx.fillText(`ATK Lv: ${attackLevel}`, 10, 40);

  // ▶ 체력(HP) 표시 - 우측 상단
  ctx.fillStyle = "red";
  ctx.font = "16px Arial";
  const hearts = Array.from({ length: Math.max(0, player.health) }).map(_ => '❤').join('');
  const hpText = `HP: ${hearts}`;
  const hpWidth = ctx.measureText(hpText).width;
  ctx.fillText(hpText, canvas.width - hpWidth - 10, 20);
  
  // ▶ 보스 경고 메시지 표시 (화면 중앙, 크게)
  if (bossWarningActive) {
    const elapsed = Date.now() - bossWarningStart;
    const flashAlpha = Math.sin(elapsed / 100) * 0.3 + 0.7;  // 깜빡임 효과
    const bgFlash = Math.sin(elapsed / 150) * 0.2 + 0.5;  // 배경 깜빡임 (0.3~0.7)
    
    // 어두운 배경 (깜빡임 효과)
    ctx.fillStyle = `rgba(0, 0, 0, ${bgFlash})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 경고 메시지
    ctx.fillStyle = `rgba(255, 0, 0, ${flashAlpha})`;
    ctx.font = "bold 60px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    const warningText = nextBossType === 'commander' ? 
      "⚠ WARNING ⚠" : "☠ DANGER ☠";
    const bossText = nextBossType === 'commander' ? 
      "COMMANDER INCOMING!" : "FLAGSHIP INCOMING!";
    
    ctx.fillText(warningText, canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = "bold 40px Arial";
    ctx.fillStyle = `rgba(255, 255, 0, ${flashAlpha})`;
    ctx.fillText(bossText, canvas.width / 2, canvas.height / 2 + 20);
    
    // 텍스트 외곽선
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.font = "bold 60px Arial";
    ctx.strokeText(warningText, canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = "bold 40px Arial";
    ctx.strokeText(bossText, canvas.width / 2, canvas.height / 2 + 20);
    
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  requestAnimationFrame(update);
}

// 게임 오버 화면 표시
function showGameOver() {
  const playTime = ((Date.now() - gameStartTime) / 1000).toFixed(1);
  const maxLevelTime = maxAttackLevelTime.toFixed(1);
  
  const gameOverHTML = `
    <div id="gameOverScreen" class="game-over-screen">
      <div class="arcade-frame">
        <div class="screen-border">
          <h1 class="game-over-title">GAME OVER</h1>
          
          <div class="stats-container">
            <h2 class="stats-title">FINAL STATS</h2>
            <div class="stat-item">
              <span class="stat-label">SCORE:</span>
              <span class="stat-value">${score}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">ENEMIES KILLED:</span>
              <span class="stat-value">${enemiesKilled}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">PLAY TIME:</span>
              <span class="stat-value">${playTime}s</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">MAX ATK LV TIME:</span>
              <span class="stat-value">${maxLevelTime}s</span>
            </div>
          </div>
          
          <div class="game-over-buttons">
            <button id="restartButton" class="arcade-button">RESTART</button>
            <button id="homeButton" class="arcade-button secondary">HOME</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', gameOverHTML);
  
  // 버튼 이벤트 등록
  document.getElementById('restartButton').addEventListener('click', restartGame);
  document.getElementById('homeButton').addEventListener('click', goHome);
}

// 게임 재시작
function restartGame() {
  // 게임 오버 화면 제거
  const gameOverScreen = document.getElementById('gameOverScreen');
  if (gameOverScreen) gameOverScreen.remove();
  
  // 게임 상태 초기화
  gameOver = false;
  isPaused = false;
  score = 0;
  gameTime = 0;
  enemiesKilled = 0;
  attackLevel = 1;
  shotCooldown = 500;
  maxAttackLevelTime = 0;
  maxAttackLevelStartTime = 0;
  bulletCount = 1;  // 총알 수 초기화
  bulletDamage = 1;  // 데미지 초기화
  bossHealthMultiplier = 1;  // 보스 체력 배율 초기화
  bossKillCount = 0;  // 보스 처치 수 초기화
  bossActive = false;
  bossWarningActive = false;
  lastBossSpawnTime = 0;
  
  // 플레이어 초기화
  player.x = 280;
  player.y = 750;
  player.health = 3;
  player.invincible = false;
  player.blinkVisible = true;
  
  // 배열 초기화
  bullets = [];
  enemies = [];
  enemyBullets = [];
  items = [];
  effects = [];
  notifications = [];
  
  // 타이머 초기화
  lastEnemySpawn = 0;
  lastEnemyShot = 0;
  lastShotTime = 0;
  
  // 게임 재시작
  gameStartTime = Date.now();
  update();
}

// 홈으로 돌아가기
function goHome() {
  // 게임 오버 화면 제거
  const gameOverScreen = document.getElementById('gameOverScreen');
  if (gameOverScreen) gameOverScreen.remove();
  
  // 캔버스 숨기고 시작 화면 표시
  canvas.style.display = 'none';
  document.getElementById('startScreen').style.display = 'flex';
  
  // 게임 상태 초기화
  gameStarted = false;
  gameOver = false;
  isPaused = false;
  score = 0;
  gameTime = 0;
  enemiesKilled = 0;
  attackLevel = 1;
  shotCooldown = 500;
  maxAttackLevelTime = 0;
  maxAttackLevelStartTime = 0;
  
  // 플레이어 초기화
  player.x = 280;
  player.y = 750;
  player.health = 3;
  player.invincible = false;
  player.blinkVisible = true;
  
  // 배열 초기화
  bullets = [];
  enemies = [];
  enemyBullets = [];
  items = [];
  effects = [];
}

// ▶ 게임 시작 (시작 버튼 클릭 시 호출됨)
// update()는 시작 화면에서 버튼 클릭 시 실행됨
