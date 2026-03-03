/**
 * script.js  ─  今日の守護忍 診断サイト
 *
 * 処理の流れ:
 *   1. 生年月日を入力してボタンをクリック
 *   2. 生年月日 + 今日の日付から五行を決定（シンプル高速版）
 *   3. Dattebayo API から人気キャラTop50プールに含まれるキャラを取得
 *   4. 五行に合ったキャラクターを選ぶ（画像検証付き）
 *   5. 結果をカードに表示（フェードイン）
 *
 * 変更履歴:
 *   v1.0 - 初版
 *   v1.1 - 世界観テキスト・吉方位・画像品質保証・日本語名変換を追加
 *   v1.2 - Dattebayo API ベースに統一、プロフィール表示を追加
 *   v1.3 - 人気キャラTop50固定プール方式に変更
 *   v1.4 - [改修] 生年月日入力フォームを追加
 *           五行計算を「生年月日数値 + 今日の日付数値」の合計 % 5 に変更
 *           各キャラの名セリフ（日本語）を追加表示
 */

// ============================================================
// 定数定義
// ============================================================

/**
 * 五行の設定オブジェクト。
 * キー: 余り（0〜4）
 */
const GOGYOU = {
  0: {
    name: "木",
    luckyColor: "緑",
    colorCode: "#4caf50",
    badgeColor: "rgba(76, 175, 80, 0.25)",
    action: "新しいことを始めよう",
    worldText: "成長の気が巡る日。挑戦が未来を広げます。",
    direction: "東",
    keywords: ["Wind Release"],
  },
  1: {
    name: "火",
    luckyColor: "赤",
    colorCode: "#f44336",
    badgeColor: "rgba(244, 67, 54, 0.25)",
    action: "情熱的に行動しよう",
    worldText: "情熱が高まる日。迷うより行動を。",
    direction: "南",
    keywords: ["Fire Release"],
  },
  2: {
    name: "土",
    luckyColor: "黄色",
    colorCode: "#ffc107",
    badgeColor: "rgba(255, 193, 7, 0.25)",
    action: "身の回りを整えよう",
    worldText: "安定の気が流れています。基盤を整えると吉。",
    direction: "中央",
    keywords: ["Earth Release"],
  },
  3: {
    name: "金",
    luckyColor: "白",
    colorCode: "#e0e0e0",
    badgeColor: "rgba(224, 224, 224, 0.2)",
    action: "不要なものを手放そう",
    worldText: "決断のエネルギーが強い日。手放す勇気を。",
    direction: "西",
    keywords: ["Lightning Release"],
  },
  4: {
    name: "水",
    luckyColor: "青",
    colorCode: "#2196f3",
    badgeColor: "rgba(33, 150, 243, 0.25)",
    action: "柔軟に流れに乗ろう",
    worldText: "流れに身を任せることで運が動きます。",
    direction: "北",
    keywords: ["Water Release"],
  },
};

/**
 * Dattebayo API のベース URL。
 */
const API_BASE = "https://dattebayo-api.onrender.com";

/** 1回のリクエストで取得するキャラクター数 */
const FETCH_LIMIT = 50;

/** 画像検証の最大試行キャラクター数（無限ループ防止） */
const MAX_IMAGE_TRIES = 10;

/**
 * 人気キャラ Top50 固定プール。
 * キー: Dattebayo API の "name" フィールドと完全一致する英語名
 * 値  : 表示用の日本語名
 */
