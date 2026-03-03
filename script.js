/**
 * script.js  ─  今日の守護忍 診断サイト
 *
 * 処理の流れ:
 *   1. ボタンクリック
 *   2. 今日の日付から五行を決定
 *   3. Dattebayo API からキャラクター一覧を取得
 *   4. 五行に合ったキャラクターを選ぶ（画像検証付き）
 *   5. 結果をカードに表示（フェードイン）
 *
 * 変更履歴:
 *   v1.0 - 初版
 *   v1.1 - 世界観テキスト・吉方位・画像品質保証・日本語名変換を追加
 *   v1.2 - [改修] Dattebayo API ベースに統一、プロフィール表示を追加
 *           api-dattebayo.vercel.app はフロントエンドUIのみのため、
 *           同一データを提供する dattebayo-api.onrender.com を使用する
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
    // 木属性: Wind Release（風遁）を持つキャラ → 自然・成長系
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
    // 火属性: Fire Release（火遁）を持つキャラ → 攻撃・情熱系
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
    // 土属性: Earth Release（土遁）を持つキャラ → 防御・安定系
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
    // 金属性: Lightning Release（雷遁）を持つキャラ → クール・知性系
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
    // 水属性: Water Release（水遁）を持つキャラ → 冷静・内向系
    keywords: ["Water Release"],
  },
};

/**
 * [v1.2] Dattebayo API のベース URL。
 * api-dattebayo.vercel.app はフロントエンドUIのみのため、
 * 同一データを提供する REST API エンドポイントを使用する。
 */
const API_BASE = "https://dattebayo-api.onrender.com";

/**
 * 1回のリクエストで取得するキャラクター数。
 * フィルタリングに十分な候補を確保するため多めに設定する。
 */
const FETCH_LIMIT = 50;

/**
 * 画像検証の最大試行キャラクター数（無限ループ防止）。
 */
const MAX_IMAGE_TRIES = 10;

/**
 * 英語名 → 日本語名 変換マップ。
 * Dattebayo API のレスポンスには日本語名フィールドがないため、
 * このマップで補完する。将来的な拡張はここにエントリを追加するだけでよい。
 *
 * 形式: "APIのnameフィールド（英語）": "日本語名"
 */
const NAME_JP_MAP = {
  // 主要キャラ
  "Naruto Uzumaki":      "うずまきナルト",
  "Sasuke Uchiha":       "うちはサスケ",
  "Sakura Haruno":       "春野サクラ",
  "Kakashi Hatake":      "はたけカカシ",
  "Itachi Uchiha":       "うちはイタチ",
  "Obito Uchiha":        "うちはオビト",
  "Madara Uchiha":       "うちはマダラ",
  "Minato Namikaze":     "波風ミナト",
  "Kushina Uzumaki":     "うずまきクシナ",
  "Jiraiya":             "自来也",
  "Tsunade":             "綱手",
  "Orochimaru":          "大蛇丸",
  "Gaara":               "我愛羅",
  "Temari":              "テマリ",
  "Kankuro":             "カンクロウ",
  // 木ノ葉の仲間たち
  "Rock Lee":            "ロック・リー",
  "Neji Hyuga":          "日向ネジ",
  "Hinata Hyuga":        "日向ヒナタ",
  "Hiashi Hyuga":        "日向ヒアシ",
  "Shikamaru Nara":      "奈良シカマル",
  "Ino Yamanaka":        "山中いの",
  "Choji Akimichi":      "秋道チョウジ",
  "Kiba Inuzuka":        "犬塚キバ",
  "Shino Aburame":       "油女シノ",
  "Tenten":              "テンテン",
  "Might Guy":           "マイト・ガイ",
  "Asuma Sarutobi":      "猿飛アスマ",
  "Kurenai Yuhi":        "夕日紅",
  "Anko Mitarashi":      "みたらしアンコ",
  "Iruka Umino":         "うみのイルカ",
  "Konohamaru Sarutobi": "猿飛コノハマル",
  // 暁・敵キャラ
  "Pain":                "ペイン",
  "Nagato":              "長門",
  "Konan":               "小南",
  "Kisame Hoshigaki":    "干柿鬼鮫",
  "Deidara":             "デイダラ",
  "Sasori":              "サソリ",
  "Hidan":               "飛段",
  "Kakuzu":              "角都",
  "Zetsu":               "ゼツ",
  "Tobi":                "トビ",
  // 影・里の長
  "Killer Bee":          "キラービー",
  "A":                   "エー（四代目雷影）",
  "Mei Terumi":          "照美メイ",
  "Onoki":               "オオノキ",
  "Raikage":             "雷影",
  // 千手一族・歴代火影
  "Hashirama Senju":     "千手柱間",
  "Tobirama Senju":      "千手扉間",
  "Hiruzen Sarutobi":    "猿飛ヒルゼン",
  // 大筒木一族
  "Kaguya Otsutsuki":    "大筒木カグヤ",
  "Hagoromo Otsutsuki":  "大筒木ハゴロモ",
  "Hamura Otsutsuki":    "大筒木ハムラ",
  // BORUTO世代
  "Boruto Uzumaki":      "うずまきボルト",
  "Sarada Uchiha":       "うちはサラダ",
  "Mitsuki":             "ミツキ",
  "Kawaki":              "カワキ",
  // その他
  "Kabuto Yakushi":      "薬師カブト",
  "Yamato":              "ヤマト",
  "Sai":                 "サイ",
  "Shikadai Nara":       "奈良シカダイ",
  "Inojin Yamanaka":     "山中いのじん",
  "Chocho Akimichi":     "秋道チョウチョウ",
};

