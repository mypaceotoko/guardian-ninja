/**
 * script.js  ─  今日の守護忍 診断サイト
 *
 * 処理の流れ:
 *   1. ボタンクリック
 *   2. 今日の日付から五行を決定
 *   3. Naruto API からキャラクター一覧を取得
 *   4. 五行に合ったキャラクターを選ぶ
 *   5. 結果をカードに表示（フェードイン）
 */

// ============================================================
// 定数定義
// ============================================================

/**
 * 五行の設定オブジェクト。
 * キー: 余り（0〜4）
 * 値: 五行名・ラッキーカラー・カラーコード・開運アクション・
 *     フィルタ用キーワード（natureType に含まれる文字列）
 */
const GOGYOU = {
  0: {
    name: "木",
    luckyColor: "緑",
    colorCode: "#4caf50",
    badgeColor: "rgba(76, 175, 80, 0.25)",
    action: "新しいことを始めよう",
    // 木属性: Wind Release（風遁）を持つキャラ → 自然・成長系
    keywords: ["Wind Release"],
  },
  1: {
    name: "火",
    luckyColor: "赤",
    colorCode: "#f44336",
    badgeColor: "rgba(244, 67, 54, 0.25)",
    action: "情熱的に行動しよう",
    // 火属性: Fire Release（火遁）を持つキャラ → 攻撃・情熱系
    keywords: ["Fire Release"],
  },
  2: {
    name: "土",
    luckyColor: "黄色",
    colorCode: "#ffc107",
    badgeColor: "rgba(255, 193, 7, 0.25)",
    action: "身の回りを整えよう",
    // 土属性: Earth Release（土遁）を持つキャラ → 防御・安定系
    keywords: ["Earth Release"],
  },
  3: {
    name: "金",
    luckyColor: "白",
    colorCode: "#e0e0e0",
    badgeColor: "rgba(224, 224, 224, 0.2)",
    action: "不要なものを手放そう",
    // 金属性: Lightning Release（雷遁）を持つキャラ → クール・知性系
    keywords: ["Lightning Release"],
  },
  4: {
    name: "水",
    luckyColor: "青",
    colorCode: "#2196f3",
    badgeColor: "rgba(33, 150, 243, 0.25)",
    action: "柔軟に流れに乗ろう",
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

// ============================================================
// DOM 要素の取得
// ============================================================
const btnDivine  = document.getElementById("btnDivine");
const loadingEl  = document.getElementById("loading");
const errorMsgEl = document.getElementById("errorMsg");
const resultEl   = document.getElementById("result");

// 結果表示用の各要素
const gogyouBadge  = document.getElementById("gogyouBadge");
const gogyouNameEl = document.getElementById("gogyouName");
const charImageEl  = document.getElementById("charImage");
const charNameEl   = document.getElementById("charName");
const luckyColorEl = document.getElementById("luckyColor");
const colorDotEl   = document.getElementById("colorDot");
const luckyActionEl = document.getElementById("luckyAction");

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
 */
function showResult(gogyou, character) {
  // --- 五行バッジ ---
  gogyouNameEl.textContent = gogyou.name;
  gogyouBadge.style.background = gogyou.badgeColor;
  gogyouBadge.style.borderColor = gogyou.colorCode;
  gogyouNameEl.style.color = gogyou.colorCode;

  // --- キャラクター画像 ---
  // images 配列の最初の URL を使用。なければプレースホルダーを表示
  const imageUrl = Array.isArray(character.images) && character.images.length > 0
    ? character.images[0]
    : "";

  if (imageUrl) {
    charImageEl.src = imageUrl;
    charImageEl.alt = character.name + "の画像";
    // 画像読み込みエラー時のフォールバック
    charImageEl.onerror = () => {
      // 2枚目の画像があれば試みる
      if (character.images.length > 1) {
        charImageEl.src = character.images[1];
      } else {
        charImageEl.style.display = "none";
      }
    };
  } else {
    charImageEl.style.display = "none";
  }

  // --- キャラクター名 ---
  charNameEl.textContent = character.name;

  // --- ラッキーカラー ---
  luckyColorEl.textContent = gogyou.luckyColor;
  colorDotEl.style.backgroundColor = gogyou.colorCode;

  // --- 開運アクション ---
  luckyActionEl.textContent = gogyou.action;

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
    // （同じ日は同じ五行だが、キャラはランダム抽出）
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
    // natureType に五行対応キーワードが含まれるキャラを抽出
    let filtered = characters.filter((c) =>
      hasKeyword(c.natureType, gogyou.keywords)
    );

    // フィルタ結果が空の場合は全キャラからランダム選択（フォールバック）
    if (filtered.length === 0) {
      filtered = characters;
    }

    // --- Step 4: 候補からランダムに 1 体選ぶ ---
    const chosen = pickRandom(filtered);

    // --- Step 5: 結果を表示 ---
    hideLoading();
    showResult(gogyou, chosen);

  } catch (error) {
    // エラー処理: ユーザーにわかりやすいメッセージを表示
    hideLoading();

    // ネットワークエラーと API エラーを区別して表示
    if (error instanceof TypeError && error.message.includes("fetch")) {
      showError(
        "ネットワークに接続できませんでした。\nインターネット接続を確認してから再度お試しください。"
      );
    } else {
      showError(
        `データの取得に失敗しました。\n${error.message}\n\nしばらく待ってから再度お試しください。`
      );
    }

    // デバッグ用にコンソールにも出力
    console.error("[守護忍診断] エラー:", error);
  }
}

// ============================================================
// イベントリスナー登録
// ============================================================

// ボタンクリックで診断を実行
btnDivine.addEventListener("click", runDivination);