const TOP50_POOL = {
  // ─── 木ノ葉の忍 ───
  "Naruto Uzumaki":   "うずまきナルト",
  "Sasuke Uchiha":    "うちはサスケ",
  "Sakura Haruno":    "春野サクラ",
  "Kakashi Hatake":   "はたけカカシ",
  "Rock Lee":         "ロック・リー",
  "Hinata Hyūga":     "日向ヒナタ",
  "Neji Hyūga":       "日向ネジ",
  "Shikamaru Nara":   "奈良シカマル",
  "Chōji Akimichi":   "秋道チョウジ",
  "Kiba Inuzuka":     "犬塚キバ",
  "Shino Aburame":    "油女シノ",
  "Tenten":           "テンテン",
  "Might Guy":        "マイト・ガイ",
  "Asuma Sarutobi":   "猿飛アスマ",
  "Kurenai Yūhi":     "夕日紅",
  "Anko Mitarashi":   "みたらしアンコ",
  "Iruka Umino":      "うみのイルカ",
  "Sai":              "サイ",
  "Yamato":           "ヤマト",
  // ─── 伝説の三忍・歴代火影 ───
  "Jiraiya":          "自来也",
  "Tsunade":          "綱手",
  "Orochimaru":       "大蛇丸",
  "Minato Namikaze":  "波風ミナト",
  "Hashirama Senju":  "千手柱間",
  "Kushina Uzumaki":  "うずまきクシナ",
  // ─── うちは一族 ───
  "Itachi Uchiha":    "うちはイタチ",
  "Madara Uchiha":    "うちはマダラ",
  "Obito Uchiha":     "うちはオビト",
  "Shisui Uchiha":    "うちはシスイ",
  // ─── 砂の忍 ───
  "Gaara":            "我愛羅",
  "Temari":           "テマリ",
  "Kankurō":          "カンクロウ",
  // ─── 暁 ───
  "Pain":             "ペイン",
  "Nagato":           "長門",
  "Konan":            "小南",
  "Deidara":          "デイダラ",
  "Sasori":           "サソリ",
  "Hidan":            "ヒダン",
  "Tobi":             "トビ",
  // ─── その他の主要キャラ ───
  "Killer B":         "キラービー",
  "Kabuto Yakushi":   "薬師カブト",
  "Zabuza Momochi":   "ももちザブザ",
  "Haku":             "ハク",
  "Rin Nohara":       "野原リン",
  "Kimimaro":         "君麻呂",
  "Chōza Akimichi":   "秋道チョウザ",
};

/**
 * [v1.4] 各キャラクターの名セリフマップ（日本語）。
 * キー: TOP50_POOL と同じ英語名
 * 値  : 原作に忠実な日本語セリフ
 */
const CHAR_QUOTE = {
  "Naruto Uzumaki":
    "オレは絶対に諦めない！それがオレの忍道だ！",
  "Sasuke Uchiha":
    "オレの目的はただ一つ……兄を殺すこと。",
  "Sakura Haruno":
    "私だって、ちゃんと戦える。もう足を引っ張らない！",
  "Kakashi Hatake":
    "この世界では、ルールを破る者はクズと呼ばれる。だが仲間を見捨てる者は、それ以上のクズだ。",
  "Rock Lee":
    "努力した者が全て報われるとは限らない。しかし！成功した者は皆、例外なく努力している！",
  "Hinata Hyūga":
    "私は……諦めない。ナルトくんが見ていてくれるから。",
  "Neji Hyūga":
    "運命は変えられない。それが宿命だ。",
  "Shikamaru Nara":
    "めんどくせぇ……でも、やるしかねぇか。",
  "Chōji Akimichi":
    "仲間のためなら、この命を懸けることも厭わない！",
  "Kiba Inuzuka":
    "オレとアカマルは最強のコンビだ！",
  "Shino Aburame":
    "虫は裏切らない。それが私の信念だ。",
  "Tenten":
    "武器は使い手の意志を映す鏡。私の意志は揺るがない。",
  "Might Guy":
    "青春とは、全力で燃え尽きることだ！",
  "Asuma Sarutobi":
    "将棋の駒も、守るべき王がいるから動ける。",
  "Kurenai Yūhi":
    "幻術は心を映す。揺れる心を持つ者には解けない術だ。",
  "Anko Mitarashi":
    "甘いものは別腹！でも戦いは本気でいくわよ！",
  "Iruka Umino":
    "ナルト、お前は木ノ葉の立派な忍だ。",
  "Sai":
    "笑顔とは……まだ学んでいる途中だ。",
  "Yamato":
    "チームワークなくして、任務の成功はない。",
  "Jiraiya":
    "諦めなければ、いつか道は開ける。それが忍の生き方だ。",
  "Tsunade":
    "賭けに負けたことはない……いや、一番大切なものを賭けたことがないだけか。",
  "Orochimaru":
    "全ての術を手に入れ、全ての秘密を解き明かす。それが私の夢だ。",
  "Minato Namikaze":
    "ナルト、お前を信じている。",
  "Hashirama Senju":
    "憎しみの連鎖を断ち切ること、それが本当の平和への道だ。",
  "Kushina Uzumaki":
    "愛してるよ、ナルト。",
  "Itachi Uchiha":
    "許せ、ナルト……これで最後だ。",
  "Madara Uchiha":
    "夢の世界こそが、真の平和だ。",
  "Obito Uchiha":
    "この世界に真実なんてない……だから、夢の中で生きる。",
  "Shisui Uchiha":
    "木ノ葉を守ること、それが私の意志だ。",
  "Gaara":
    "愛されることを知った時、初めて人は生きることができる。",
  "Temari":
    "風は止まらない。私も止まらない。",
  "Kankurō":
    "傀儡使いを舐めるな。",
  "Pain":
    "痛みを知らぬ者に、平和は語れない。",
  "Nagato":
    "人は皆、何かを守るために戦う。",
  "Konan":
    "紙は折り方次第で、剣にも盾にもなる。",
  "Deidara":
    "芸術は爆発だ！ん？",
  "Sasori":
    "永遠に残るものこそ、本物の芸術だ。",
  "Hidan":
    "死は神への捧げ物だ。",
  "Tobi":
    "トビはいい子だ！",
  "Killer B":
    "ラップで語れ、心で感じろ！ビー様の言葉は刺さるぜ！",
  "Kabuto Yakushi":
    "私は……自分が何者か、まだ探している。",
  "Zabuza Momochi":
    "忍に感情は不要だ……そう思っていた。",
  "Haku":
    "大切な人を守れる者が、本当の強さを持つ忍だ。",
  "Rin Nohara":
    "オビト、あなたのことを信じてる。",
  "Kimimaro":
    "大蛇丸様のために、この命を捧げる。",
  "Chōza Akimichi":
    "秋道一族の誇りを、この体で示す！",
};

