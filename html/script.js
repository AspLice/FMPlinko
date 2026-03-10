/**
 * Plinko — NUIメインスクリプト
 * Matter.js物理エンジン + Guided Physics + FiveM NUI通信
 */

'use strict';

// ============================================================
// 定数・設定
// ============================================================

const COLORS = {
    peg:        '#2d4a6e',
    pegStroke:  '#4a7aab',
    ball:       '#ffffff',
    ballGlow:   'rgba(255,255,255,0.8)',
    bgCanvas:   '#111e2d',

    // ポケット倍率ティア別カラー
    tierJackpot: '#ff6b35',  // ≥ 50x
    tierHigh:    '#f5a623',  // ≥ 10x
    tierMedium:  '#4fc3f7',  // ≥ 2x
    tierLow:     '#8ba6c1',  // ≥ 1x
    tierLoss:    '#ff4757',  // < 1x
};

// ============================================================
// オッズテーブル（config.luaと同一の値 — 表示用のみ）
// 実際の計算はサーバーが行う
// ============================================================

const ODDS_TABLE = {
    low: {
        8:  [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
        9:  [5.6, 2.0, 1.6, 1.0, 0.7, 0.7, 1.0, 1.6, 2.0, 5.6],
        10: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9],
        11: [8.4, 3.0, 1.9, 1.3, 1.0, 0.7, 0.7, 1.0, 1.3, 1.9, 3.0, 8.4],
        12: [10.0, 3.0, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3.0, 10.0],
        13: [8.1, 4.0, 3.0, 1.9, 1.2, 0.9, 0.7, 0.7, 0.9, 1.2, 1.9, 3.0, 4.0, 8.1],
        14: [7.1, 4.0, 1.9, 1.4, 1.3, 1.1, 1.0, 0.5, 1.0, 1.1, 1.3, 1.4, 1.9, 4.0, 7.1],
        15: [15.0, 8.0, 3.0, 2.0, 1.5, 1.1, 1.0, 0.7, 0.7, 1.0, 1.1, 1.5, 2.0, 3.0, 8.0, 15.0],
        16: [16.0, 9.0, 2.0, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2.0, 9.0, 16.0],
    },
    medium: {
        8:  [13.0, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13.0],
        9:  [18.0, 4.0, 1.7, 0.9, 0.5, 0.5, 0.9, 1.7, 4.0, 18.0],
        10: [22.0, 5.0, 2.0, 1.4, 0.6, 0.4, 0.6, 1.4, 2.0, 5.0, 22.0],
        11: [24.0, 6.0, 3.0, 1.8, 0.7, 0.5, 0.5, 0.7, 1.8, 3.0, 6.0, 24.0],
        12: [33.0, 11.0, 4.0, 2.0, 1.1, 0.6, 0.3, 0.6, 1.1, 2.0, 4.0, 11.0, 33.0],
        13: [43.0, 13.0, 6.0, 3.0, 1.3, 0.7, 0.4, 0.4, 0.7, 1.3, 3.0, 6.0, 13.0, 43.0],
        14: [58.0, 15.0, 7.0, 4.0, 1.9, 1.0, 0.5, 0.2, 0.5, 1.0, 1.9, 4.0, 7.0, 15.0, 58.0],
        15: [88.0, 18.0, 11.0, 5.0, 3.0, 1.3, 0.5, 0.3, 0.3, 0.5, 1.3, 3.0, 5.0, 11.0, 18.0, 88.0],
        16: [110.0, 41.0, 10.0, 5.0, 3.0, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3.0, 5.0, 10.0, 41.0, 110.0],
    },
    high: {
        8:  [29.0, 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29.0],
        9:  [43.0, 7.0, 2.0, 0.6, 0.2, 0.2, 0.6, 2.0, 7.0, 43.0],
        10: [76.0, 10.0, 3.0, 0.9, 0.3, 0.2, 0.3, 0.9, 3.0, 10.0, 76.0],
        11: [120.0, 14.0, 5.3, 1.4, 0.4, 0.2, 0.2, 0.4, 1.4, 5.3, 14.0, 120.0],
        12: [170.0, 24.0, 8.1, 2.0, 0.7, 0.2, 0.2, 0.2, 0.7, 2.0, 8.1, 24.0, 170.0],
        13: [260.0, 37.0, 11.0, 4.0, 1.0, 0.2, 0.2, 0.2, 0.2, 1.0, 4.0, 11.0, 37.0, 260.0],
        14: [420.0, 56.0, 18.0, 5.0, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5.0, 18.0, 56.0, 420.0],
        15: [620.0, 83.0, 27.0, 8.0, 3.0, 0.5, 0.2, 0.2, 0.2, 0.2, 0.5, 3.0, 8.0, 27.0, 83.0, 620.0],
        16: [1000.0, 130.0, 26.0, 9.0, 4.0, 2.0, 0.2, 0.2, 0.2, 0.2, 0.2, 2.0, 4.0, 9.0, 26.0, 130.0, 1000.0],
    },
};

