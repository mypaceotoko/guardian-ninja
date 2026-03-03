/**
 * script.js  ─  今日の守護忍 診断サイト
 *
 * 処理の流れ:
 *   1. ボタンクリック
 *   2. 今日の日付から五行を決定
 *   3. Dattebayo API から人気キャラTop50プールに含まれるキャラを取得
 *   4. 五行に合ったキャラクターを選ぶ（画像検証付き）
 *   5. 結果をカードに表示（フェードイン）
 *
 * 変更履歴:
 *   v1.0 - 初版
 *   v1.1 - 世界観テキスト・吉方位・画像品質保証・日本語名変換を追加
 *   v1.2 - Dattebayo API ベースに統一、プロフィール表示を追加
 *   v1.3 - [改修] 人気キャラTop50固定プール方式に変更
 *           APIから取得したキャラをプールでフィルタし、日本語名で表示する
 */

// ============================================================
// 定数定義
// ============================================================

/**
 * 五行の設定オブジェクト。
 * キー: 余り（0〜4）
 * 値: 五行名・ラッキーカラー・カラーコード・開運アクション・
 *     世界観テキスト・吉方位・フィルタ用キーワード
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
 * api-dattebayo.vercel.app はフロントエンドUIのみのため、
 * REST API 本体の dattebayo-api.onrender.com を使用する。
 */
const API_BASE = "https://dattebayo-api.onrender.com";

/**
 * 1回のリクエストで取得するキャラクター数。
 * Top50プールとのマッチングに十分な数を確保する。
 */
const FETCH_LIMIT = 50;

/**
 * 画像検証の最大試行キャラクター数（無限ループ防止）。
 */
const MAX_IMAGE_TRIES = 10;

/**
 * [v1.3] 人気キャラ Top50 固定プール。
 *
 * キー   : Dattebayo API の "name" フィールドと完全一致する英語名
 *           （APIでは特殊文字 ō/ū/ā 等が使われる場合があるため正確に記載）
 * 値     : 表示用の日本語名
 *
 * ※ APIで確認した正式名を使用している。
 *   ユーザー指定名とAPIの正式名が異なる場合は正式名に修正済み。
 *   例: "Killer Bee" → API正式名 "Killer B"
 *       "Choji Akimichi" → API正式名 "Chōji Akimichi"
 *       "Kankuro" → API正式名 "Kankurō"
 *       "Hinata Hyuga" → API正式名 "Hinata Hyūga"
 *       "Neji Hyuga" → API正式名 "Neji Hyūga"
 *       "Choza Akimichi" → API正式名 "Chōza Akimichi"
 *       "Kurenai Yuhi" → API正式名 "Kurenai Yūhi"
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

// ============================================================
// DOM 要素の取得
// ============================================================
const btnDivine    = document.getElementById("btnDivine");
const loadingEl    = document.getElementById("loading");
const errorMsgEl   = document.getElementById("errorMsg");
const resultEl     = document.getElementById("result");

const gogyouBadge   = document.getElementById("gogyouBadge");
const gogyouNameEl  = document.getElementById("gogyouName");
const charImageEl   = document.getElementById("charImage");
const charNameEl    = document.getElementById("charName");
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
 * 今日の日付（YYYYMMDD）を数値化し、5 で割った余りを返す。
 * 同じ日は必ず同じ値になるため、五行が固定される。
 *
 * @returns {number} 0〜4 の整数
 */
function getTodayGogyouIndex() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day   = String(now.getDate()).padStart(2, "0");
  const dateNum = parseInt(`${year}${month}${day}`, 10);
  return dateNum % 5;
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
 * [v1.3] APIから返ってきたキャラクター名がTop50プールに含まれるか判定する。
 * TOP50_POOL のキー（英語名）と完全一致する場合に true を返す。
 *
 * @param {string} name - APIの "name" フィールド
 * @returns {boolean}
 */
function isInTop50Pool(name) {
  return Object.prototype.hasOwnProperty.call(TOP50_POOL, name);
}