// ============================================================
// DOM 要素の取得
// ============================================================
// [v1.4] 生年月日入力フォーム関連を追加
const birthdateInput = document.getElementById("birthdateInput");
const inputErrorEl   = document.getElementById("inputError");

const btnDivine    = document.getElementById("btnDivine");
const loadingEl    = document.getElementById("loading");
const errorMsgEl   = document.getElementById("errorMsg");
const resultEl     = document.getElementById("result");

const gogyouBadge   = document.getElementById("gogyouBadge");
const gogyouNameEl  = document.getElementById("gogyouName");
const charImageEl   = document.getElementById("charImage");
const charNameEl    = document.getElementById("charName");
const charQuoteEl   = document.getElementById("charQuote");   // [v1.4] 名セリフ
const worldTextEl   = document.getElementById("worldText");
const luckyColorEl  = document.getElementById("luckyColor");
const colorDotEl    = document.getElementById("colorDot");
const luckyActionEl = document.getElementById("luckyAction");
const directionEl   = document.getElementById("direction");
const profileEl     = document.getElementById("charProfile");

// ============================================================
// ユーティリティ関数
// ============================================================

/**
 * [v1.4] 生年月日と今日の日付から五行インデックスを計算する。
 *
 * 計算式（シンプル高速版）:
 *   1. 生年月日を YYYYMMDD の整数に変換
 *   2. 今日の日付を YYYYMMDD の整数に変換
 *   3. 合計値 % 5 の余りで五行決定
 *
 * ※ 同じ人・同じ日なら結果は固定。日付が変われば結果も変わる。
 *
 * @param {string} birthdateStr - "YYYY-MM-DD" 形式の生年月日文字列
 * @returns {number} 0〜4 の整数
 */
function calcGogyouIndex(birthdateStr) {
  // 生年月日を YYYYMMDD 数値に変換（ハイフンを除去）
  const bdNum = parseInt(birthdateStr.replace(/-/g, ""), 10);

  // 今日の日付を YYYYMMDD 数値に変換
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day   = String(now.getDate()).padStart(2, "0");
  const todayNum = parseInt(`${year}${month}${day}`, 10);

  // 合計値 % 5 で五行を決定
  return (bdNum + todayNum) % 5;
}

/**
 * 配列からランダムに 1 要素を取り出す。
 *
 * @param {Array} arr - 対象の配列
 * @returns {*} ランダムに選ばれた要素
 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * キャラクターの natureType 配列に、指定キーワードが含まれるか判定する。
 *
 * @param {string[]} natureType - キャラクターの属性配列
 * @param {string[]} keywords   - 検索キーワード配列
 * @returns {boolean}
 */
function hasKeyword(natureType, keywords) {
  if (!Array.isArray(natureType) || natureType.length === 0) return false;
  return keywords.some((kw) =>
    natureType.some((nt) => nt.includes(kw))
  );
}

/**
 * APIから返ってきたキャラクター名がTop50プールに含まれるか判定する。
 *
 * @param {string} name - APIの "name" フィールド
 * @returns {boolean}
 */
function isInTop50Pool(name) {
  return Object.prototype.hasOwnProperty.call(TOP50_POOL, name);
}

