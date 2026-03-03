/**
 * script.js  ─  今日の守護忍 診断サイト
 *
 * 処理の流れ:
 *   1. ボタンクリック
 *   2. 今日の日付から五行を決定
 *   3. Naruto API からキャラクター一覧を取得
 *   4. 五行に合ったキャラクターを選ぶ（画像検証付き）
 *   5. 結果をカードに表示（フェードイン）
 *
 * 変更履歴:
 *   v1.1 - 世界観テキスト・吉方位・画像品質保証・日本語名変換を追加
 */

// ============================================================
// 定数定義
// ============================================================

/**
 * 五行の設定オブジェクト。
 * キー: 余り（0〜4）
 * 値: 五行名・ラッキーカラー・カラーコード・開運アクション・
 *     世界観テキスト・吉方位・フィルタ用キーワード
 *
 * [追加 v1.1] worldText（世界観テキスト）・direction（吉方位）を追加
 */
const GOGYOU = {
  0: {
    name: "木",
    luckyColor: "緑",
    colorCode: "#4caf50",
    badgeColor: "rgba(76, 175, 80, 0.25)",
    action: "新しいことを始めよう",
    // [追加 v1.1] 世界観テキスト
    worldText: "成長の気が巡る日。挑戦が未来を広げます。",
    // [追加 v1.1] 吉方位
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
    // [追加 v1.1] 世界観テキスト
    worldText: "情熱が高まる日。迷うより先に動くこと。",
    // [追加 v1.1] 吉方位
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
    // [追加 v1.1] 世界観テキスト
    worldText: "安定の気が流れています。基盤を整えると吉。",
    // [追加 v1.1] 吉方位
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
    // [追加 v1.1] 世界観テキスト
    worldText: "決断のエネルギーが強い日。手放す勇気を。",
    // [追加 v1.1] 吉方位
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
    // [追加 v1.1] 世界観テキスト
    worldText: "流れに身を任せることで運が動きます。",
    // [追加 v1.1] 吉方位
    direction: "北",
    // 水属性: Water Release（水遁）を持つキャラ → 冷静・内向系
    keywords: ["Water Release"],
  },
};

/**
 * Naruto API のベース URL。
 * 元の gustavonobreza/naruto-api が現在オフラインのため、
 * 同等の公開 API（Dattebayo API）を使用する。
 */
const API_BASE = "https://dattebayo-api.onrender.com";

/**
 * 1回のリクエストで取得するキャラクター数。
 * 多すぎると遅くなるため、絞り込みに十分な数を設定する。
 */
const FETCH_LIMIT = 50;

/**
 * [追加 v1.1] キャラクター英語名 → 日本語名 変換マップ。
 * APIに日本語名フィールドがないため、固定マップで対応する。
 * 将来的に拡張する場合はここにエントリを追加するだけでよい。
 *
 * 形式: "英語名（APIのnameフィールド）": "日本語名"
 */
const NAME_JP_MAP = {
  "Naruto Uzumaki":    "うずまきナルト",
  "Sasuke Uchiha":     "うちはサスケ",
  "Sakura Haruno":     "春野サクラ",
  "Kakashi Hatake":    "はたけカカシ",
  "Itachi Uchiha":     "うちはイタチ",
  "Minato Namikaze":   "波風ミナト",
  "Jiraiya":           "自来也",
  "Tsunade":           "綱手",
  "Orochimaru":        "大蛇丸",
  "Gaara":             "我愛羅",
  "Rock Lee":          "ロック・リー",
  "Neji Hyuga":        "日向ネジ",
  "Hinata Hyuga":      "日向ヒナタ",
  "Shikamaru Nara":    "奈良シカマル",
  "Ino Yamanaka":      "山中いの",
  "Choji Akimichi":    "秋道チョウジ",
  "Kiba Inuzuka":      "犬塚キバ",
  "Shino Aburame":     "油女シノ",
  "Tenten":            "テンテン",
  "Might Guy":         "マイト・ガイ",
  "Asuma Sarutobi":    "猿飛アスマ",
  "Kurenai Yuhi":      "夕日紅",
  "Killer Bee":        "キラービー",
  "Nagato":            "長門",
  "Konan":             "小南",
  "Pain":              "ペイン",
  "Madara Uchiha":     "うちはマダラ",
  "Obito Uchiha":      "うちはオビト",
  "Hashirama Senju":   "千手柱間",
  "Tobirama Senju":    "千手扉間",
  "Hiruzen Sarutobi":  "猿飛ヒルゼン",
  "Kaguya Otsutsuki":  "大筒木カグヤ",
  "Boruto Uzumaki":    "うずまきボルト",
  "Sarada Uchiha":     "うちはサラダ",
  "Mitsuki":           "ミツキ",
};

// ============================================================
// DOM 要素の取得
// ============================================================
const btnDivine   = document.getElementById("btnDivine");
const loadingEl   = document.getElementById("loading");
const errorMsgEl  = document.getElementById("errorMsg");
const resultEl    = document.getElementById("result");

