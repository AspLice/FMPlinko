-- ============================================================
-- Plinko — サーバーサイドメインスクリプト
-- セキュリティ: 資金管理・乱数生成・倍率決定をすべてここで行う
-- ============================================================

local QBCore = exports['qb-core']:GetCoreObject()

-- ============================================================
-- セッション管理テーブル
-- activeSessions[source] = {
--   token        = string,  -- UUIDトークン
--   rows         = number,  -- 列数
--   risk         = string,  -- リスクレベル
--   bet          = number,  -- 賭け金
--   pocket       = number,  -- 決定済みポケット番号（1-indexed）
--   multiplier   = number,  -- 確定倍率
--   startedAt    = number,  -- ベット開始時刻 (os.time)
--   paid         = bool,    -- 配当が付与済みか
-- }
-- ============================================================
local activeSessions = {}

-- レートリミット用テーブル（最終ベット時刻）
local lastBetTime = {}

-- ============================================================
-- ユーティリティ関数
-- ============================================================

-- シンプルなUUID v4生成（FiveMサーバーLua環境向け）
local function generateToken()
    local template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    return string.gsub(template, '[xy]', function(c)
        local v = (c == 'x') and math.random(0, 15) or math.random(8, 11)
        return string.format('%x', v)
    end)
end

-- 入力値バリデーション
local function isValidRisk(risk)
    for _, v in ipairs(Config.ValidRisks) do
        if v == risk then return true end
    end
    return false
end

local function isValidRows(rows)
    for _, v in ipairs(Config.ValidRows) do
        if v == rows then return true end
    end
    return false
end

-- 重み付き乱数でポケット番号を決定（1-indexed）
local function decideTargetPocket(rows)
    local weightData   = Config.Weights[rows]
    local roll         = math.random(1, weightData.total)
    local cumulative   = weightData.cumulative
    for i, cumW in ipairs(cumulative) do
        if roll <= cumW then
            return i  -- 1-indexed ポケット番号
        end
    end
    -- フォールバック（到達しない想定）
    return #cumulative
end

-- プレイヤーの通知送信
local function notifyPlayer(source, msg, msgType)
    TriggerClientEvent('QBCore:Notify', source, msg, msgType, 5000)
end

-- ============================================================
-- イベント: plinko:placeBet
-- クライアントからのベットリクエストを受け取る
-- ============================================================
RegisterNetEvent('plinko:placeBet', function(data)
    local source = source  -- 必ずサーバー側のsourceを使用

    -- ---- レートリミットチェック ----
    local now = os.time()
    if lastBetTime[source] and (now - lastBetTime[source]) < 5 then
        notifyPlayer(source, '操作が早すぎます。少し待ってください。', 'error')
        TriggerClientEvent('plinko:betRejected', source, 'rate_limit')
        return
    end

    -- ---- 既存セッションチェック（二重ベット防止） ----
    if activeSessions[source] then
        notifyPlayer(source, '進行中のゲームがあります。', 'error')
        TriggerClientEvent('plinko:betRejected', source, 'session_active')
        return
    end

    -- ---- 入力データバリデーション ----
    if type(data) ~= 'table' then
        TriggerClientEvent('plinko:betRejected', source, 'invalid_data')
        return
    end

    local bet  = tonumber(data.bet)
    local rows = tonumber(data.rows)
    local risk = tostring(data.risk or '')

    if not bet or bet <= 0 then
        TriggerClientEvent('plinko:betRejected', source, 'invalid_bet')
        return
    end

    if bet < Config.MinBet then
        notifyPlayer(source, ('最低賭け額は $%s です。'):format(Config.MinBet), 'error')
        TriggerClientEvent('plinko:betRejected', source, 'bet_too_low')
        return
    end

    if bet > Config.MaxBet then
        notifyPlayer(source, ('最大賭け額は $%s です。'):format(Config.MaxBet), 'error')
        TriggerClientEvent('plinko:betRejected', source, 'bet_too_high')
        return
    end

    if not isValidRows(rows) then
        TriggerClientEvent('plinko:betRejected', source, 'invalid_rows')
        return
    end

    if not isValidRisk(risk) then
        TriggerClientEvent('plinko:betRejected', source, 'invalid_risk')
        return
    end

    -- ---- QBCoreプレイヤー取得 ----
    local Player = QBCore.Functions.GetPlayer(source)
    if not Player then
        TriggerClientEvent('plinko:betRejected', source, 'player_not_found')
        return
    end

    -- ---- 残高チェック ----
    local currentMoney = Player.PlayerData.money[Config.MoneyType]
    if not currentMoney or currentMoney < bet then
        notifyPlayer(source, '残高が不足しています。', 'error')
        TriggerClientEvent('plinko:betRejected', source, 'insufficient_funds')
        return
    end

    -- ---- 資金消費（ここでベット金額を引く） ----
    Player.Functions.RemoveMoney(Config.MoneyType, bet, 'plinko-bet')

    -- ---- サーバー側でポケット決定 ----
    math.randomseed(os.clock() * 100000 + source)  -- ソースIDを絡めて予測困難に
    local targetPocket = decideTargetPocket(rows)
    local oddsTable    = Config.Odds[risk][rows]
    local multiplier   = oddsTable[targetPocket]
    local payout       = math.floor(bet * multiplier)

    -- ---- セッション登録 ----
    local token = generateToken()
    lastBetTime[source] = now
    activeSessions[source] = {
        token      = token,
        rows       = rows,
        risk       = risk,
        bet        = bet,
        pocket     = targetPocket,
        multiplier = multiplier,
        payout     = payout,
        startedAt  = now,
        paid       = false,
    }

    print(('[Plinko] Player %s | Bet: $%s | Rows: %s | Risk: %s | Pocket: %s | Multiplier: x%s | Payout: $%s'):format(
        source, bet, rows, risk, targetPocket, multiplier, payout
    ))

    -- ---- クライアントへ結果を送信（アニメーション用） ----
    -- 注意: payoutやmultiplierは配当付与後に別途通知する（改ざん防止）
    TriggerClientEvent('plinko:startAnimation', source, {
        token        = token,
        targetPocket = targetPocket,  -- 1-indexed
        rows         = rows,
        risk         = risk,
    })
end)