/**
 * キャラクター名を日本語名に変換する。
 *
 * @param {string} apiName - APIの "name" フィールド（英語）
 * @returns {string} 日本語名、またはそのままの英語名
 */
function toJapaneseName(apiName) {
  return TOP50_POOL[apiName] || apiName;
}

/**
 * [v1.4] キャラクターの名セリフを取得する。
 * CHAR_QUOTE に登録されていない場合は空文字を返す。
 *
 * @param {string} apiName - APIの "name" フィールド（英語）
 * @returns {string} 名セリフ文字列
 */
function getCharQuote(apiName) {
  return CHAR_QUOTE[apiName] || "";
}

/**
 * 画像URLが実際に取得できるか（404でないか）を検証する。
 *
 * @param {string} url - 検証する画像URL
 * @returns {Promise<boolean>}
 */
function validateImageUrl(url) {
  return new Promise((resolve) => {
    if (!url || url.trim() === "") { resolve(false); return; }
    const img = new Image();
    img.onload  = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * キャラクターの images 配列から有効な画像URLを1つ探す。
 * すべて無効な場合は null を返す。
 *
 * @param {string[]} images - キャラクターの画像URL配列
 * @returns {Promise<string|null>}
 */
async function findValidImageUrl(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  for (const url of images) {
    if (await validateImageUrl(url)) return url;
  }
  return null;
}

/**
 * キャラクターのプロフィール情報を組み立てる。
 *
 * @param {Object} character - APIから取得したキャラクターオブジェクト
 * @returns {string} プロフィール文字列
 */
function buildProfile(character) {
  const personal = character.personal || {};
  const parts = [];

  const affiliation = Array.isArray(personal.affiliation)
    ? personal.affiliation[0]
    : (typeof personal.affiliation === "string" ? personal.affiliation : "");
  if (affiliation) parts.push(`所属：${affiliation}`);

  const occupation = Array.isArray(personal.occupation)
    ? personal.occupation[0]
    : (typeof personal.occupation === "string" ? personal.occupation : "");
  if (occupation && occupation.length < 30) parts.push(`役職：${occupation}`);

  const natureType = Array.isArray(character.natureType)
    ? character.natureType
        .slice(0, 2)
        .map((n) =>
          n.replace(" Release", "遁")
           .replace("  (Affinity)", "（素質）")
           .replace(/\s*\(.*?\)/g, "")
           .trim()
        )
        .join("・")
    : "";
  if (natureType) parts.push(`属性：${natureType}`);

  if (parts.length === 0) return "詳細不明の忍";
  return parts.slice(0, 3).join("　／　");
}

// ============================================================
// UI 制御関数
// ============================================================

/**
 * [v1.4] 入力エラーメッセージを表示・非表示にする。
 *
 * @param {string} message - 表示するメッセージ（空文字で非表示）
 */
function setInputError(message) {
  if (message) {
    inputErrorEl.textContent = message;
    inputErrorEl.hidden = false;
    birthdateInput.setAttribute("aria-invalid", "true");
  } else {
    inputErrorEl.hidden = true;
    birthdateInput.removeAttribute("aria-invalid");
  }
}

/** ローディング表示を開始し、ボタンを無効化する */
function showLoading() {
  btnDivine.disabled = true;
  loadingEl.hidden   = false;
  errorMsgEl.hidden  = true;
  resultEl.classList.remove("visible");
  resultEl.hidden = true;
}

/** ローディング表示を終了し、ボタンを有効化する */
function hideLoading() {
  btnDivine.disabled = false;
  loadingEl.hidden   = true;
}

/**
 * API エラーメッセージを表示する。
 *
 * @param {string} message - 表示するメッセージ
 */
function showError(message) {
  errorMsgEl.textContent = message;
  errorMsgEl.hidden = false;
}

/**
 * 結果をカードに反映し、フェードインで表示する。
 *
 * @param {Object}      gogyou        - 五行設定オブジェクト
 * @param {Object}      character     - APIから取得したキャラクターオブジェクト
 * @param {string|null} validImageUrl - 検証済みの有効な画像URL
 */
function showResult(gogyou, character, validImageUrl) {
  // --- 五行バッジ ---
  gogyouNameEl.textContent      = gogyou.name;
  gogyouBadge.style.background  = gogyou.badgeColor;
  gogyouBadge.style.borderColor = gogyou.colorCode;
  gogyouNameEl.style.color      = gogyou.colorCode;

  // --- キャラクター画像 ---
  if (validImageUrl) {
    charImageEl.src           = validImageUrl;
    charImageEl.alt           = toJapaneseName(character.name) + "の画像";
    charImageEl.style.display = "";
  } else {
    charImageEl.style.display = "none";
  }

  // --- キャラクター名（日本語表記） ---
  charNameEl.textContent = toJapaneseName(character.name);

  // --- [v1.4] 名セリフ ---
  const quote = getCharQuote(character.name);
  if (quote) {
    charQuoteEl.textContent = `「${quote}」`;
    charQuoteEl.hidden = false;
  } else {
    charQuoteEl.hidden = true;
  }

  // --- 世界観テキスト ---
  worldTextEl.textContent = gogyou.worldText;

  // --- プロフィール ---
  profileEl.textContent = buildProfile(character);

  // --- ラッキーカラー ---
  luckyColorEl.textContent         = gogyou.luckyColor;
  colorDotEl.style.backgroundColor = gogyou.colorCode;

  // --- 開運アクション ---
  luckyActionEl.textContent = gogyou.action;

  // --- 吉方位 ---
  directionEl.textContent = gogyou.direction;

  // --- フェードイン表示 ---
  resultEl.hidden = false;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resultEl.classList.add("visible");
    });
  });
}