// ============================================================
// ゲーム状態
// ============================================================

const state = {
    currentRisk:   'low',
    currentRows:   16,
    isAnimating:   false,
    sessionToken:  null,
    engine:        null,
    render:        null,
    runner:        null,
    activeBall:    null,
    pegBodies:     [],
    targetPocket:  null,  // 1-indexed、サーバーから受け取る
    guidanceActive: false,
};

// Matter.jsモジュール展開
const { Engine, Render, Runner, Bodies, Body, World, Events, Vector, Composite } = Matter;

// ============================================================
// キャンバス・物理エンジン初期化
// ============================================================

let canvasWidth  = 0;
let canvasHeight = 0;
let pegRadius    = 0;
let ballRadius   = 0;
let pegSpacingX  = 0;
let pegSpacingY  = 0;
let topMargin    = 0;
let pegPositions = [];  // { x, y, row, col } の配列

function initPhysics() {
    const gameArea = document.querySelector('.game-area');
    const maxW = gameArea.clientWidth  - 24;
    const maxH = gameArea.clientHeight - 50;
    canvasWidth  = Math.min(maxW, 680);
    canvasHeight = Math.min(maxH, 540);

    const canvas = document.getElementById('plinkoCanvas');
    canvas.width  = canvasWidth;
    canvas.height = canvasHeight;

    // 既存エンジンを破棄
    if (state.engine) {
        Runner.stop(state.runner);
        Render.stop(state.render);
        World.clear(state.engine.world, false);
        Engine.clear(state.engine);
    }

    state.engine = Engine.create({ gravity: { y: 1.4 } });
    state.render = Render.create({
        canvas,
        engine: state.engine,
        options: {
            width:             canvasWidth,
            height:            canvasHeight,
            wireframes:        false,
            background:        COLORS.bgCanvas,
            pixelRatio:        window.devicePixelRatio || 1,
        },
    });

    state.runner = Runner.create();
    Runner.run(state.runner, state.engine);
    Render.run(state.render);

    // アフターレンダーでボール誘導を実行
    Events.on(state.engine, 'afterUpdate', onAfterUpdate);

    buildBoard();
}

// ============================================================
// ボード（ペグ・壁・ポケット）の構築
// ============================================================

