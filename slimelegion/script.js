// === 定数定義 ===
const board = document.getElementById("board");
const types = ["R", "G", "B", "Y"];
const maxLevel = 7;
const width = 6, height = 6;
let grid = [];
let lastSwapSource = null; // 移動元を記録
let lastSwapTarget = null; // スワップのターゲットを記録
let isGameActive = false; // ゲームが開始されているかどうかを管理

// === ロングプレス削除のタイマー管理 ===
let pressTimer = null;

// === 初期化関数 ===
function init() {
  board.innerHTML = "";
  grid = [];
  lastSwapSource = null;
  lastSwapTarget = null;
  isGameActive = false; // 初期化時は操作を無効化

  for (let i = 0; i < width * height; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const level = 1;
    grid.push({ type, level });
  }

  renderBoard();
}

// === 盤面描画処理 ===
function renderBoard() {
  board.innerHTML = "";
  grid.forEach((slime, i) => {
    const cell = document.createElement("div");
    cell.className = "cell";

    if (slime.type === " ") {
      cell.classList.add("empty");
    } else {
      cell.classList.add(`${slime.type}${slime.level}`);
    }

    // 番号を左上に表示
    const indexLabel = document.createElement("div");
    indexLabel.className = "index";
    indexLabel.textContent = i;
    cell.appendChild(indexLabel);

    // レベルを右上に表示
    if (slime.type !== " ") {
      const levelLabel = document.createElement("div");
      levelLabel.className = "level";
      levelLabel.textContent = `Lv${slime.level}`;
      cell.appendChild(levelLabel);
    }

    cell.draggable = isGameActive; // ゲームがアクティブでない場合はドラッグを無効化

    // セルをクリックしてキャラとレベルを配置
    cell.onclick = () => {
      if (selectedCharacter) {
        grid[i] = { type: selectedCharacter, level: selectedLevel }; // 選択されたキャラとレベルを配置
        renderBoard(); // 再描画
      }
    };

    board.appendChild(cell);
  });
}

// === スライムの入れ替え処理 ===
function handleSwap(from, to) {
  if (from < 0 || from >= grid.length || to < 0 || to >= grid.length) {
    console.error("Invalid swap indices:", from, to);
    return;
  }
  const dx = Math.abs((from % width) - (to % width));
  const dy = Math.abs(Math.floor(from / width) - Math.floor(to / width));
  if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
    [grid[from], grid[to]] = [grid[to], grid[from]];
    lastSwapSource = from; // 移動元を記録
    lastSwapTarget = to;   // 移動先を記録
    renderBoard();
    setTimeout(() => checkMatches(true), 200);
  } else {
    console.warn("Invalid swap attempt between non-adjacent cells:", from, to);
  }
}

// マッチ探索を共通化する関数
function findMatches(startIndex, step, limit, condition) {
  const matches = [startIndex];
  for (let i = 1; i < limit; i++) {
    const nextIndex = startIndex + step * i;
    if (condition(nextIndex)) {
      matches.push(nextIndex);
    } else {
      break;
    }
  }
  return matches;
}

// checkMatches関数のリファクタリング
function checkMatches(isSwap = false) {
  let matchedGroups = [];
  const visited = new Set();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const base = grid[i];
      if (base.type === " " || visited.has(i)) continue;

      // 水平方向のマッチ探索
      const horizontal = findMatches(i, 1, width - x, (ni) => {
        const neighbor = grid[ni];
        return neighbor.type === base.type && neighbor.level === base.level;
      });

      // 垂直方向のマッチ探索
      const vertical = findMatches(i, width, height - y, (ni) => {
        const neighbor = grid[ni];
        return neighbor.type === base.type && neighbor.level === base.level;
      });

      // 横方向のマッチを追加
      if (horizontal.length >= 3 && !visited.has(i)) {
        horizontal.forEach(idx => visited.add(idx));
        matchedGroups.push(horizontal);
      }

      // 縦方向のマッチを追加
      if (vertical.length >= 3 && !visited.has(i)) {
        vertical.forEach(idx => visited.add(idx));
        matchedGroups.push(vertical);
      }
    }
  }

  if (matchedGroups.length === 0) return;

  // マッチごとにディレイを追加して処理
  let delay = 0;
  matchedGroups.forEach((group, index) => {
    setTimeout(() => {
      group = [...new Set(group)].sort((a, b) => a - b);
      const base = grid[group[0]];
      const matchCount = group.length;

      // 全マッチ位置を空に
      group.forEach(i => grid[i] = { type: " ", level: 0 });

      if (matchCount === 3) {
        // 3マッチの場合、ドラッグによる移動元または移動先に生成
        let targetIndex;
        if (isSwap && group.includes(lastSwapSource)) {
          targetIndex = lastSwapSource; // 移動元に生成
        } else if (isSwap && group.includes(lastSwapTarget)) {
          targetIndex = lastSwapTarget; // 移動先に生成
        } else {
          targetIndex = group[Math.floor(group.length / 2)]; // 通常は中央に生成
        }

        grid[targetIndex] = {
          type: base.type,
          level: Math.min(base.level + 1, maxLevel),
          isMerged: true, // アニメーション用のフラグを設定
        };
        const logMessage = `✨ ${slimeNames[base.type]}がレベル${base.level}からレベル${Math.min(base.level + 1, maxLevel)}に進化しました！（位置: ${targetIndex}）`;
        console.log(logMessage);
        addLog(logMessage, base.type); // スライムの種類を渡す
      } else {
        // 4マッチ以上の場合、通常の処理
        const spawnCount = Math.min(matchCount - 2, 4); // 3体で1、4体で2、5体で3、6体で4
        const startIndex = 1; // 両端を除いた範囲の開始
        const endIndex = matchCount - 2; // 両端を除いた範囲の終了
        for (let i = 0; i < spawnCount; i++) {
          const targetIndex = group[startIndex + i];
          if (targetIndex !== undefined) {
            grid[targetIndex] = {
              type: base.type,
              level: Math.min(base.level + 1, maxLevel),
              isMerged: true, // アニメーション用のフラグを設定
            };
            const logMessage = `🔥 ${slimeNames[base.type]}がレベル${base.level}からレベル${Math.min(base.level + 1, maxLevel)}に進化！（位置: ${targetIndex}）`;
            console.log(logMessage);
            addLog(logMessage, base.type); // スライムの種類を渡す
          }
        }
      }

      renderBoard(); // 盤面を再描画

      // 最後のマッチ処理後に重力を適用
      if (index === matchedGroups.length - 1) {
        setTimeout(() => {
          applyGravity(); // 重力処理を適用
        }, 1000); // 最後のマッチ後に少しディレイを追加
      }
    }, delay);

    delay += 1000; // 各マッチの間に0.5秒のディレイを追加
  });
}