// 結果表示用の各要素
const gogyouBadge   = document.getElementById("gogyouBadge");
const gogyouNameEl  = document.getElementById("gogyouName");
const charImageEl   = document.getElementById("charImage");
const charNameEl    = document.getElementById("charName");
// [追加 v1.1] 世界観テキスト要素
const worldTextEl   = document.getElementById("worldText");
const luckyColorEl  = document.getElementById("luckyColor");
const colorDotEl    = document.getElementById("colorDot");
const luckyActionEl = document.getElementById("luckyAction");
// [追加 v1.1] 吉方位要素
const directionEl   = document.getElementById("direction");

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
  const month = String(now.getMonth() + 1).padStart(2, "0"); // 月は 0 始まりなので +1
  const day   = String(now.getDate()).padStart(2, "0");

  // YYYYMMDD 形式の文字列を数値に変換
  const dateNum = parseInt(`${year}${month}${day}`, 10);

  // 5 で割った余りが五行インデックス
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
  // natureType の各要素にキーワードが部分一致するか確認
  return keywords.some((kw) =>
    natureType.some((nt) => nt.includes(kw))
  );
}

/**
 * [追加 v1.1] 英語名を日本語名に変換する。
 * NAME_JP_MAP に登録されていない場合は英語名をそのまま返す。
 *
 * @param {string} englishName - APIから取得した英語名
 * @returns {string} 日本語名、またはそのままの英語名
 */
function toJapaneseName(englishName) {
  return NAME_JP_MAP[englishName] || englishName;
}

/**
 * [追加 v1.1] 画像URLが実際に取得できるか（404でないか）を検証する。
 * img要素を使ったロード試行で確認する。
 *
 * @param {string} url - 検証する画像URL
 * @returns {Promise<boolean>} 取得可能なら true、不可なら false
 */
function validateImageUrl(url) {
  return new Promise((resolve) => {
    // 空文字・nullは即座にfalse
    if (!url || url.trim() === "") {
      resolve(false);
      return;
    }

    const img = new Image();

    // 読み込み成功 → 有効な画像URL
    img.onload = () => resolve(true);

    // 読み込み失敗（404など） → 無効な画像URL
    img.onerror = () => resolve(false);

    // 実際にURLをセットして読み込みを試みる
    img.src = url;
  });
}

/**
 * [追加 v1.1] キャラクターの images 配列から有効な画像URLを1つ探す。
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

  return null; // すべて無効
}

// ============================================================
// UI 制御関数
// ============================================================

/** ローディング表示を開始し、ボタンを無効化する */
function showLoading() {
  btnDivine.disabled = true;
  loadingEl.hidden   = false;
  errorMsgEl.hidden  = true;
  // 前回の結果を非表示にする（フェードアウト）
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
 * @param {Object} gogyou    - 五行設定オブジェクト
 * @param {Object} character - APIから取得したキャラクターオブジェクト
 * @param {string} validImageUrl - 検証済みの有効な画像URL（nullの場合は画像なし）
 */
function showResult(gogyou, character, validImageUrl) {
  // --- 五行バッジ ---
  gogyouNameEl.textContent = gogyou.name;
  gogyouBadge.style.background = gogyou.badgeColor;
  gogyouBadge.style.borderColor = gogyou.colorCode;
  gogyouNameEl.style.color = gogyou.colorCode;

  // --- キャラクター画像（検証済みURLを使用） ---
  if (validImageUrl) {
    charImageEl.src = validImageUrl;
    charImageEl.alt = toJapaneseName(character.name) + "の画像";
    charImageEl.style.display = "";
  } else {
    // 有効な画像がなければ画像エリアを非表示
    charImageEl.style.display = "none";
  }

  // --- キャラクター名（日本語変換） ---
  // [変更 v1.1] 英語名を日本語名に変換して表示
  charNameEl.textContent = toJapaneseName(character.name);

  // --- [追加 v1.1] 世界観テキスト ---
  worldTextEl.textContent = gogyou.worldText;

  // --- ラッキーカラー ---
  luckyColorEl.textContent = gogyou.luckyColor;
  colorDotEl.style.backgroundColor = gogyou.colorCode;

  // --- 開運アクション ---
  luckyActionEl.textContent = gogyou.action;

  // --- [追加 v1.1] 吉方位 ---
  directionEl.textContent = gogyou.direction;

  // --- フェードイン表示 ---
  resultEl.hidden = false;
  // 少し遅らせることで CSS トランジションが確実に発火する
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

    // --- Step 2: API からキャラクター一覧を取得 ---
    // ページをランダムに選ぶことで毎回異なるキャラクターが出やすくなる
    const randomPage = Math.floor(Math.random() * 20) + 1; // 1〜20ページ

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
    // [変更 v1.1] 画像検証ロジックを追加
    // 候補をシャッフルして順番に画像を検証し、最初に有効だったキャラを使用する
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);

    let chosen = null;
    let validImageUrl = null;

    // 最大10体まで試みる（無限ループ防止）
    const MAX_TRIES = 10;
    for (let i = 0; i < Math.min(shuffled.length, MAX_TRIES); i++) {
      const candidate = shuffled[i];
      const imgUrl = await findValidImageUrl(candidate.images);

      if (imgUrl !== null) {
        // 有効な画像URLが見つかった → このキャラを採用
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
    // エラー処理: ユーザーにわかりやすいメッセージを表示
    hideLoading();

    if (error instanceof TypeError && error.message.includes("fetch")) {
      showError(
        "ネットワークに接続できませんでした。\nインターネット接続を確認してから再度お試しください。"
      );
    } else {
      showError(
        `データの取得に失敗しました。\n${error.message}\n\nしばらく待ってから再度お試しください。`
      );
    }

    console.error("[守護忍診断] エラー:", error);
  }
}

// ============================================================
// イベントリスナー登録
// ============================================================

// ボタンクリックで診断を実行
btnDivine.addEventListener("click", runDivination);