-- ============================================================
-- イベント: plinko:claimPayout
-- アニメーション終了後にクライアントから配当リクエストを受け取る
-- ============================================================
RegisterNetEvent('plinko:claimPayout', function(token)
    local source  = source

    -- ---- セッション存在チェック ----
    local session = activeSessions[source]
    if not session then
        -- セッションが存在しない = 不正リクエストの可能性
        print(('[Plinko][SECURITY] Player %s: claimPayout without active session.'):format(source))
        TriggerClientEvent('plinko:payoutResult', source, { success = false, reason = 'no_session' })
        return
    end

    -- ---- トークン検証 ----
    if session.token ~= tostring(token or '') then
        print(('[Plinko][SECURITY] Player %s: Token mismatch! Expected: %s Got: %s'):format(
            source, session.token, tostring(token)
        ))
        activeSessions[source] = nil
        TriggerClientEvent('plinko:payoutResult', source, { success = false, reason = 'token_mismatch' })
        return
    end

    -- ---- 二重配当防止 ----
    if session.paid then
        print(('[Plinko][SECURITY] Player %s: Attempted double payout.'):format(source))
        activeSessions[source] = nil
        TriggerClientEvent('plinko:payoutResult', source, { success = false, reason = 'already_paid' })
        return
    end

    -- ---- クールダウンチェック（アニメーション時間の最低50%が経過しているか） ----
    local elapsed = (os.time() - session.startedAt) * 1000  -- ms換算
    local minDuration = Config.AnimationDuration * 0.5
    if elapsed < minDuration then
        print(('[Plinko][SECURITY] Player %s: Payout too fast. Elapsed: %dms, Min: %dms'):format(
            source, elapsed, minDuration
        ))
        activeSessions[source] = nil
        TriggerClientEvent('plinko:payoutResult', source, { success = false, reason = 'too_fast' })
        return
    end

    -- ---- 配当付与 ----
    session.paid = true

    local Player = QBCore.Functions.GetPlayer(source)
    if not Player then
        activeSessions[source] = nil
        TriggerClientEvent('plinko:payoutResult', source, { success = false, reason = 'player_offline' })
        return
    end

    if session.payout > 0 then
        Player.Functions.AddMoney(Config.MoneyType, session.payout, 'plinko-payout')
        print(('[Plinko] Payout granted | Player: %s | Amount: $%s | Multiplier: x%s'):format(
            source, session.payout, session.multiplier
        ))
    end

    -- ---- セッション破棄 ----
    local resultData = {
        success    = true,
        payout     = session.payout,
        multiplier = session.multiplier,
        pocket     = session.pocket,
        bet        = session.bet,
    }
    activeSessions[source] = nil

    TriggerClientEvent('plinko:payoutResult', source, resultData)
end)

-- ============================================================
-- イベント: plinko:cancelSession
-- プレイヤーがゲーム中に切断した場合や強制キャンセル
-- ============================================================
RegisterNetEvent('plinko:cancelSession', function()
    local source = source
    if activeSessions[source] then
        print(('[Plinko] Session cancelled for player %s'):format(source))
        activeSessions[source] = nil
    end
end)

-- プレイヤー切断時にセッションをクリーンアップ
AddEventHandler('playerDropped', function(reason)
    local source = source
    if activeSessions[source] then
        print(('[Plinko] Cleaning up session for dropped player %s (%s)'):format(source, reason))
        activeSessions[source] = nil
    end
    lastBetTime[source] = nil
end)

print('[Plinko] Server script loaded.')
