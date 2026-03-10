-- FiveM リソースマニフェスト
fx_version 'cerulean'
game 'gta5'

name        'plinko'
description 'QBCore Plinko カジノゲーム — サーバーサイド決定型セキュアアーキテクチャ'
author      'FSC'
version     '1.0.0'

-- 共有設定ファイル（クライアント・サーバー両方で読み込み）
shared_scripts {
    'config.lua',
}

-- サーバースクリプト
server_scripts {
    'server/main.lua',
}

-- クライアントスクリプト
client_scripts {
    'client/main.lua',
}

-- NUI HTMLファイル
ui_page 'html/index.html'

-- NUIリソースとして登録するファイル群
files {
    'html/index.html',
    'html/style.css',
    'html/script.js',
}

-- QBCoreへの依存を宣言
dependencies {
    'qb-core',
}