// ============================================================
// メイン処理
// ============================================================

/**
 * 診断のメイン処理。
 * ボタンクリック時に呼び出される非同期関数。
 *
 * [v1.4] 変更点:
 *   - 生年月日の入力値を検証してから処理を開始する
 *   - 五行計算を「生年月日数値 + 今日の日付数値」の合計 % 5 に変更
 */
async function runDivination() {
  // --- [v1.4] Step 0: 生年月日の入力バリデーション ---
  const birthdateValue = birthdateInput.value.trim();

  if (!birthdateValue) {
    // 未入力の場合はエラーメッセージを表示して処理を中断
    setInputError("生年月日を入力してください");
    return;
  }

  // 入力エラーをクリア
  setInputError("");
  showLoading();

  try {
    // --- Step 1: 生年月日 + 今日の日付から五行を決定 ---
    const gogyouIndex = calcGogyouIndex(birthdateValue);
    const gogyou = GOGYOU[gogyouIndex];

    // --- Step 2: API から複数ページを取得してTop50プールに含まれるキャラを収集 ---
    const MAX_PAGES = 4;
    let poolChars = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `${API_BASE}/characters?page=${page}&limit=${FETCH_LIMIT}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const characters = data.characters;

      if (!Array.isArray(characters) || characters.length === 0) break;

      const matched = characters.filter((c) => isInTop50Pool(c.name));
      poolChars = poolChars.concat(matched);

      // 十分な候補が集まったら早期終了
      if (poolChars.length >= 20) break;
    }

    if (poolChars.length === 0) {
      throw new Error("対象キャラクターが見つかりませんでした。");
    }

    // --- Step 3: 五行に合ったキャラクターをフィルタリング ---
    let filtered = poolChars.filter((c) =>
      hasKeyword(c.natureType, gogyou.keywords)
    );

    // 五行フィルタ結果が空の場合はプール全体からフォールバック
    if (filtered.length === 0) {
      filtered = poolChars;
    }

    // --- Step 4: 画像が有効なキャラクターを選ぶ ---
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);

    let chosen = null;
    let validImageUrl = null;

    for (let i = 0; i < Math.min(shuffled.length, MAX_IMAGE_TRIES); i++) {
      const candidate = shuffled[i];
      const imgUrl = await findValidImageUrl(candidate.images);

      if (imgUrl !== null) {
        chosen = candidate;
        validImageUrl = imgUrl;
        break;
      }
    }

    // すべて画像なしの場合はランダムに1体選ぶ（画像なしで表示）
    if (!chosen) {
      chosen = pickRandom(filtered);
      validImageUrl = null;
    }

    // --- Step 5: 結果を表示 ---
    hideLoading();
    showResult(gogyou, chosen, validImageUrl);

  } catch (error) {
    hideLoading();
    showError("キャラクター情報の取得に失敗しました。\nしばらく待ってから再度お試しください。");
    console.error("[守護忍診断] エラー:", error);
  }
}

// ============================================================
// イベントリスナー登録
// ============================================================

// ボタンクリックで診断を実行
btnDivine.addEventListener("click", runDivination);

// [v1.4] 生年月日入力中にエラーメッセージをリアルタイムでクリアする
birthdateInput.addEventListener("input", () => {
  if (birthdateInput.value) {
    setInputError("");
  }
});
