/* ==========================================================
   サンプルアドオン② 選んだ文字を好きな記号で囲う
   ----------------------------------------------------------
   標準の「太字」ボタン（**ああ**）と同じ仕組みです。
   ・🖍 == ボタン … いつも == で囲う／外す
   ・🔤 囲う ボタン … 押すたびに記号をきいてくる
   どちらも、もう一度押すと囲みを外します（トグル）。
   使い方: ⚙設定 > アドオン > 「アドオン(.js)を読み込む」でこのファイルを選ぶ
   ========================================================== */
(function(){

  /* 選んだ文字を left ... right で囲う。すでに囲まれていれば外す。 */
  function toggleWrap(ta, left, right){
    var v = ta.value;
    var s = ta.selectionStart, e = ta.selectionEnd;
    var sel = v.substring(s, e);
    var out, newStart, newEnd;

    /* 記号「ごと」選んでいる場合  例: 選択が **ああ** */
    var inside = left.length + right.length <= sel.length
              && sel.slice(0, left.length) === left
              && sel.slice(sel.length - right.length) === right;

    /* 記号の「内側だけ」選んでいる場合  例: **[ああ]** */
    var outside = !inside
              && s - left.length >= 0
              && v.substring(s - left.length, s) === left
              && v.substring(e, e + right.length) === right;

    if(inside){
      out = sel.slice(left.length, sel.length - right.length);
      newStart = s; newEnd = s + out.length;
    }else if(outside){
      s = s - left.length;
      e = e + right.length;
      out = sel;
      newStart = s; newEnd = s + out.length;
    }else{
      out = left + sel + right;
      newStart = s + left.length;
      newEnd = newStart + sel.length;
    }

    ta.focus();
    ta.setSelectionRange(s, e);
    var ok = false;
    try{ ok = !!document.execCommand('insertText', false, out); }
    catch(err){ ok = false; }
    if(!ok){
      ta.value = v.substring(0, s) + out + v.substring(e);
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
    ta.setSelectionRange(newStart, newEnd);
    ta.focus();
  }

  MDEditor.registerPlugin({
    name: '好きな記号で囲う',
    init: function(api){

      api.addToolbarButton({
        id: 'wrapHighlight',
        label: '🖍 ==',
        title: '選んだ文字を == で囲う／外す',
        onClick: function(ta){ toggleWrap(ta, '==', '=='); }
      });

      api.addToolbarButton({
        id: 'wrapAny',
        label: '🔤 囲う',
        title: '好きな記号で囲う（押すたびに記号をきく）',
        onClick: function(ta){
          var ans = prompt(
            '囲む記号を入れてください。\n' +
            '例: **   __   ~~   ==\n' +
            '左右で違う記号にしたいときは | で区切ります（例: <b>|</b> ）',
            '**'
          );
          if(ans === null) return;              // キャンセル
          var parts = ans.split('|');
          var left  = parts[0];
          var right = (parts.length > 1) ? parts[1] : parts[0];
          if(left === '' && right === '') return;
          toggleWrap(ta, left, right);
        }
      });

    }
  });

})();
