/**
 * Street Fight: Hyper Clash - i18n Localization Engine
 * English + 10 Asian Languages:
 * 1. en: English
 * 2. zh-Hant: 繁體中文 (Traditional Chinese)
 * 3. zh-Hans: 简体中文 (Simplified Chinese)
 * 4. ja: 日本語 (Japanese)
 * 5. ko: 한국어 (Korean)
 * 6. th: ไทย (Thai)
 * 7. vi: Tiếng Việt (Vietnamese)
 * 8. id: Bahasa Indonesia (Indonesian)
 * 9. ms: Bahasa Melayu (Malay)
 * 10. fil: Filipino / Tagalog (Philippines)
 * 11. hi: हिन्दी (Hindi)
 */

const I18N_DATA = {
    'en': {
        name: 'English',
        flag: '🇬🇧',
        tagline: 'RETRO 2D ARCADE FIGHTING',
        titleMain: 'STREET FIGHT',
        titleSub: 'HYPER CLASH',
        btnArcade: '🥊 ARCADE MODE',
        btnVersus: '⚔️ 2P VERSUS MODE',
        btnTraining: '🥋 TRAINING DOJO',
        btnDocs: '📖 GAME MANUAL / DOCS',
        controlsBar: 'Controls: WASD Move/Jump/Crouch | J/K Punch | U Kick | I/O Special | Space Super MAX',
        charSelectTitle: 'SELECT YOUR FIGHTER',
        jinName: 'JIN (God Hand)',
        jinStyle: 'Kyokushin Karate / Ki Strike',
        jinMoves: [
            '• Light / Heavy Punch (J / K)',
            '• HADOUKEN Ki Blast (I / SP1)',
            '• SHORYUKEN Dragon Uppercut (O / SP2)',
            '• SHINKU HADOUKEN Super (Space)'
        ],
        lihuaName: 'LI-HUA (Flying Phoenix)',
        lihuaStyle: 'Shaolin Kicks / Agile Kempo',
        lihuaMoves: [
            '• Combo Punch / Kick (K / U)',
            '• LIGHTNING KICKS Rapid Kick (I / SP1)',
            '• WHIRLWIND Spin Kick (O / SP2)',
            '• SENRETSUKYAKU Super (Space)'
        ],
        btnBattleStart: '🔥 BATTLE START',
        p1Select: 'P1: ',
        cpuSelect: 'CPU: ',
        vsP2Select: 'P2: ',
        superGauge: 'P1 SUPER GAUGE',
        loading: 'LOADING FIGHT DATA & SOUNDS...',
        rematch: '🔄 REMATCH',
        returnMenu: '🏠 MAIN MENU',
        winnerSuffix: ' WINS VICTORY!',
        drawText: 'DRAW GAME',
        sp1LabelJin: 'HADOUKEN',
        sp2LabelJin: 'SHORYUKEN',
        sp1LabelLi: 'RAPID KICK',
        sp2LabelLi: 'WHIRLWIND',
        btnMax: 'MAX'
    },
    'zh-Hant': {
        name: '繁體中文',
        flag: '🇹🇼/🇭🇰',
        tagline: '經典 2D 街機格鬥再現',
        titleMain: '街頭對決',
        titleSub: '霸王再現 · HYPER CLASH',
        btnArcade: '🥊 街機單人模式 ARCADE',
        btnVersus: '⚔️ 雙人對戰模式 VERSUS',
        btnTraining: '🥋 道場練習模式 TRAINING',
        btnDocs: '📖 說明網站 DOCS',
        controlsBar: '操作：WASD 移動/跳躍/蹲下 | J/K 拳 | U 踢 | I/O 必殺技 | Space 終極超必殺',
        charSelectTitle: '格鬥家選擇 SELECT FIGHTER',
        jinName: 'JIN (神拳·晉)',
        jinStyle: '極限流空手道 / 剛猛拳法',
        jinMoves: [
            '• 輕拳/重拳 (J / K)',
            '• 氣功波 HADOUKEN (I / SP1)',
            '• 昇龍拳 SHORYUKEN (O / SP2)',
            '• 真空氣功連打 SHINKU HADOUKEN (Space)'
        ],
        lihuaName: 'LI-HUA (飛鳳·麗華)',
        lihuaStyle: '少林腿法 / 迅捷格鬥術',
        lihuaMoves: [
            '• 連環重拳/踢擊 (K / U)',
            '• 百裂腳 LIGHTNING KICKS (I / SP1)',
            '• 旋風飛腿 WHIRLWIND (O / SP2)',
            '• 千裂烈風霸 SENRETSUKYAKU (Space)'
        ],
        btnBattleStart: '🔥 進入對決 BATTLE START',
        p1Select: 'P1: ',
        cpuSelect: '電腦: ',
        vsP2Select: 'P2: ',
        superGauge: 'P1 SUPER GAUGE 能量條',
        loading: '載入精靈圖形與音效中 LOADING FIGHT DATA...',
        rematch: '🔄 重新對決 REMATCH',
        returnMenu: '🏠 返回主選單 RETURN',
        winnerSuffix: ' 獲勝 VICTORY!',
        drawText: '平手 DRAW GAME',
        sp1LabelJin: '波動拳',
        sp2LabelJin: '昇龍拳',
        sp1LabelLi: '百裂腳',
        sp2LabelLi: '旋風飛腿',
        btnMax: '大絕招'
    },
    'zh-Hans': {
        name: '简体中文',
        flag: '🇨🇳',
        tagline: '经典 2D 街机格斗重现',
        titleMain: '街头对决',
        titleSub: '霸王再现 · HYPER CLASH',
        btnArcade: '🥊 街机单人模式 ARCADE',
        btnVersus: '⚔️ 双人对战模式 VERSUS',
        btnTraining: '🥋 道场练习模式 TRAINING',
        btnDocs: '📖 说明网站 DOCS',
        controlsBar: '操作：WASD 移动/跳跃/蹲下 | J/K 拳 | U 踢 | I/O 必杀技 | Space 终极超必杀',
        charSelectTitle: '格斗家选择 SELECT FIGHTER',
        jinName: 'JIN (神拳·晋)',
        jinStyle: '极限流空手道 / 刚猛拳法',
        jinMoves: [
            '• 轻拳/重拳 (J / K)',
            '• 气功波 HADOUKEN (I / SP1)',
            '• 升龙拳 SHORYUKEN (O / SP2)',
            '• 真空气功连打 SHINKU HADOUKEN (Space)'
        ],
        lihuaName: 'LI-HUA (飞凤·丽华)',
        lihuaStyle: '少林腿法 / 迅捷格斗术',
        lihuaMoves: [
            '• 连环重拳/踢击 (K / U)',
            '• 百裂脚 LIGHTNING KICKS (I / SP1)',
            '• 旋风飞腿 WHIRLWIND (O / SP2)',
            '• 千裂烈风霸 SENRETSUKYAKU (Space)'
        ],
        btnBattleStart: '🔥 进入对决 BATTLE START',
        p1Select: 'P1: ',
        cpuSelect: '电脑: ',
        vsP2Select: 'P2: ',
        superGauge: 'P1 SUPER GAUGE 能量条',
        loading: '载入精灵图形与音效中 LOADING FIGHT DATA...',
        rematch: '🔄 重新对决 REMATCH',
        returnMenu: '🏠 返回主菜单 RETURN',
        winnerSuffix: ' 获胜 VICTORY!',
        drawText: '平局 DRAW GAME',
        sp1LabelJin: '波动拳',
        sp2LabelJin: '升龙拳',
        sp1LabelLi: '百裂脚',
        sp2LabelLi: '旋风飞腿',
        btnMax: '大绝招'
    },
    'ja': {
        name: '日本語',
        flag: '🇯🇵',
        tagline: 'レトロ 2D アーケード対戦格闘',
        titleMain: 'STREET FIGHT',
        titleSub: 'ハイパークラッシュ · 激闘',
        btnArcade: '🥊 アーケードモード ARCADE',
        btnVersus: '⚔️ 2人対戦モード VERSUS',
        btnTraining: '🥋 道場トレーニング TRAINING',
        btnDocs: '📖 マニュアル / 公式解説 DOCS',
        controlsBar: '操作：WASD 移動/ジャンプ/しゃがみ | J/K パンチ | U キック | I/O 必殺技 | Space 超必殺奥義',
        charSelectTitle: 'ファイター選択 SELECT FIGHTER',
        jinName: 'JIN（神拳・ジン）',
        jinStyle: '極限流空手 / 剛拳',
        jinMoves: [
            '• 弱/強パンチ (J / K)',
            '• 波動拳 HADOUKEN (I / SP1)',
            '• 昇龍拳 SHORYUKEN (O / SP2)',
            '• 真空波動拳 SHINKU HADOUKEN (Space)'
        ],
        lihuaName: 'LI-HUA（飛鳳・麗華）',
        lihuaStyle: '少林百裂脚 / 俊敏拳法',
        lihuaMoves: [
            '• 連打パンチ/キック (K / U)',
            '• 百裂脚 LIGHTNING KICKS (I / SP1)',
            '• 旋風飛腿 WHIRLWIND (O / SP2)',
            '• 千裂烈風覇 SENRETSUKYAKU (Space)'
        ],
        btnBattleStart: '🔥 対戦開始 BATTLE START',
        p1Select: 'P1: ',
        cpuSelect: 'CPU: ',
        vsP2Select: 'P2: ',
        superGauge: 'P1 SUPER ゲージ',
        loading: 'キャラ画像・サウンド読込中 LOADING...',
        rematch: '🔄 再戦 REMATCH',
        returnMenu: '🏠 タイトルへ戻る MENU',
        winnerSuffix: ' の勝利 VICTORY!',
        drawText: '引き分け DRAW',
        sp1LabelJin: '波動拳',
        sp2LabelJin: '昇龍拳',
        sp1LabelLi: '百裂脚',
        sp2LabelLi: '旋風脚',
        btnMax: '超奥義'
    },
    'ko': {
        name: '한국어',
        flag: '🇰🇷',
        tagline: '레트로 2D 아케이드 격투 액션',
        titleMain: 'STREET FIGHT',
        titleSub: '하이퍼 클래시 · 격투의 패왕',
        btnArcade: '🥊 아케이드 싱글 모드 ARCADE',
        btnVersus: '⚔️ 2인 대전 모드 VERSUS',
        btnTraining: '🥋 도장 연습 모드 TRAINING',
        btnDocs: '📖 매뉴얼 / 가이드 DOCS',
        controlsBar: '조작: WASD 이동/점프/앉기 | J/K 펀치 | U 킥 | I/O 필살기 | Space 초필살기',
        charSelectTitle: '파이터 선택 SELECT FIGHTER',
        jinName: 'JIN (신권·진)',
        jinStyle: '극한류 가라테 / 강맹 권법',
        jinMoves: [
            '• 라이트 / 헤비 펀치 (J / K)',
            '• 파동권 HADOUKEN (I / SP1)',
            '• 승룡권 SHORYUKEN (O / SP2)',
            '• 진공파동권 SHINKU HADOUKEN (Space)'
        ],
        lihuaName: 'LI-HUA (비봉·여화)',
        lihuaStyle: '소림 각법 / 질풍 권법',
        lihuaMoves: [
            '• 연속 펀치/킥 (K / U)',
            '• 백열각 LIGHTNING KICKS (I / SP1)',
            '• 선풍비퇴 WHIRLWIND (O / SP2)',
            '• 천열열풍패 SENRETSUKYAKU (Space)'
        ],
        btnBattleStart: '🔥 대전 시작 BATTLE START',
        p1Select: 'P1: ',
        cpuSelect: '컴퓨터: ',
        vsP2Select: 'P2: ',
        superGauge: 'P1 SUPER 게이지',
        loading: '스프라이트 및 사운드 로딩 중...',
        rematch: '🔄 재대결 REMATCH',
        returnMenu: '🏠 메인 메뉴로 RETURN',
        winnerSuffix: ' 승리 VICTORY!',
        drawText: '무승부 DRAW',
        sp1LabelJin: '파동권',
        sp2LabelJin: '승룡권',
        sp1LabelLi: '백열각',
        sp2LabelLi: '선풍각',
        btnMax: '초필살'
    },
    'th': {
        name: 'ไทย',
        flag: '🇹🇭',
        tagline: 'เกมต่อสู้อาร์เคด 2D สุดคลาสสิก',
        titleMain: 'STREET FIGHT',
        titleSub: 'ไฮเปอร์แคลช · ศึกจ้าวนักสู้',
        btnArcade: '🥊 โหมดอาร์เคด ARCADE',
        btnVersus: '⚔️ โหมดต่อสู้ 2 คน VERSUS',
        btnTraining: '🥋 โหมดฝึกซ้อม TRAINING',
        btnDocs: '📖 คู่มือเกม DOCS',
        controlsBar: 'การควบคุม: WASD เดิน/กระโดด/หมอบ | J/K ชก | U เตะ | I/O ท่าไม้ตาย | Space อัลติเมท',
        charSelectTitle: 'เลือกนักสู้ SELECT FIGHTER',
        jinName: 'JIN (หมัดเทพ จิน)',
        jinStyle: 'คาราเต้สายพลัง / หมัดพลังคลื่น',
        jinMoves: [
            '• ชกเบา / ชกหนัก (J / K)',
            '• พลังคลื่น HADOUKEN (I / SP1)',
            '• หมัดมังกรผงาด SHORYUKEN (O / SP2)',
            '• คลื่นสุญญากาศ SHINKU HADOUKEN (Space)'
        ],
        lihuaName: 'LI-HUA (หงส์เหิน ลี่ฮัว)',
        lihuaStyle: 'เพลงเตะเส้าหลิน / กังฟูความเร็วสูง',
        lihuaMoves: [
            '• ชกต่อเนื่อง/ลูกเตะหนัก (K / U)',
            '• เพลงเตะรัวร้อยเท้า LIGHTNING KICKS (I / SP1)',
            '• เตะกงจักรวายุ WHIRLWIND (O / SP2)',
            '• เพลงเตะวายุสังหาร SENRETSUKYAKU (Space)'
        ],
        btnBattleStart: '🔥 เริ่มการต่อสู้ BATTLE START',
        p1Select: 'P1: ',
        cpuSelect: 'คอม: ',
        vsP2Select: 'P2: ',
        superGauge: 'P1 เกจพลังอัลติเมท',
        loading: 'กำลังโหลดข้อมูลและเสียง...',
        rematch: '🔄 สู้ใหม่อีกครั้ง REMATCH',
        returnMenu: '🏠 เมนูหลัก RETURN',
        winnerSuffix: ' ชนะการต่อสู้ VICTORY!',
        drawText: 'เสมอ DRAW GAME',
        sp1LabelJin: 'คลื่นพลัง',
        sp2LabelJin: 'หมัดมังกร',
        sp1LabelLi: 'เตะรัว',
        sp2LabelLi: 'เตะหมุน',
        btnMax: 'อัลติเมท'
    },
    'vi': {
        name: 'Tiếng Việt',
        flag: '🇻🇳',
        tagline: 'GAME ĐỐI KHÁNG ARCADE 2D KINH ĐIỂN',
        titleMain: 'STREET FIGHT',
        titleSub: 'HYPER CLASH · ĐẠI CHIẾN',
        btnArcade: '🥊 CHẾ ĐỘ ARCADE ĐƠN',
        btnVersus: '⚔️ ĐỐI ĐẦU 2 NGƯỜI VERSUS',
        btnTraining: '🥋 LUYỆN TẬP VÕ ĐƯỜNG',
        btnDocs: '📖 HƯỚNG DẪN & TÀI LIỆU',
        controlsBar: 'Điều khiển: WASD Di chuyển/Nhảy/Ngồi | J/K Đấm | U Đá | I/O Tuyệt chiêu | Space Siêu tất sát MAX',
        charSelectTitle: 'CHỌN ĐẤU SĨ CỦA BẠN',
        jinName: 'JIN (Thần Quyền Jin)',
        jinStyle: 'Karate Cực Hạn / Quyền Lực Khí Công',
        jinMoves: [
            '• Đấm nhanh / Đấm mạnh (J / K)',
            '• Hỏa Cầu Khí HADOUKEN (I / SP1)',
            '• Thăng Long Quyền SHORYUKEN (O / SP2)',
            '• Chân Không Khí Công Ba SHINKU (Space)'
        ],
        lihuaName: 'LI-HUA (Phi Phượng Lệ Hoa)',
        lihuaStyle: 'Cước Pháp Thiếu Lâm / Nhanh Nhẹn',
        lihuaMoves: [
            '• Đấm liên hoàn / Đá mạnh (K / U)',
            '• Bách Liệt Cước LIGHTNING KICKS (I / SP1)',
            '• Toàn Phong Phi Cước WHIRLWIND (O / SP2)',
            '• Thiên Liệt Liệt Phong Bá (Space)'
        ],
        btnBattleStart: '🔥 BẮT ĐẦU TRẬN ĐẤU',
        p1Select: 'P1: ',
        cpuSelect: 'MÁY: ',
        vsP2Select: 'P2: ',
        superGauge: 'P1 THANH NĂNG LƯỢNG SIÊU CẤP',
        loading: 'ĐANG TẢI DỮ LIỆU ĐẤU SĨ...',
        rematch: '🔄 ĐẤU LẠI REMATCH',
        returnMenu: '🏠 MENU CHÍNH RETURN',
        winnerSuffix: ' CHIẾN THẮNG VICTORY!',
        drawText: 'HÒA DRAW GAME',
        sp1LabelJin: 'KHÍ CÔNG',
        sp2LabelJin: 'THĂNG LONG',
        sp1LabelLi: 'BÁCH LIỆT',
        sp2LabelLi: 'TOÀN PHONG',
        btnMax: 'TẤT SÁT'
    },
    'id': {
        name: 'Bahasa Indonesia',
        flag: '🇮🇩',
        tagline: 'GAME PERTARUNGAN ARCADE 2D RETRO',
        titleMain: 'STREET FIGHT',
        titleSub: 'HYPER CLASH · PERTARUNGAN PENDEKAR',
        btnArcade: '🥊 MODE ARCADE TUNGGAL',
        btnVersus: '⚔️ MODE TANDING 2P VERSUS',
        btnTraining: '🥋 LATIHAN DOJO',
        btnDocs: '📖 BUKU PANDUAN & DOCS',
        controlsBar: 'Kontrol: WASD Gerak/Lompat/Jongkok | J/K Pukul | U Tendang | I/O Jurus Spesial | Spasi Jurus Pamungkas MAX',
        charSelectTitle: 'PILIH PENDEKAR ANDA',
        jinName: 'JIN (Tangan Dewa Jin)',
        jinStyle: 'Karate Kyokushin / Pukulan Hawa Murni',
        jinMoves: [
            '• Pukulan Cepat / Keras (J / K)',
            '• Bola Energi HADOUKEN (I / SP1)',
            '• Pukulan Naga Naik SHORYUKEN (O / SP2)',
            '• Shinku Hadouken Pamungkas (Spasi)'
        ],
        lihuaName: 'LI-HUA (Phoenix Terbang)',
        lihuaStyle: 'Tendangan Shaolin / Gerak Cepat',
        lihuaMoves: [
            '• Kombo Pukulan / Tendangan (K / U)',
            '• Tendangan Kilat LIGHTNING KICKS (I / SP1)',
            '• Tendangan Putar Badai WHIRLWIND (O / SP2)',
            '• Senretsukyaku Badai Pamungkas (Spasi)'
        ],
        btnBattleStart: '🔥 MULAI PERTARUNGAN',
        p1Select: 'P1: ',
        cpuSelect: 'KOMPUTER: ',
        vsP2Select: 'P2: ',
        superGauge: 'P1 BAR ENERGI SUPER',
        loading: 'MEMUAT DATA & SUARA GAME...',
        rematch: '🔄 TANDING ULANG REMATCH',
        returnMenu: '🏠 MENU UTAMA RETURN',
        winnerSuffix: ' MENANG VICTORY!',
        drawText: 'SERI DRAW GAME',
        sp1LabelJin: 'HADOUKEN',
        sp2LabelJin: 'SHORYUKEN',
        sp1LabelLi: 'TENDANG KILAT',
        sp2LabelLi: 'TENDANG PUTAR',
        btnMax: 'PAMUNGKAS'
    },
    'ms': {
        name: 'Bahasa Melayu',
        flag: '🇲🇾',
        tagline: 'PERMAINAN PERTEMPURAN ARKED 2D KLASIK',
        titleMain: 'STREET FIGHT',
        titleSub: 'HYPER CLASH · PERTEMPURAN JAGUH',
        btnArcade: '🥊 MOD ARKED SOLO',
        btnVersus: '⚔️ MOD LAWAN 2P VERSUS',
        btnTraining: '🥋 LATIHAN DOJO',
        btnDocs: '📖 MANUAL & PANDUAN',
        controlsBar: 'Kawalan: WASD Gerak/Lompat/Cangkung | J/K Tumbuk | U Tendang | I/O Gerakan Khas | Space Super MAX',
        charSelectTitle: 'PILIH PENDEKAR ANDA',
        jinName: 'JIN (Tangan Dewa Jin)',
        jinStyle: 'Karate Kyokushin / Kuasa Tenaga Chi',
        jinMoves: [
            '• Tumbukan Pantas / Kuat (J / K)',
            '• Bebola Tenaga HADOUKEN (I / SP1)',
            '• Tumbukan Naga Terbang SHORYUKEN (O / SP2)',
            '• Shinku Hadouken Pukulan Akhir (Space)'
        ],
        lihuaName: 'LI-HUA (Burung Phoenix Terbang)',
        lihuaStyle: 'Tendangan Shaolin / Seni Tangkas',
        lihuaMoves: [
            '• Kombo Tumbukan / Tendang (K / U)',
            '• Tendangan Kilat LIGHTNING KICKS (I / SP1)',
            '• Tendangan Pusaran Ribut WHIRLWIND (O / SP2)',
            '• Senretsukyaku Badai Pukulan Akhir (Space)'
        ],
        btnBattleStart: '🔥 MULA PERLAWANAN',
        p1Select: 'P1: ',
        cpuSelect: 'KOMPUTER: ',
        vsP2Select: 'P2: ',
        superGauge: 'P1 TOLOK TENAGA SUPER',
        loading: 'MEMUAT DATA PERLAWANAN...',
        rematch: '🔄 LAWAN SEMULA',
        returnMenu: '🏠 MENU UTAMA',
        winnerSuffix: ' MENANG VICTORY!',
        drawText: 'SERI DRAW GAME',
        sp1LabelJin: 'HADOUKEN',
        sp2LabelJin: 'SHORYUKEN',
        sp1LabelLi: 'TENDANG KILAT',
        sp2LabelLi: 'TENDANG PUSARAN',
        btnMax: 'ULTIMATE'
    },
    'fil': {
        name: 'Filipino',
        flag: '🇵🇭',
        tagline: 'KLASIKONG 2D ARCADE LABANAN',
        titleMain: 'STREET FIGHT',
        titleSub: 'HYPER CLASH · DIGMAAN NG KAMPEON',
        btnArcade: '🥊 ARCADE MODE',
        btnVersus: '⚔️ 2P LABANAN MODE',
        btnTraining: '🥋 DOJO PAGSASANAY',
        btnDocs: '📖 GABAY SA LARO & DOCS',
        controlsBar: 'Kontrol: WASD Galaw/Talon/Yuko | J/K Suntok | U Sipa | I/O Espesyal | Space Super MAX',
        charSelectTitle: 'PUMILI NG IYONG MANDIRIGMA',
        jinName: 'JIN (Kamay ng Diyos Jin)',
        jinStyle: 'Kyokushin Karate / Ki Puwersa',
        jinMoves: [
            '• Mabilis / Malakas na Suntok (J / K)',
            '• Bola ng Enerhiya HADOUKEN (I / SP1)',
            '• Pataas na Suntok ng Dragon SHORYUKEN (O / SP2)',
            '• Shinku Hadouken Super Atake (Space)'
        ],
        lihuaName: 'LI-HUA (Lumilipad na Phoenix)',
        lihuaStyle: 'Shaolin Sipa / Maliksi na Kempo',
        lihuaMoves: [
            '• Kombo Suntok / Sipa (K / U)',
            '• Kidlat na Sipa LIGHTNING KICKS (I / SP1)',
            '• Buhawi na Sipa WHIRLWIND (O / SP2)',
            '• Senretsukyaku Bagyo Super Atake (Space)'
        ],
        btnBattleStart: '🔥 SIMULAN ANG LABAN',
        p1Select: 'P1: ',
        cpuSelect: 'CPU: ',
        vsP2Select: 'P2: ',
        superGauge: 'P1 SUPER GAUGE ENERHIYA',
        loading: 'NILO-LOAD ANG DATA NG LARO...',
        rematch: '🔄 MULING LUMABAN',
        returnMenu: '🏠 PANGUNAHING MENU',
        winnerSuffix: ' ANG NANALO!',
        drawText: 'PATAS DRAW GAME',
        sp1LabelJin: 'HADOUKEN',
        sp2LabelJin: 'SHORYUKEN',
        sp1LabelLi: 'KIDLAT SIPA',
        sp2LabelLi: 'BUHAWI SIPA',
        btnMax: 'ULTIMATE'
    },
    'hi': {
        name: 'हिन्दी',
        flag: '🇮🇳',
        tagline: 'रेट्रो 2D आर्केड फाइटिंग गेम',
        titleMain: 'STREET FIGHT',
        titleSub: 'हाइपर क्लैश · महासंग्राम',
        btnArcade: '🥊 आर्केड मोड ARCADE',
        btnVersus: '⚔️ 2 खिलाड़ी मुकाबला VERSUS',
        btnTraining: '🥋 डोजो अभ्यास TRAINING',
        btnDocs: '📖 खेल नियमावली व गाइड',
        controlsBar: 'नियंत्रण: WASD चाल/कूद/बैठना | J/K मुक्का | U लात | I/O विशेष चाल | Space अंतिम महावार MAX',
        charSelectTitle: 'अपना योद्धा चुनें SELECT FIGHTER',
        jinName: 'JIN (महाबली जिन)',
        jinStyle: 'क्योकुशिन कराटे / आंतरिक ऊर्जा प्रहार',
        jinMoves: [
            '• तेज़ / भारी मुक्का (J / K)',
            '• ऊर्जा गोला HADOUKEN (I / SP1)',
            '• ड्रैगन अपरकट SHORYUKEN (O / SP2)',
            '• शिंकू हादौकेन महाप्रहार (Space)'
        ],
        lihuaName: 'LI-HUA (उड़ती फीनिक्स ली-हुआ)',
        lihuaStyle: 'शॉलीन तीव्र लात / फुर्तीली कुंग फू',
        lihuaMoves: [
            '• कॉम्बो मुक्का / लात (K / U)',
            '• बिजली जैसी लातें LIGHTNING KICKS (I / SP1)',
            '• चक्रवाती घूमती लात WHIRLWIND (O / SP2)',
            '• सेनरेत्सुक्याकु महावार (Space)'
        ],
        btnBattleStart: '🔥 मुकाबला शुरू करें BATTLE START',
        p1Select: 'P1: ',
        cpuSelect: 'कंप्यूटर: ',
        vsP2Select: 'P2: ',
        superGauge: 'P1 सुपर गेज ऊर्जा',
        loading: 'गेम डेटा व ध्वनि लोड हो रही है...',
        rematch: '🔄 पुनः मुकाबला REMATCH',
        returnMenu: '🏠 मुख्य मेनू RETURN',
        winnerSuffix: ' विजयी हुआ VICTORY!',
        drawText: 'मुकाबला बराबरी पर DRAW',
        sp1LabelJin: 'हादौकेन',
        sp2LabelJin: 'शोरियूकेन',
        sp1LabelLi: 'तीव्र लातें',
        sp2LabelLi: 'चक्रवात लात',
        btnMax: 'महाप्रहार'
    }
};

