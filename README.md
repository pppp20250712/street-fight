# 街頭格鬥 Street Fight

一款以 Kotlin 寫成的 Android 2D 街頭格鬥遊戲，不需要任何圖檔或音檔。
A 2D Android street-fighting game written in pure Kotlin, with no image or audio assets.

📖 **說明網站 Docs:** https://pppp20250712.github.io/street-fight/

## 特色 Features
- 兩位角色 Two fighters: **RYO 龍**（力量型 Power · 氣功彈 Ki Blast）與 **MEI 美玲**（速度型 Speed · 鳳凰連腳 Phoenix Kicks）
- 電腦對手三種難度 CPU opponent with 3 difficulty levels
- 三戰兩勝、60 秒回合、K.O.、連段、打擊停頓 Best of 3, 60-second rounds, K.O., combos, hit-stop
- 原生高解析繪製與合成音效 Native-resolution rendering and synthesized sound effects
- 觸控搖桿與按鈕，並支援鍵盤 Touch joystick + buttons, plus keyboard support

## 建置 Build
1. 用 Android Studio 開啟此資料夾 Open this folder in Android Studio
2. Sync Gradle，然後 ▶ Run（選 `app`）Sync Gradle, then ▶ Run (select `app`)

```
./gradlew assembleDebug
```

需要 Requires: Android SDK 37 · minSdk 34 (Android 14)

## 操作 Controls
| 動作 Action | 觸控 Touch | 鍵盤 Keyboard |
|---|---|---|
| 移動 Move | 左搖桿 Left joystick | ← → / A D |
| 跳 / 蹲 Jump / Crouch | 搖桿上 / 下 Joystick up / down | ↑ ↓ / W S |
| 拳 / 腳 / 必殺 Punch / Kick / Special | 右側按鈕 Right buttons | J / K / L |
| 防禦 Block | 按住後方 Hold back | 按住後方鍵 Hold back |

## 程式 Code
遊戲程式位於 Game code is in `app/src/main/java/streetfight/`；說明網站位於 the docs site is in `docs/`.