// ============================================================
// DOM 要素の取得
// ============================================================
const btnDivine    = document.getElementById("btnDivine");
const loadingEl    = document.getElementById("loading");
const errorMsgEl   = document.getElementById("errorMsg");
const resultEl     = document.getElementById("result");

// 結果表示用の各要素
const gogyouBadge   = document.getElementById("gogyouBadge");
const gogyouNameEl  = document.getElementById("gogyouName");
const charImageEl   = document.getElementById("charImage");
const charNameEl    = document.getElementById("charName");
const worldTextEl   = document.getElementById("worldText");
const luckyColorEl  = document.getElementById("luckyColor");
const colorDotEl    = document.getElementById("colorDot");
const luckyActionEl = document.getElementById("luckyAction");
const directionEl   = document.getElementById("direction");
// [v1.2] プロフィール要素
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
  const now = new Date();
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
 * 英語名を日本語名に変換する。
 * NAME_JP_MAP に登録されていない場合は英語名をそのまま返す。
 *
 * @param {string} englishName - APIから取得した英語名
 * @returns {string} 日本語名、またはそのままの英語名
 */
function toJapaneseName(englishName) {
  return NAME_JP_MAP[englishName] || englishName;
}

/**
 * 画像URLが実際に取得できるか（404でないか）を検証する。
 * img要素のロード試行で確認する。
 *
 * @param {string} url - 検証する画像URL
 * @returns {Promise<boolean>} 取得可能なら true、不可なら false
 */
