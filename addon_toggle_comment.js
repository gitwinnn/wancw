/* ==========================================================
   サンプルアドオン① コメントのON/OFF（トグル・複数行対応）
   ----------------------------------------------------------
   選んだ行の先頭に ' を付ける／外すを、押すたびに切り替えます。

     ああああ            ボタン         'ああああ
     ああああ   ------>  を押す  ----->  'ああああ
     ああああ                            'ああああ

   もう一度押すと元に戻ります。
   コメント記号は下の MARK を書き換えれば // や # にもできます。
   使い方: ⚙設定 > アドオン > 「アドオン(.js)を読み込む」でこのファイルを選ぶ
   ========================================================== */
(function(){

  var MARK = "'";          // ← ここを '//' や '#' に変えてもよい
  var BTN_ID = 'toggleComment';

  function leadSpace(line){
    var m = line.match(/^\s*/);
    return m[0];
  }
  function isCommented(line){
    var w = leadSpace(line);
    return line.substr(w.length, MARK.length) === MARK;
  }
  function addMark(line){
    var w = leadSpace(line);
    return w + MARK + line.slice(w.length);
  }
  function removeMark(line){
    var w = leadSpace(line);
    return w + line.slice(w.length + MARK.length);
  }

  MDEditor.registerPlugin({
    name: 'コメントのON/OFF',
    init: function(api){
      api.addToolbarButton({
        id: BTN_ID,
        label: '💬 ' + MARK,
        title: 'コメントのON/OFF（選んだ行すべて／もう一度押すと解除）',
        onClick: function(ta){
          var v = ta.value;
          var s = ta.selectionStart, e = ta.selectionEnd;

          /* --- ① 選択範囲を「行のかたまり」に広げる --- */
          var bs = v.lastIndexOf('\n', s - 1) + 1;
          var tail = (e === s) ? e : (v.charAt(e - 1) === '\n' ? e - 1 : e);
          var nl = v.indexOf('\n', tail);
          var be = (nl === -1) ? v.length : nl;
          if(be < bs) be = bs;

          var lines = v.substring(bs, be).split('\n');

          /* --- ② 空行以外が全部コメントなら「外す」、違えば「付ける」 --- */
          var target = lines.filter(function(l){ return l.trim() !== ''; });
          if(target.length === 0) target = lines;
          var allCommented = target.every(isCommented);

          var out = lines.map(function(l){
            if(allCommented) return isCommented(l) ? removeMark(l) : l;
            if(l.trim() === '') return l;        // 空行はそのまま
            return isCommented(l) ? l : addMark(l);
          }).join('\n');

          /* --- ③ 書き換え。execCommand を使うと Ctrl+Z が効く --- */
          ta.focus();
          ta.setSelectionRange(bs, be);
          var ok = false;
          try{ ok = !!document.execCommand('insertText', false, out); }
          catch(err){ ok = false; }
          if(!ok){
            ta.value = v.substring(0, bs) + out + v.substring(be);
            ta.dispatchEvent(new Event('input', { bubbles: true }));
          }

          /* --- ④ 選び直さずに続けて押せるよう、範囲を選び直してフォーカスを戻す --- */
          ta.setSelectionRange(bs, bs + out.length);
          ta.focus();
        }
      });
    }
  });

})();