// === 重力処理 ===
function applyGravity() {
  for (let col = 0; col < width; col++) {
    let stack = [];
    for (let row = height - 1; row >= 0; row--) {
      const i = row * width + col;
      if (grid[i].type !== " ") {
        stack.push(grid[i]); // スライムをスタックに追加
      }
    }
    for (let row = height - 1; row >= 0; row--) {
      const i = row * width + col;
      if (stack.length > 0) {
        grid[i] = stack.shift(); // スライムを下に詰める
      } else {
        // 空白を埋めるために新しいスライムを生成
        const type = types[Math.floor(Math.random() * types.length)];
        const level = 1;
        grid[i] = { type, level, isFalling: true }; // 新しいスライムに落下フラグを設定
      }
    }
  }

  renderBoard(); // 盤面を再描画

  // 落下アニメーションをリセット
  setTimeout(() => {
    grid.forEach(slime => {
      if (slime.isFalling) {
        slime.isFalling = false; // 落下フラグをリセット
      }
    });
    renderBoard(); // 再描画
    checkMatches(false); // 重力処理後にマッチを即時チェック
  }, 500); // アニメーションの継続時間に合わせる
}

// === ログを画面下に表示する関数 ===
function addLog(message, type) {
  const logContainer = document.getElementById("logContainer");
  const logEntry = document.createElement("div");

  logEntry.textContent = message;
  logEntry.style.padding = "5px";
  logEntry.style.borderBottom = "1px solid #555";
  logEntry.style.color = "#fff";
  logEntry.style.fontFamily = "monospace";

  // スライムの種類に応じて背景色を設定
  switch (type) {
    case "R": // ドラキュラ
      logEntry.style.backgroundColor = "#800080"; // 紫
      break;
    case "B": // オーロラ
      logEntry.style.backgroundColor = "#ffa500"; // オレンジ
      break;
    case "Y": // 名無し
      logEntry.style.backgroundColor = "#0000ff"; // 青
      break;
    case "G": // 預言者
      logEntry.style.backgroundColor = "#008000"; // 緑
      break;
    default:
      logEntry.style.backgroundColor = "#333"; // デフォルト
      break;
  }

  logContainer.appendChild(logEntry);

  // スクロールを最新のログに合わせる
  logContainer.scrollTop = logContainer.scrollHeight;
}

// === ボタンのイベントリスナー追加 ===
document.getElementById("resetButton").addEventListener("click", () => {
  init(); // 盤面をリセット
});

document.getElementById("checkButton").addEventListener("click", () => {
  if (isGameActive) {
    checkMatches(false); // 現在の盤面でマッチを確認
  }
});

document.getElementById("startButton").addEventListener("click", () => {
  isGameActive = true; // ゲームを開始
  renderBoard(); // 操作可能な状態で再描画
  checkMatches(false); // スタート時に盤面をチェック
});

const slimeNames = {
  R: "ドラキュラ",
  B: "オーロラ",
  Y: "名無し",
  G: "預言者",
};

let selectedCharacter = null; // 現在選択されているキャラ
let selectedLevel = 1; // 現在選択されているレベル（デフォルトは1）

// キャラクターボタンのイベントリスナーを追加
document.querySelectorAll(".character-button").forEach(button => {
  button.addEventListener("click", (e) => {
    selectedCharacter = e.target.dataset.type; // ボタンのデータ属性からキャラタイプを取得
    console.log(`選択されたキャラ: ${slimeNames[selectedCharacter]}`);
  });
});

document.getElementById("levelSelector").addEventListener("change", (e) => {
  selectedLevel = parseInt(e.target.value, 10); // 選択されたレベルを取得
  console.log(`選択されたレベル: Lv${selectedLevel}`);
});

// 初期化を実行
init();