function buildBoard() {
    World.clear(state.engine.world, false);
    pegPositions = [];
    state.pegBodies = [];
    state.activeBall = null;
    state.targetPocket = null;
    state.guidanceActive = false;

    const rows = state.currentRows;
    const totalPockets = rows + 1;

    // レイアウト計算
    topMargin   = canvasHeight * 0.06;
    const usableH = canvasHeight * 0.76;
    pegSpacingY = usableH / rows;
    pegSpacingX = (canvasWidth * 0.86) / rows;
    const pegArea  = Math.min(pegSpacingX, pegSpacingY);
    pegRadius   = Math.max(4, pegArea * 0.18);
    ballRadius  = Math.max(6, pegArea * 0.24);

    // 左右の壁
    const wallOpts = { isStatic: true, render: { fillStyle: 'transparent' }, label: 'wall' };
    const wT = 10;
    const leftX  = (canvasWidth - pegSpacingX * rows) / 2 - wT / 2;
    const rightX = (canvasWidth + pegSpacingX * rows) / 2 + wT / 2;

    World.add(state.engine.world, [
        Bodies.rectangle(leftX,  canvasHeight / 2, wT, canvasHeight, wallOpts),
        Bodies.rectangle(rightX, canvasHeight / 2, wT, canvasHeight, wallOpts),
        Bodies.rectangle(canvasWidth / 2, canvasHeight + 5, canvasWidth, 10, {
            isStatic: true, render: { fillStyle: '#1a2535' }, label: 'floor'
        }),
    ]);

    // ペグ生成
    const pegOpts = {
        isStatic: true,
        restitution: 0.3,
        friction: 0.1,
        render: { fillStyle: COLORS.peg, strokeStyle: COLORS.pegStroke, lineWidth: 1.5 },
        label: 'peg',
    };

    for (let row = 0; row < rows; row++) {
        const pegsInRow = row + 2;
        const rowWidth  = pegSpacingX * (pegsInRow - 1);
        const startX    = (canvasWidth - rowWidth) / 2;
        const y         = topMargin + pegSpacingY * row + pegSpacingY * 0.5;

        for (let col = 0; col < pegsInRow; col++) {
            const x = startX + col * pegSpacingX;
            const peg = Bodies.circle(x, y, pegRadius, pegOpts);
            World.add(state.engine.world, peg);
            state.pegBodies.push(peg);
            pegPositions.push({ x, y, row, col });
        }
    }

    // ポケット仕切り（静的ボディ）
    const pocketHeight = canvasHeight * 0.12;
    const pocketY      = canvasHeight - pocketHeight / 2;
    const pocketAreaW  = pegSpacingX * rows;
    const pocketStartX = (canvasWidth - pocketAreaW) / 2;
    const pocketW      = pocketAreaW / totalPockets;
    const dividerW     = 3;

    for (let i = 0; i <= totalPockets; i++) {
        const divX = pocketStartX + i * pocketW;
        World.add(state.engine.world, Bodies.rectangle(
            divX, pocketY, dividerW, pocketHeight,
            { isStatic: true, render: { fillStyle: '#2d4a6e' }, label: 'divider' }
        ));
    }

    buildPocketLabels(totalPockets, pocketW);
}

// ============================================================
// ポケットラベルの構築
// ============================================================

function getPocketTier(mult) {
    if (mult >= 50)  return 'tier-jackpot';
    if (mult >= 10)  return 'tier-high';
    if (mult >= 2)   return 'tier-medium';
    if (mult >= 1)   return 'tier-low';
    return 'tier-loss';
}

function getPocketColor(mult) {
    if (mult >= 50)  return COLORS.tierJackpot;
    if (mult >= 10)  return COLORS.tierHigh;
    if (mult >= 2)   return COLORS.tierMedium;
    if (mult >= 1)   return COLORS.tierLow;
    return COLORS.tierLoss;
}

function buildPocketLabels(totalPockets, pocketW) {
    const container = document.getElementById('pocketLabels');
    container.innerHTML = '';
    const odds = ODDS_TABLE[state.currentRisk][state.currentRows];
    if (!odds) return;

    // キャンバス幅に合わせてラベルコンテナ幅を設定
    const pocketAreaW  = pegSpacingX * state.currentRows;
    const pocketStartX = (canvasWidth - pocketAreaW) / 2;
    container.style.width      = canvasWidth + 'px';
    container.style.paddingLeft  = pocketStartX + 'px';
    container.style.paddingRight = pocketStartX + 'px';

    odds.forEach((mult, i) => {
        const label = document.createElement('div');
        label.className = `pocket-label ${getPocketTier(mult)}`;
        label.id        = `pocket-${i}`;
        label.textContent = mult >= 10 ? Math.round(mult) + 'x' : mult + 'x';
        label.style.maxWidth = pocketW + 'px';
        container.appendChild(label);
    });
}

// ============================================================
// Guided Physics — ボール誘導ロジック
// afterUpdateイベントで毎フレーム呼び出される
// ============================================================