function validateImageUrl(url) {
  return new Promise((resolve) => {
    if (!url || url.trim() === "") {
      resolve(false);
      return;
    }
    const img = new Image();
    img.onload  = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * キャラクターの images 配列から有効な画像URLを1つ探す。
 * 先頭から順に検証し、最初に有効だったURLを返す。
 * すべて無効な場合は null を返す。
 *
 * @param {string[]} images - キャラクターの画像URL配列
 * @returns {Promise<string|null>} 有効なURL、またはnull
 */
async function findValidImageUrl(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  for (const url of images) {
    const isValid = await validateImageUrl(url);
    if (isValid) return url;
  }
  return null;
}

/**
 * [v1.2] キャラクターのプロフィール情報を組み立てる。
 * personal フィールドから所属・忍術属性・役職などを抽出して
 * 日本語の短い説明文を返す。
 *
 * @param {Object} character - APIから取得したキャラクターオブジェクト
 * @returns {string} プロフィール文字列（最大2行程度）
 */
function buildProfile(character) {
  const personal = character.personal || {};
  const parts = [];

  // 所属（最初の1つ）
  const affiliation = Array.isArray(personal.affiliation)
    ? personal.affiliation[0]
    : (typeof personal.affiliation === "string" ? personal.affiliation : "");
  if (affiliation) parts.push(`所属：${affiliation}`);

  // 役職・肩書き（最初の1つ）
  const occupation = Array.isArray(personal.occupation)
    ? personal.occupation[0]
    : (typeof personal.occupation === "string" ? personal.occupation : "");
  if (occupation && occupation.length < 30) parts.push(`役職：${occupation}`);

  // 忍術属性（最初の2つ、"Release"を"遁"に変換）
  const natureType = Array.isArray(character.natureType)
    ? character.natureType
        .slice(0, 2)
        .map((n) => n.replace(" Release", "遁").replace("  (Affinity)", "（素質）").replace("  (Novel only)", ""))
        .join("・")
    : "";
  if (natureType) parts.push(`属性：${natureType}`);

  // 一族
  const clan = typeof personal.clan === "string" && personal.clan.trim()
    ? personal.clan.replace(/\s*\(.*?\)/g, "").trim()
    : "";
  if (clan && clan.length < 20) parts.push(`一族：${clan}`);

  // 情報がなければデフォルト文言
  if (parts.length === 0) return "詳細不明の忍";

  // 最大3項目まで表示
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
 * @param {Object} gogyou        - 五行設定オブジェクト
 * @param {Object} character     - APIから取得したキャラクターオブジェクト
 * @param {string|null} validImageUrl - 検証済みの有効な画像URL
 */
function showResult(gogyou, character, validImageUrl) {
  // --- 五行バッジ ---
  gogyouNameEl.textContent = gogyou.name;
  gogyouBadge.style.background   = gogyou.badgeColor;
  gogyouBadge.style.borderColor  = gogyou.colorCode;
  gogyouNameEl.style.color       = gogyou.colorCode;

  // --- キャラクター画像（検証済みURLを使用） ---
  if (validImageUrl) {
    charImageEl.src   = validImageUrl;
    charImageEl.alt   = toJapaneseName(character.name) + "の画像";
    charImageEl.style.display = "";
  } else {
    charImageEl.style.display = "none";
  }

  // --- キャラクター名（日本語変換） ---
  charNameEl.textContent = toJapaneseName(character.name);

  // --- 世界観テキスト ---
  worldTextEl.textContent = gogyou.worldText;

  // --- [v1.2] プロフィール ---
  profileEl.textContent = buildProfile(character);

  // --- ラッキーカラー ---
  luckyColorEl.textContent = gogyou.luckyColor;
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
 */
async function runDivination() {
  showLoading();

  try {
    // --- Step 1: 今日の五行を決定 ---
    const gogyouIndex = getTodayGogyouIndex();
    const gogyou = GOGYOU[gogyouIndex];

    // --- Step 2: Dattebayo API からキャラクター一覧を取得 ---
    // ページをランダムに選ぶことで毎回異なるキャラクターが出やすくなる
    // 総キャラ数 1431 / FETCH_LIMIT 50 = 最大28ページ
    const randomPage = Math.floor(Math.random() * 28) + 1;
    const url = `${API_BASE}/characters?page=${randomPage}&limit=${FETCH_LIMIT}`;

    const response = await fetch(url);

    // HTTP エラーチェック
    if (!response.ok) {
      throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const characters = data.characters;

    // キャラクター配列の存在確認
    if (!Array.isArray(characters) || characters.length === 0) {
      throw new Error("キャラクターデータが取得できませんでした。");
    }

    // --- Step 3: 五行に合ったキャラクターをフィルタリング ---
    let filtered = characters.filter((c) =>
      hasKeyword(c.natureType, gogyou.keywords)
    );

    // フィルタ結果が空の場合は全キャラからランダム選択（フォールバック）
    if (filtered.length === 0) {
      filtered = characters;
    }

    // --- Step 4: 画像が有効なキャラクターを選ぶ ---
    // 候補をシャッフルして順番に画像を検証し、最初に有効だったキャラを使用する
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

    // [v1.2] エラーメッセージを仕様通りに統一
    if (error instanceof TypeError && error.message.includes("fetch")) {
      showError("キャラクター情報の取得に失敗しました。\nインターネット接続を確認してください。");
    } else {
      showError("キャラクター情報の取得に失敗しました。\nしばらく待ってから再度お試しください。");
    }

    console.error("[守護忍診断] エラー:", error);
  }
}

// ============================================================
// イベントリスナー登録
// ============================================================

// ボタンクリックで診断を実行
btnDivine.addEventListener("click", runDivination);