class I18nManager {
    constructor() {
        this.currentLang = this.detectLanguage();
        this.listeners = [];
    }

    detectLanguage() {
        const saved = localStorage.getItem('sf_hyper_lang');
        if (saved && I18N_DATA[saved]) return saved;

        const navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
        if (navLang.startsWith('zh-hk') || navLang.startsWith('zh-tw') || navLang.startsWith('zh-hant')) return 'zh-Hant';
        if (navLang.startsWith('zh')) return 'zh-Hans';
        if (navLang.startsWith('ja')) return 'ja';
        if (navLang.startsWith('ko')) return 'ko';
        if (navLang.startsWith('th')) return 'th';
        if (navLang.startsWith('vi')) return 'vi';
        if (navLang.startsWith('id')) return 'id';
        if (navLang.startsWith('ms')) return 'ms';
        if (navLang.startsWith('fil') || navLang.startsWith('tl')) return 'fil';
        if (navLang.startsWith('hi')) return 'hi';
        return 'en';
    }

    setLanguage(lang) {
        if (!I18N_DATA[lang]) return;
        this.currentLang = lang;
        localStorage.setItem('sf_hyper_lang', lang);
        this.applyTranslations();
        this.listeners.forEach(cb => cb(lang));
    }

    t(key) {
        const langData = I18N_DATA[this.currentLang] || I18N_DATA['en'];
        return langData[key] || I18N_DATA['en'][key] || key;
    }