function onAfterUpdate() {
    if (!state.activeBall || !state.guidanceActive) return;

    const ball   = state.activeBall;
    const pos    = ball.position;
    const vel    = ball.velocity;
    const rows   = state.currentRows;

    // 最終ポケットのX座標を計算（1-indexed → 0-indexed）
    const targetIdx   = state.targetPocket - 1;
    const totalPockets = rows + 1;
    const pocketAreaW  = pegSpacingX * rows;
    const pocketStartX = (canvasWidth - pocketAreaW) / 2;
    const pocketCenterX = pocketStartX + (targetIdx + 0.5) * (pocketAreaW / totalPockets);

    // ボールが最後の3行ペグを過ぎたあたりで誘導開始
    const guidanceStartY = topMargin + pegSpacingY * (rows - 2.5);

    if (pos.y < guidanceStartY) return;

    // 目標X方向への差分
    const dx = pocketCenterX - pos.x;
    const dist = Math.abs(dx);

    // 誘導力（距離に応じて線形に強さを変える）
    const forceMag = 0.00012 * Math.min(dist / 40, 3.0);
    const fx = dx > 0 ? forceMag : -forceMag;

    Body.applyForce(ball, pos, { x: fx, y: 0 });

    // ボールが最終エリア（ポケット付近）に来たら速度も補正
    const floorY = canvasHeight - canvasHeight * 0.12;
    if (pos.y > floorY - ballRadius * 4) {
        // X速度を目標方向に穏やかに調整
        const targetVx = dx * 0.08;
        Body.setVelocity(ball, {
            x: vel.x * 0.7 + targetVx * 0.3,
            y: vel.y,
        });
    }
}

// ============================================================
// ボール投下
// ============================================================

function dropBall(targetPocket) {
    if (state.activeBall) {
        World.remove(state.engine.world, state.activeBall);
        state.activeBall = null;
    }

    state.targetPocket  = targetPocket;
    state.guidanceActive = false;

    // 投下X位置にわずかなランダム揺らぎをつけて自然に見せる
    const startX = canvasWidth / 2 + (Math.random() - 0.5) * pegSpacingX * 0.6;
    const startY = topMargin - ballRadius - 2;

    const ball = Bodies.circle(startX, startY, ballRadius, {
        restitution: 0.4,
        friction:    0.05,
        frictionAir: 0.012,
        density:     0.003,
        render: {
            fillStyle: COLORS.ball,
            strokeStyle: COLORS.ballGlow,
            lineWidth: 2,
        },
        label: 'ball',
    });

    World.add(state.engine.world, ball);
    state.activeBall = ball;

    // 少し経ってから誘導を有効化（最初は自然落下）
    setTimeout(() => {
        state.guidanceActive = true;
    }, 400);

    // ボールの到達を検知（定期チェック）
    const floorY  = canvasHeight - canvasHeight * 0.12 + ballRadius;
    const checkInterval = setInterval(() => {
        if (!state.activeBall) {
            clearInterval(checkInterval);
            return;
        }
        if (state.activeBall.position.y >= floorY) {
            clearInterval(checkInterval);
            onBallLanded();
        }
    }, 50);

    // フェイルセーフ: 8秒経っても着地しなければ強制終了
    setTimeout(() => {
        clearInterval(checkInterval);
        if (state.isAnimating) {
            onBallLanded();
        }
    }, 8000);
}

// ============================================================
// ボール着地処理
// ============================================================

function onBallLanded() {
    if (!state.isAnimating) return;

    // ポケットラベルをハイライト
    const pocketEl = document.getElementById(`pocket-${state.targetPocket - 1}`);
    if (pocketEl) {
        pocketEl.classList.add('hit');
        setTimeout(() => pocketEl.classList.remove('hit'), 1200);
    }

    // FiveMクライアントへ配当リクエストを送信
    fetch('https://plinko/animationComplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: state.sessionToken }),
    }).catch(() => {});
}

// ============================================================
// UIコントロール初期化
// ============================================================

function initControls() {
    // 閉じるボタン
    document.getElementById('closeBtn').addEventListener('click', () => {
        fetch('https://plinko/closeUI', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        }).catch(() => {});
        hideUI();
    });

    // リスク選択
    document.querySelectorAll('.risk-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (state.isAnimating) return;
            document.querySelectorAll('.risk-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentRisk = btn.dataset.risk;
            buildPocketLabels(state.currentRows + 1, (pegSpacingX * state.currentRows) / (state.currentRows + 1));
        });
    });

    // 列数スライダー
    const slider   = document.getElementById('rowsSlider');
    const rowsVal  = document.getElementById('rowsValue');
    slider.addEventListener('input', () => {
        if (state.isAnimating) return;
        state.currentRows = parseInt(slider.value);
        rowsVal.textContent = state.currentRows;
        buildBoard();
    });

    // クイックベットボタン
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById('betAmount');
            const current = parseFloat(input.value) || 0;
            if (btn.dataset.multiplier) {
                const m = parseFloat(btn.dataset.multiplier);
                input.value = Math.max(10, Math.round(current * m));
            } else if (btn.dataset.amount) {
                input.value = parseFloat(btn.dataset.amount);
            }
        });
    });

    // ベットボタン
    document.getElementById('betBtn').addEventListener('click', placeBet);

    // Escキーで閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            fetch('https://plinko/closeUI', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            }).catch(() => {});
            hideUI();
        }
    });
}

