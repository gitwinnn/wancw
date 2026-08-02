/* =========================================================================
   MD Editor アドオン: 「戻るボタン」（元に戻す）
   -------------------------------------------------------------------------
   何をするアドオンか:
     ツールバーに ↶ 戻る ボタンを追加する。押すと「直前のチェックポイント」
     まで本文を巻き戻す。

   なぜ「独自のチェックポイント方式」なのか（背景）:
     ブラウザのtextareaにはネイティブのUndo（Ctrl+Z）が元々備わっている。
     MDエディタ本体のツールバー処理（太字・見出し挿入など）も
     document.execCommand('insertText', ...) を使っているため、ネイティブの
     Undo履歴と一応は噛み合う。
     しかし、
       ・execCommand は仕様上「非推奨(deprecated)」であり、将来のブラウザ
         更新で undo だけ挙動が変わる/使えなくなるリスクがある
       ・タブを切り替えたり、プラグインが api.setContent() で本文を書き換え
         た場合、ネイティブUndo履歴と実際の内容がズレることがある
     という弱点があるため、このアドオンでは「本文の変更を自前で記録して
     おき、ボタンを押したら1つ前の記録に戻す」という、ブラウザのUndo機能に
     一切依存しない独立した仕組みにしている。こちらの方が動作の予測が
     つきやすく、信頼度が高い。

   チェックポイントの粒度について（重要な仕様）:
     1文字打つたびに記録すると「あ」→戻る→「」のように1文字ずつしか
     戻せず不便なので、「1.2秒以上入力が止まったら1つの区切り（保存点）
     とみなす」方式にしている。つまり戻るボタンは「ひとかたまりの入力を
     まとめて取り消す」動きになる（一般的なテキストエディタのUndoに近い
     挙動）。この間隔は下の CHECKPOINT_MS の値を変えれば調整できる。

   既知の制限（正直に明記する）:
     ・タブごとに履歴を持つが、この履歴はブラウザのタブ/ページを閉じる、
       またはMDエディタのタブを閉じると消える（保存されない・一時的な
       ものである）
     ・「戻る」に対応する「進む（redo）」は今回未実装（必要なら拡張可能）
     ・MDEditorの内部イベントは現状 'content-change' のみが実際に発火して
       いる（ヘルプ画面の説明文には 'save' 等も列挙されているが、
       ソースコード上は未実装。2026-07時点でのファイル内容を確認した限り
       の実装ベースの記述であり、確度は高いが将来のコード変更で変わり
       うる）。そのため、このアドオンも 'content-change' だけを使う設計
       にしてある。

   使い方（設定画面からの読み込み手順）:
     「⚙️ 設定」→「プラグイン」→「📥 プラグイン(.js)を読み込む」で
     このファイルを選択する。詳しい手順はチャット本文の説明を参照。
   ========================================================================= */
(function(){
  "use strict";

  MDEditor.registerPlugin({
    name: '戻るボタン（独自チェックポイント式Undo）',
    init(api){

      // ---- 調整用パラメータ ----
      const CHECKPOINT_MS = 1200;   // これ以上入力が止まったら新しい区切りにする(ミリ秒)
      const HISTORY_LIMIT  = 200;   // 1タブあたり最大何区切りまで覚えておくか

      // タブID -> {stack:[本文の履歴...], lastAt:最終記録時刻, restoring:自分自身の書き換え中フラグ}
      const historyByTab = {};

      function getState(tab){
        if(!historyByTab[tab.id]){
          historyByTab[tab.id] = {
            stack: [tab.content],   // 初期状態を最初の1件として記録
            lastAt: Date.now(),
            restoring: false
          };
        }
        return historyByTab[tab.id];
      }

      // 本文が変わるたびに呼ばれる（textareaのinputイベント経由）
      api.on('content-change', (tab)=>{
        const st = getState(tab);

        // 「戻る」ボタン自身がsetContent()で書き換えている最中は記録しない
        // （記録してしまうと、戻った直後の状態がまた1件積まれて
        //   「連打しても2回目から戻れない」という不具合になる）
        if(st.restoring) return;

        const now = Date.now();
        if(now - st.lastAt > CHECKPOINT_MS){
          // 一定時間が空いた → 新しい区切りとして積む
          st.stack.push(tab.content);
          if(st.stack.length > HISTORY_LIMIT){
            st.stack.shift(); // 古いものから捨てる（無限に増やさない）
          }
        } else {
          // まだ同じ区切りの最中 → 最新内容で「上書き」する（1文字ごとに
          // 積み上げない。これにより粒度が粗くなり実用的な戻る動作になる）
          st.stack[st.stack.length - 1] = tab.content;
        }
        st.lastAt = now;
      });

      api.addToolbarButton({
        id: 'backButton',
        label: '↶ 戻る',
        title: '直前のチェックポイントまで本文を戻す（アドオン独自のUndo。約' + (CHECKPOINT_MS/1000) + '秒の入力停止ごとに区切りを記録）',
        onClick(ta){
          const tab = api.getActiveTab();
          if(!tab){
            alert('編集中のタブがありません。');
            return;
          }
          const st = getState(tab);

          if(st.stack.length <= 1){
            alert('これ以上は戻れません（記録されている履歴の先頭です）。');
            return;
          }

          // 今の内容（最新）を履歴から降ろし、1つ前の内容を復元する
          st.stack.pop();
          const prevContent = st.stack[st.stack.length - 1];

          st.restoring = true;
          api.setContent(prevContent);   // これがcontent-changeを誤って再記録しないようフラグで保護
          st.restoring = false;
          st.lastAt = Date.now();

          if(ta) ta.focus();
        }
      });
    }
  });
})();