/**
 * [v1.3] キャラクター名を日本語名に変換する。
 * TOP50_POOL に登録されていない場合は英語名をそのまま返す。
 *
 * @param {string} apiName - APIの "name" フィールド（英語）
 * @returns {string} 日本語名、またはそのままの英語名
 */
function toJapaneseName(apiName) {
  return TOP50_POOL[apiName] || apiName;
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
 * personal フィールドから所属・属性・役職などを抽出して短い説明文を返す。
 *
 * @param {Object} character - APIから取得したキャラクターオブジェクト
 * @returns {string} プロフィール文字列
 */
function buildProfile(character) {
  const personal = character.personal || {};
  const parts = [];

  // 所属（最初の1つ）
  const affiliation = Array.isArray(personal.affiliation)
    ? personal.affiliation[0]
    : (typeof personal.affiliation === "string" ? personal.affiliation : "");
  if (affiliation) parts.push(`所属：${affiliation}`);

  // 役職（最初の1つ、長すぎるものは除外）
  const occupation = Array.isArray(personal.occupation)
    ? personal.occupation[0]
    : (typeof personal.occupation === "string" ? personal.occupation : "");
  if (occupation && occupation.length < 30) parts.push(`役職：${occupation}`);

  // 忍術属性（最初の2つ、英語表記を簡易変換）
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
 * エラーメッセージを表示する。
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
  gogyouNameEl.textContent          = gogyou.name;
  gogyouBadge.style.background      = gogyou.badgeColor;
  gogyouBadge.style.borderColor     = gogyou.colorCode;
  gogyouNameEl.style.color          = gogyou.colorCode;

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

  // --- 世界観テキスト ---
  worldTextEl.textContent = gogyou.worldText;

  // --- プロフィール ---
  profileEl.textContent = buildProfile(character);

  // --- ラッキーカラー ---
  luckyColorEl.textContent              = gogyou.luckyColor;
  colorDotEl.style.backgroundColor      = gogyou.colorCode;

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
 * [v1.3] キャラクター取得ロジックの変更点:
 *   - 複数ページを取得してTop50プールに含まれるキャラを収集する
 *   - プール内キャラが見つかった段階で五行フィルタリングを行う
 *   - 画像検証済みのキャラをランダムに選んで表示する
 */
async function runDivination() {
  showLoading();

  try {
    // --- Step 1: 今日の五行を決定 ---
    const gogyouIndex = getTodayGogyouIndex();
    const gogyou = GOGYOU[gogyouIndex];

    // --- Step 2: API から複数ページを取得してTop50プールに含まれるキャラを収集 ---
    // Top50キャラは主に最初の数ページに集中しているため、
    // 最大4ページ（200件）を取得してプールとマッチングする
    const MAX_PAGES = 4;
    let poolChars = []; // Top50プールに含まれるキャラの配列

    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `${API_BASE}/characters?page=${page}&limit=${FETCH_LIMIT}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const characters = data.characters;

      if (!Array.isArray(characters) || characters.length === 0) break;

      // Top50プールに含まれるキャラのみを抽出
      const matched = characters.filter((c) => isInTop50Pool(c.name));
      poolChars = poolChars.concat(matched);

      // 十分な候補が集まったら早期終了（パフォーマンス最適化）
      if (poolChars.length >= 20) break;
    }

    // プールキャラが1体も見つからない場合はエラー
    if (poolChars.length === 0) {
      throw new Error("対象キャラクターが見つかりませんでした。");
    }

    // --- Step 3: 五行に合ったキャラクターをフィルタリング ---
    let filtered = poolChars.filter((c) =>
      hasKeyword(c.natureType, gogyou.keywords)
    );

    // 五行フィルタ結果が空の場合はプール全体からランダム選択（フォールバック）
    if (filtered.length === 0) {
      filtered = poolChars;
    }

    // --- Step 4: 画像が有効なキャラクターを選ぶ ---
    // 候補をシャッフルして順番に画像を検証し、最初に有効だったキャラを採用する
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
