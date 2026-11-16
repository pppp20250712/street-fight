# 🥊 Street Fight: Hyper Clash | 街頭對決·霸王再現

經典 2D 街機格鬥遊戲 (Classic 2D Arcade Fighting Game)，採用使用者提供的兩組真實角色動作精靈圖 (Sprite Sheets) 動態切割與即時去背渲染技術打造。

---

## 🌐 線上體驗與雙版本試玩 (Live Demo & Versions)

- 📖 **說明網站 Docs**: [https://pppp20250712.github.io/street-fight/](https://pppp20250712.github.io/street-fight/)

- 🌟 **3D 高畫質版試玩 Play 3D HD**: [https://pppp20250712.github.io/street-fight/play/](https://pppp20250712.github.io/street-fight/play/)
- (WebGL2 3D 著色器模型、即時陰影、霓虹光影與 4x MSAA)

- 🥊 **2D 復古街機版試玩 Play 2D Arcade**: [https://pppp20250712.github.io/street-fight/play2d/](https://pppp20250712.github.io/street-fight/play2d/)
- (經典街機雙人與神拳·晉/飛鳳·麗華精靈圖對決)

---

## 📸 角色精靈圖整合 (Sprite Sheet Integration)

本遊戲直接採用您上傳的兩張格鬥角色動作精靈圖表：
1. **飛鳳·麗華 (Li-Hua)**：紅旗袍雙包頭武術少女 (Chun-Li 風格動作精靈圖)
   - 包含：飛踢、迴旋踢、寸勁直拳、閃避後撤、百裂腳連續踢擊等完整動作。
2. **神拳·晉 (Jin)**：黑背心道服空手道大師 (Ryu 風格動作精靈圖)
   - 包含：蓄力前衝拳、勾拳、正拳突刺、蹲姿防禦、跳躍滯空昇龍等完整動作。

> **即時去背技術 (Chroma-Key Engine)**：遊戲載入精靈圖時，透過離線 Canvas 演算法自動將白底轉為透明度，並消除邊界格線，使角色能完美融合在夕陽道場舞台中！

---

## 🎮 遊戲模式 (Game Modes)

1. **街機闘關模式 (ARCADE MODE)**：
   - 挑戰由智慧 AI 驅動的格鬥對手，包含智能立回走位、跳躍對空昇龍迎擊、防禦反擊與終極必殺技！
2. **雙人對決模式 (VERSUS MODE - 2P LOCAL)**：
   - 單台電腦/設備支援兩位玩家同屏格鬥對決！
3. **道場練習模式 (TRAINING DOJO)**：
   - 提供連段計數器 (Combo Counter)、傷害計算與招式練習。

---

## 🕹️ 操作控制 (Controls)

### 鍵盤操作 (Keyboard - Player 1)
| 動作 | 鍵盤按鍵 | 招式說明 |
| :--- | :--- | :--- |
| **移動 / 蹲下** | `A` (後退防禦) / `D` (前進) / `S` (蹲下) | 基本立回走位，向後走可**自動格擋防禦** |
| **跳躍** | `W` | 滯空可配合空中出招 |
| **輕拳 (LP)** | `J` | 出招極快，適合破招與牽制 |
| **重拳 (HP)** | `K` | 剛猛直拳突刺，擊中造成高硬直 |
| **踢擊 (KICK)** | `U` | 遠距離強擊踢腿 |
| **必殺技 1 (SP1)** | `I` | **波動拳 (HADOUKEN)** / **百裂腳 (LIGHTNING KICKS)** |
| **必殺技 2 (SP2)** | `O` | **昇龍拳 (SHORYUKEN)** / **旋風飛腿 (WHIRLWIND)** |
| **超必殺技 (MAX)** | `Space (空白鍵)` | 能量條滿 100% 時施展全螢幕毀滅奧義！ |

### 鍵盤操作 (Player 2 - 雙人模式)
- 移動：方向鍵 `↑` `↓` `←` `→`
- 攻擊：小鍵盤數字鍵 `1` (輕拳), `2` (重拳), `4` (踢擊), `5` (必殺1), `6` (必殺2), `Enter/0` (超必殺)

### 手機 / Android 虛擬觸控 (Virtual Arcade Touch Controls)
- 左側：4 方向街機十字方向鍵 (上跳、下蹲、左進、右退)
- 右側：經典 6 鍵式街機按鈕 (`LP`, `HP`, `KICK`, `SP1`, `SP2`, `MAX`)
- 支援 Android 震動回饋 (Haptic Feedback)

---

## 🚀 本地快速啟動與遊玩 (Play in Browser)

在專案目錄下執行內建 Node.js 伺服器：
```bash
node server.js
```
然後在瀏覽器打開：
👉 **http://localhost:3000**

---

## 📱 Android 原生專案結構 (Android Studio Ready)

位於 `android/` 目錄中，具備完整的 Android Studio Gradle 專案：
- **Application ID**: `com.hkaiSolveAcadcmy.vibeCoding.patrickpak`
- `AndroidManifest.xml`：橫螢幕鎖定 (`sensorLandscape`)、硬體加速、全螢幕沉浸模式。
- `MainActivity.java`：內建高速硬體加速 WebView 與 Android 原生打擊震動橋接 (`AndroidApp.vibrate`)。
- `assets/www/`：已完整打包 HTML、CSS、JS 與精靈圖資源，可直接在 Android Studio 中點選 **Run** 或執行 `./gradlew assembleRelease` 產出 APK。

---

## 📂 專案結構 (Project Structure)

- `index.html` / `css/` / `js/` / `assets/` — 2D 網頁版遊戲原始碼
- `play/` — 瀏覽器可玩版本 (自含式)
- `docs/` — GitHub Pages 網站 (說明文件 + 瀏覽器試玩)
- `android/` — Android Studio Gradle 專案
- `security_check.py` — 自動化安全性與零登入審查腳本

---

## 🛡️ 安全性與隱私保障 (Security & Privacy Audit)

本專案經過嚴格安全性稽核，保證：
- 🔒 **無須登入 (Zero-Login)**：網頁端與 Android 原生端完全無須任何帳號、密碼或註冊機制，開啟即可直接遊玩。
- 🚫 **零憑證與密碼 (Zero Credentials / Passwords)**：全專案原始碼絕無包含任何帳號 ID、密碼、資料庫連線、API Token 或私鑰。
- ⚡ **自動化安全審查 (Automated Security CI)**：專案內建 `security_check.py` 並配置 GitHub Actions CI 工作流程，每次推送均自動掃描，確保 100% 隱私與安全。
