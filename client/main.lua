-- ============================================================
-- Plinko — クライアントサイドメインスクリプト
-- NUIの開閉制御とサーバー間イベント中継を担当
-- ============================================================

local QBCore   = exports['qb-core']:GetCoreObject()
local nuiOpen  = false

-- ============================================================
-- NUI開閉ユーティリティ
-- ============================================================

local function openUI()
    if nuiOpen then return end
    nuiOpen = true
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'openUI',
        minBet = Config.MinBet,
        maxBet = Config.MaxBet,
    })
end

local function closeUI()
    if not nuiOpen then return end
    nuiOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'closeUI' })
end

-- ============================================================
-- コマンド登録（/plinko でUIを開く）
-- ============================================================
RegisterCommand(Config.Command, function()
    if nuiOpen then
        closeUI()
    else
        openUI()
    end
end, false)

-- ============================================================
-- NUIコールバック: UIを閉じる
-- ============================================================
RegisterNUICallback('closeUI', function(data, cb)
    closeUI()
    cb({ ok = true })
end)

-- ============================================================
-- NUIコールバック: ベット実行
-- JSからのベット情報をサーバーへ中継する
-- ============================================================
RegisterNUICallback('placeBet', function(data, cb)
    TriggerServerEvent('plinko:placeBet', {
        bet  = tonumber(data.bet),
        rows = tonumber(data.rows),
        risk = tostring(data.risk),
    })
    cb({ ok = true })
end)

-- ============================================================
-- NUIコールバック: アニメーション完了 → 配当リクエスト
-- JSからトークンを受け取り、サーバーへ配当請求を中継する
-- ============================================================
RegisterNUICallback('animationComplete', function(data, cb)
    TriggerServerEvent('plinko:claimPayout', tostring(data.token or ''))
    cb({ ok = true })
end)

-- ============================================================
-- サーバーイベント受信: ベット拒否
-- ============================================================
RegisterNetEvent('plinko:betRejected', function(reason)
    SendNUIMessage({
        action = 'betRejected',
        reason = reason,
    })
end)

-- ============================================================
-- サーバーイベント受信: アニメーション開始指示
-- サーバーが決定した最終ポケット番号をNUIへ伝える
-- ============================================================
RegisterNetEvent('plinko:startAnimation', function(data)
    SendNUIMessage({
        action       = 'startAnimation',
        token        = data.token,
        targetPocket = data.targetPocket,
        rows         = data.rows,
        risk         = data.risk,
    })
end)

-- ============================================================
-- サーバーイベント受信: 配当結果
-- 配当金額・倍率をNUIに表示する
-- ============================================================
RegisterNetEvent('plinko:payoutResult', function(result)
    SendNUIMessage({
        action     = 'payoutResult',
        success    = result.success,
        payout     = result.payout,
        multiplier = result.multiplier,
        pocket     = result.pocket,
        bet        = result.bet,
        reason     = result.reason,
    })
end)

-- ============================================================
-- リソース停止時のクリーンアップ
-- ============================================================
AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        if nuiOpen then
            SetNuiFocus(false, false)
        end
        TriggerServerEvent('plinko:cancelSession')
    end
end)

print('[Plinko] Client script loaded. Use /' .. Config.Command .. ' to open.')
