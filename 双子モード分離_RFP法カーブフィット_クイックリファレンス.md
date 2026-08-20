# 双子モード分離｜RFP法カーブフィット クイックリファレンス

現物ファイル：`双子モード分離_RFP法カーブフィット.xlsx`／詳しい解説：`双子モード分離_RFP法カーブフィット_使い方.html`
このメモだけあれば、HTMLを開けない時でも最低限の操作ができます。

---

## 1. これは何？

1つの山に見えるピークが「近い周波数の2つの山（双子モード）」だったとき、**RFP法（有理多項式法／Richardson & Formenti, 1982）**でExcelの数式だけ（Solver不要）で2つに自動分離し、各モードの固有振動数fn・損失係数ηを出す。

## 2. カーブフィット法おすすめ比較（結論だけ）

| 手法 | 山が重なった場合 | Excel実装 | 判定 |
|---|---|---|---|
| 半値幅法 | ✕不可 | ◎簡単 | 孤立1山専用 |
| サークルフィット(Kennedy-Pancu 1947) | ✕不可 | ○ | 孤立1山を精密に |
| 1自由度・逆FRF(既存の鉄板WB) | ✕不可 | ◎ | 孤立1山の高精度計測 |
| **RFP法(Richardson-Formenti 1982)** | **◎2山まで** | **○数式のみ** | **★本命** |
| LSCE/ITD/ERA(時間領域) | ◎多数可 | ✕SVD等が必要 | Excel非現実的 |
| PolyMAX(Peeters et al. 2004) | ◎◎最強 | ✕✕原理的に不可 | 専用ソフト前提 |

実測比較研究(Zrayka & Mucchi, 2019, SN Applied Sciences)でも損失係数の精度・安定性はRFP法が最良と報告。

## 3. 5ステップ

1. 「設定」シート：基準周波数fref（帯域の中心）とデータ形式（実部虚部／振幅位相）を入力
2. 「データ入力」シート：双子モードを含む帯域のFRFデータを4行目から貼付（20〜80点）
3. 再計算（LibreOffice: Ctrl+Shift+F9）
4. 「モード分離結果」シート最上部の緑★セルを見る＝答え
5. 「検算」シートで総合判定が🟢OKか確認（サンプルデータのままの時だけ有効）

## 4. 判定「要確認」が出たら

| メッセージ | 意味 | 対処 |
|---|---|---|
| 前提条件(P<0)不成立 | 三角関数解法の前提外 | グラフで山が本当に2つか確認／既存ガイド4-5節のSolver法で照合 |
| 損失係数が近すぎる境界 | η1≈η2の数値的な境界 | 分解能Δfを細かく再測定／Solver法で照合 |
| 負の値が発生 | fref設定ズレ・帯域不適切 | frefを帯域中心に再設定 |

## 5. 主要な数式（開発者向け・検算用）

```
【正規化】 Ω = 2π・f / ωref  （ωref = 2π・fref）

【RFP実部行】 b0=1, b1=0, b2=-(Ω^2), b3=0,
              a0=-Re, a1=Ω・Im, a2=Ω^2・Re, a3=-(Ω^3・Im),  RHS=Ω^4・Re

【RFP虚部行】 b0=0, b1=Ω, b2=0, b3=-(Ω^3),
              a0=-Im, a1=-Ω・Re, a2=Ω^2・Im, a3=Ω^3・Re,   RHS=Ω^4・Im

【最小二乗解】 係数 = (AᵀA)⁻¹ Aᵀc   ← MMULT・MINVERSE・TRANSPOSE

【4次→2次分解(フェラリ法)】
  p=a2-3a3²/8, q=a1-a2a3/2+a3³/8, r=a0-a1a3/4+a2a3²/16-3a3⁴/256
  Ac2=2p, Ac1=p²-4r, Ac0=-(q²)
  P=Ac1-Ac2²/3, Q=2Ac2³/27-Ac2Ac1/3+Ac0
  m=2√(-P/3), θ=ACOS(3Q/(Pm))/3
  u1,u2,u3 = m・cos(θ-2πk/3)-Ac2/3  (k=0,1,2)
  → 桁落ち対策：|値|最大のものをu_safeとして直接採用、
    残り2根はヴィエタの公式(B'=Ac2+u_safe, C'=-Ac0/u_safe)で
    「引き算せず」割り算主体で求める(deflation)
  u=MAX(全候補,0), α=√u
  p1=a3/2+α, q1=a3²/16+a3α/4+β
  p2=a3/2-α, q2=a3²/16-a3α/4+γ

【物理量】 ωn=√q, ζ=p/(2ωn), fn=ωn×fref, η=2ζ
```

⚠️ **Excel特有の罠**：`-2^2` は `(-2)^2=4` と計算される（`-(2^2)=-4` ではない）。
マイナスの2乗・4乗を書く時は必ず `-(セル^2)` と括弧で囲む。

## 6. 検算用の既知の答え（21点サンプルデータ）

- モードA：fn ≈ 3480.01 Hz／η ≈ 0.006004
- モードB：fn ≈ 3520.00 Hz／η ≈ 0.007992
- （Python NumPyの厳密解＝numpy.rootsと、Excel上のフェラリ閉形式解の両方で一致確認済み）

## 7. 出典（一次情報）

- Richardson, M.H. & Formenti, D.L. (1982) "Parameter Estimation from Frequency Response Measurements using Rational Fraction Polynomials" Proc. 1st IMAC, pp.167-186 ― RFP法原典
- Kennedy, C.C. & Pancu, C.D. (1947) "Use of Vectors in Vibration Measurement and Analyses" J. Aeronautical Sciences 14(11) ― サークルフィット原典
- Peeters, B. et al. (2004) "The PolyMAX Frequency-Domain Method" Shock and Vibration 11(3-4):395-409, DOI:10.1155/2004/523692 ― PolyMAX原典
- Zrayka, A.K. & Mucchi, E. (2019) "A comparison among modal parameter extraction methods" SN Applied Sciences 1:781, DOI:10.1007/s42452-019-0806-8 ― 手法比較の実測検証
- 詳細な出典リストは使い方.html 第9部を参照

---
*詳しい理論・手取り足取りの解説・トラブルシューティングは `双子モード分離_RFP法カーブフィット_使い方.html` を参照してください。*