// ============================================================
// ベット送信
// ============================================================

function placeBet() {
    if (state.isAnimating) return;

    const betVal = parseFloat(document.getElementById('betAmount').value);
    if (!betVal || betVal <= 0) {
        showError('ベット金額を入力してください');
        return;
    }

    hideError();
    hideResult();
    setUIBusy(true);

    fetch('https://plinko/placeBet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            bet:  betVal,
            rows: state.currentRows,
            risk: state.currentRisk,
        }),
    }).catch(() => {});
}

// ============================================================
// FiveM NUIメッセージリスナー
// ============================================================

window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || !data.action) return;

    switch (data.action) {

        // UIを開く
        case 'openUI':
            showUI(data);
            break;

        // UIを閉じる
        case 'closeUI':
            hideUI();
            break;

        // ベット拒否
        case 'betRejected':
            setUIBusy(false);
            const reasonMap = {
                rate_limit:         'あとでもう少し待ってください',
                session_active:     '進行中のゲームがあります',
                invalid_bet:        '無効なベット金額です',
                bet_too_low:        'ベット金額が少なすぎます',
                bet_too_high:       'ベット金額が多すぎます',
                insufficient_funds: '残高が不足しています',
                invalid_rows:       '無効な列数です',
                invalid_risk:       '無効なリスクレベルです',
            };
            showError(reasonMap[data.reason] || 'エラーが発生しました');
            break;

        // アニメーション開始（サーバーからの決定通知）
        case 'startAnimation':
            state.isAnimating   = true;
            state.sessionToken  = data.token;
            dropBall(data.targetPocket);
            break;

        // 配当結果
        case 'payoutResult':
            state.isAnimating = false;
            setUIBusy(false);
            if (data.success) {
                showResult(data.multiplier, data.payout);
            } else {
                const errMap = {
                    no_session:    'セッションが見つかりません',
                    token_mismatch:'認証エラー',
                    already_paid:  '既に配当済みです',
                    too_fast:      'アニメーションが完了していません',
                    player_offline:'プレイヤーがオフラインです',
                };
                showError(errMap[data.reason] || 'エラーが発生しました');
            }
            break;
    }
});

// ============================================================
// UI状態管理ヘルパー
// ============================================================

function showUI(data) {
    document.getElementById('app').classList.remove('hidden');
    hideError();
    hideResult();
    setUIBusy(false);
    setTimeout(initPhysics, 50);
}

function hideUI() {
    document.getElementById('app').classList.add('hidden');
    state.isAnimating  = false;
    state.sessionToken = null;
    if (state.activeBall) {
        World.remove(state.engine.world, state.activeBall);
        state.activeBall = null;
    }
}

function setUIBusy(busy) {
    document.getElementById('betBtn').disabled                    = busy;
    document.getElementById('rowsSlider').disabled                = busy;
    document.querySelectorAll('.risk-btn').forEach(b => b.disabled = busy);
    document.querySelectorAll('.quick-btn').forEach(b => b.disabled = busy);
}

function showResult(multiplier, payout) {
    const panel = document.getElementById('resultPanel');
    document.getElementById('resultMultiplier').textContent = `x${multiplier}`;
    document.getElementById('resultAmount').textContent     =
        payout > 0 ? `+$${payout.toLocaleString()}` : `$0`;
    panel.classList.remove('hidden');
}

function hideResult() {
    document.getElementById('resultPanel').classList.add('hidden');
}

function showError(msg) {
    const panel = document.getElementById('errorPanel');
    document.getElementById('errorMsg').textContent = msg;
    panel.classList.remove('hidden');
    setTimeout(() => panel.classList.add('hidden'), 4000);
}

function hideError() {
    document.getElementById('errorPanel').classList.add('hidden');
}

// ============================================================
// エントリポイント
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    initControls();
});