    onLanguageChange(cb) {
        this.listeners.push(cb);
    }

    applyTranslations() {
        const d = I18N_DATA[this.currentLang] || I18N_DATA['en'];

        // Title Screen
        const tagline = document.querySelector('.title-tagline');
        if (tagline) tagline.textContent = d.tagline;

        const titleMain = document.querySelector('.title-main-logo');
        if (titleMain) titleMain.textContent = d.titleMain;

        const titleSub = document.querySelector('.title-sub-logo');
        if (titleSub) titleSub.textContent = d.titleSub;

        const btnArcade = document.getElementById('btnModeArcade');
        if (btnArcade) btnArcade.innerHTML = `<span>🥊</span><span>${d.btnArcade.replace('🥊 ', '')}</span>`;

        const btnVersus = document.getElementById('btnModeVersus');
        if (btnVersus) btnVersus.innerHTML = `<span>⚔️</span><span>${d.btnVersus.replace('⚔️ ', '')}</span>`;

        const btnTraining = document.getElementById('btnModeTraining');
        if (btnTraining) btnTraining.innerHTML = `<span>🥋</span><span>${d.btnTraining.replace('🥋 ', '')}</span>`;

        const btnDocs = document.querySelector('.title-menu-options a[href="../"], .title-menu-options a[href="./"]');
        if (btnDocs) btnDocs.innerHTML = `<span>📖</span><span>${d.btnDocs.replace('📖 ', '')}</span>`;

        const controlsBar = document.querySelector('.title-bottom-bar > div:first-child');
        if (controlsBar) controlsBar.textContent = d.controlsBar;

        // Character Select Screen
        const charTitle = document.querySelector('#screen_charSelect h2');
        if (charTitle) charTitle.textContent = d.charSelectTitle;

        const cardJin = document.querySelector('.char-card[data-char="ryu"]');
        if (cardJin) {
            const h3 = cardJin.querySelector('h3');
            if (h3) h3.textContent = d.jinName;
            const style = cardJin.querySelector('.char-style');
            if (style) style.textContent = d.jinStyle;
            const moves = cardJin.querySelector('.char-moves');
            if (moves) moves.innerHTML = d.jinMoves.map(m => `<div>${m}</div>`).join('');
        }

        const cardLi = document.querySelector('.char-card[data-char="chunli"]');
        if (cardLi) {
            const h3 = cardLi.querySelector('h3');
            if (h3) h3.textContent = d.lihuaName;
            const style = cardLi.querySelector('.char-style');
            if (style) style.textContent = d.lihuaStyle;
            const moves = cardLi.querySelector('.char-moves');
            if (moves) moves.innerHTML = d.lihuaMoves.map(m => `<div>${m}</div>`).join('');
        }

        const btnStart = document.getElementById('btnStartMatch');
        if (btnStart) btnStart.innerHTML = `<span>🔥</span><span>${d.btnBattleStart.replace('🔥 ', '')}</span>`;

        // HUD Labels
        const superLabel = document.querySelector('.super-label');
        if (superLabel) superLabel.textContent = d.superGauge;

        const p1NameTag = document.getElementById('p1NameTag');
        if (p1NameTag && window.game) {
            p1NameTag.textContent = window.game.player1Char === 'ryu' ? d.jinName : d.lihuaName;
        }

        const p2NameTag = document.getElementById('p2NameTag');
        if (p2NameTag && window.game) {
            p2NameTag.textContent = window.game.player2Char === 'ryu' ? d.jinName : d.lihuaName;
        }

        // Result Modal
        const btnRematch = document.getElementById('btnRematch');
        if (btnRematch) btnRematch.innerHTML = `<span>🔄</span><span>${d.rematch.replace('🔄 ', '')}</span>`;

        const btnQuit = document.getElementById('btnQuitToTitle');
        if (btnQuit) btnQuit.innerHTML = `<span>🏠</span><span>${d.returnMenu.replace('🏠 ', '')}</span>`;

        // Virtual mobile button labels
        const vSp1Sub = document.querySelector('#vbtn_sp1 span:last-child');
        const vSp2Sub = document.querySelector('#vbtn_sp2 span:last-child');
        if (vSp1Sub && vSp2Sub && window.game) {
            const isJin = window.game.player1Char === 'ryu';
            vSp1Sub.textContent = isJin ? d.sp1LabelJin : d.sp1LabelLi;
            vSp2Sub.textContent = isJin ? d.sp2LabelJin : d.sp2LabelLi;
        }
    }

    renderLanguageSelector(containerId) {
        let container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        const select = document.createElement('select');
        select.className = 'lang-select-dropdown';
        select.style.cssText = `
            background: rgba(15, 23, 42, 0.9);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            color: #38bdf8;
            border: 1.5px solid rgba(56, 189, 248, 0.7);
            border-radius: 8px;
            padding: 6px 12px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            outline: none;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
            transition: all 0.2s ease;
        `;

        Object.keys(I18N_DATA).forEach(code => {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = `${I18N_DATA[code].flag} ${I18N_DATA[code].name}`;
            if (code === this.currentLang) opt.selected = true;
            select.appendChild(opt);
        });

        select.addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
        });

        this.onLanguageChange((newLang) => {
            select.value = newLang;
        });

        container.appendChild(select);
    }
}

window.i18n = new I18nManager();
