# 生保1 過去問DB 精密化エージェント規約

## 1. Purpose

このリポジトリは、日本アクチュアリー会「生保1」二次試験の過去問について、

- 過去問問題
- 公式解答
- 生保1教科書
- 必要に応じて金融庁・e-Gov・日本アクチュアリー会等の公式資料

を精密に対応付けるためのデータベースおよびビューアである。

最終目的は、

「この問題の公式解答を書くために、教科書のどの箇所を読むべきか」

を設問単位で可能な限り正確に示すことである。

単にテーマとして関連する章を紐付けるのではなく、
答案の論点を直接説明する最も具体的な節・小節へ対応付ける。


---

# 2. Source of Truth

正本データは以下とする。

`seiho1_kakomon_db_H10-H29_2018-2025_refpanel.csv`

このCSVを唯一のsource of truthとする。

以下は正本ではない。

- index.html 内の QUESTION_DATA
- kakomon_dual_viewer.html 内の QUESTION_DATA
- 過去のaudit結果
- proposed_patch.json
- verification_result.json
- semantic_routing.csv
- その他の中間成果物

HTML内のQUESTION_DATAを直接正本として編集してはならない。

正本CSV更新後にHTMLを再生成すること。


---

# 3. Evidence Priority

mappingを判断するときの証拠優先順位は以下。

1. 過去問の問題本文
2. 当該年度の公式解答
3. 生保1教科書本文
4. 金融庁・e-Gov・日本アクチュアリー会等の一次資料
5. 既存DBのtheme、keywords、heading、related、memo等
6. semantic_routing / content_routing / 類似度

既存DBの

- theme
- keywords
- cluster
- heading
- related
- memo
- references_json

を正しいものと仮定してはならない。

これら自身が今回の検証対象である。


---

# 4. 基本判断原則

教科書との対応は単なるキーワード一致で判断してはならない。

最重要基準は、

「公式解答の答案を書くために、その教科書箇所を読めば主要論点を導出できるか」

である。

テーマとして関連するだけの箇所をPrimaryにしてはならない。

Primary referenceは、
公式解答の中心論点を最も直接的に説明する教科書箇所とする。

複数論点にまたがる場合は、
無理に1箇所へ集約せず、
Secondary / Related referenceとして追加する。


---

# 5. PDFページの扱い

PDFページ番号は必ず区別する。

- PDF物理ページ
- 教科書本文に印刷された内部ページ番号

`pdf_page`
`textbook_path#page=N`

には、実際にPDFビューアで開くPDF物理ページを使用する。

例：

`textbooks/hoken1-seiho_06.pdf#page=7`

なら、

`pdf_page = 7`

でなければならない。

`pdf_page` と `textbook_path#page=` の不一致は禁止。

headingは原則として、
その節・小節が開始するPDF物理ページを指定する。

ただし答案に直接対応する説明が次ページ以降へ続く場合は、
memoまたはevidenceにその旨を記載する。


---

# 6. 精密化ルール：章タイトル参照の禁止

ここでいう `primary_heading` は、
正本CSVの `heading` を意味する。

primary_heading が章タイトルのみの場合、
原則として PASS_NO_CHANGE にしてはならない。

例：

- 第1章 営業保険料
- 第3章 アセット・シェア
- 第6章 団体生命保険
- 第8章 再保険
- 第10章 利源分析・収支分析等

のような章レベル参照については、
問題本文および公式解答を直接説明する節・小節が存在しないか、
必ず当該章全体を探索すること。

## 判定ルール

### 6.1 より直接的な節・小節が存在する

修正候補とする。

### 6.2 複数の節・小節が候補となり、一意に決定できない

HUMAN_REVIEW とする。

### 6.3 教科書に適切な節・小節が本当に存在しない

章全体参照が最適であることを一次資料から説明できる場合のみ
PASS_NO_CHANGEを許可する。

### 6.4 semantic/content routingとの関係

content_routing / semantic_routing 上で、
現在の参照ページが候補1位でない場合、

章タイトル参照をPASS_NO_CHANGEにするには、

- 問題本文
- 公式解答
- 教科書本文

による明示的な理由を要求する。


---

# 7. 精密化ルール：節レベル参照

章タイトルだけでなく、
節レベルで止まっているmappingについても確認する。

例：

`3.3 アセット・シェアの活用`

の下に、

`3.3.3 配当率設定・確認への活用`

のような、より直接的な小節が存在する場合、
公式解答に直接対応する小節を優先する。

現在の参照が「間違いではない」というだけでは
PASS_NO_CHANGEにしてはならない。

PASS_NO_CHANGEは、

「現在の参照が最も具体的かつ最適」

と確認できた場合のみ使用する。


---

# 8. 広すぎるrelatedの精密化

以下のようなrelatedは再検証対象とする。

- 「1.2～1.5」
- 「3章全般」
- 「団体生命保険の危険選択・団体要件・配当」
- 複数節を一括した広範囲な記述

relatedは、

「答案を書くために実質的に補助となる教科書箇所」

だけを設定する。

単なるテーマ上の関連知識はrelatedへ追加しない。

不要なrelatedは削除する。

Primaryだけで十分な場合はrelatedを空欄としてよい。


---

# 9. memo精密化

以下のような汎用memoは、
原則として改善候補とする。

例：

「公式過去問ページから追加。」
「問題・解答ページ対応を設問単位で設定。」
「小問テーマに近い見出しへ寄せ直し。」

memoには可能な限り、

- 公式解答の主要論点
- Primaryを選んだ理由
- Relatedを選んだ理由
- 教科書に直接記載がない公式解答固有論点

を簡潔に記載する。


---

# 10. semantic_routing / content_routing

semantic_routing、
content_routing、
n-gram比較、
OCR類似度等は、

「候補ページを探索するため」

にのみ使用する。

類似度順位だけでmappingを変更してはならない。

最終判断は必ず、

問題本文
→ 公式解答
→ 教科書本文

の順に一次資料を確認して行う。

semantic_routingの1位だから正しい、
現在ページが5位だから間違い、
という判断は禁止する。


---

# 11. OCRについて

PDFから通常のテキスト抽出が正常に行える場合は、
OCRを優先して使用しない。

文字化け、画像PDF、抽出不能等の場合のみOCRを補助的に使用する。

OCR結果だけを根拠としてmappingを決定してはならない。

必要に応じてPDF物理ページそのものを確認する。


---

# 12. AUDIT

全設問について監査を行う。

各設問で以下を確認する。

1. 問題本文
2. 公式解答
3. 現在の教科書参照
4. 当該章内のより直接的な候補
5. 必要に応じて他章の候補
6. related
7. memo
8. references_json

問題および公式解答から、
設問の主要論点を1～3個程度へ分解する。

その後、
現在のmappingが答案論点を直接説明しているか判定する。


---

# 13. AUDIT判定

監査結果は原則以下に分類する。

## PASS_NO_CHANGE

現在のmappingが、
一次資料を確認した結果、
最も具体的かつ最適である。

## FIX_CANDIDATE

より適切なmappingが存在する。

## HUMAN_REVIEW

複数候補が存在する、
一次資料だけでは一意に決められない、
またはFixerとReviewerの判断が一致しない。

「間違いとは断定できない」という理由だけで
PASS_NO_CHANGEにしてはならない。


---

# 14. FIXER

FIX_CANDIDATEについて修正案を作成する。

監査結果を鵜呑みにしてはならない。

Fixer自身でも、

1. 問題本文
2. 公式解答
3. 現在の教科書参照
4. 修正候補

を確認する。

Primaryとして、

- textbook
- heading
- pdf_page
- internal_page
- textbook_path

を決定する。

必要に応じて、

- related
- memo
- references_json
- reference_count
- reference_summary

も同期修正する。


---

# 15. INDEPENDENT REVIEWER

修正案は必ず独立検証する。

Reviewerは可能な限り、
Fixerの理由・confidenceを先に読まず、

1. 問題本文
2. 公式解答
3. 教科書本文

から自分自身で最適mappingを判断する。

その後Fixer案と比較する。


---

# 16. Reviewer判定

以下を使用する。

- PASS
- PASS_WITH_MINOR_FIX
- REJECT_KEEP_CURRENT
- REJECT_OTHER_MAPPING
- HUMAN_REVIEW

自動反映可能なのは原則としてPASSのみ。

PASS_WITH_MINOR_FIXは
自動適用せずHUMAN_REVIEWへ送る。


---

# 17. 自動承認条件

自動承認できるのは、
以下をすべて満たす変更のみとする。

- Fixer confidence >= 0.90
- Independent Reviewer confidence >= 0.90
- Primary headingが一致
- pdf_pageが一致
- textbook_pathが一致
- 問題本文確認済み
- 公式解答確認済み
- 教科書本文確認済み
- references_json等の整合性を確認済み

件数による自動修正上限は設けない。

条件を満たした変更は、
1件でも100件でも全件自動適用してよい。


---

# 18. 自動適用禁止

以下は自動適用しない。

- HUMAN_REVIEW
- REJECT_OTHER_MAPPING
- REJECT_KEEP_CURRENT
- PASS_WITH_MINOR_FIX
- FixerとReviewerのPrimary不一致
- pdf_page不一致
- textbook_path不一致
- confidence不足
- 一次資料の確認不足

これらが発生しても、
全件処理を停止してはならない。

Human Reviewへ記録し、
次の設問へ進む。


---

# 19. References JSON

教科書参照を変更する場合、

`references_json`

内の教科書referenceも必ず同期する。

最低限以下を確認する。

- title
- source
- usage
- url
- reason
- pdf_page
- internal_page

トップレベルの

- heading
- pdf_page
- internal_page
- textbook_path

と矛盾してはならない。


---

# 20. reference_count / reference_summary

references_jsonを変更した場合は、

`reference_count`

が実際のreference数と一致することを確認する。

`reference_summary`

も必要に応じて更新する。

headingだけを変更して、
references_jsonやreference_summaryに旧見出しを残してはならない。


---

# 21. 公式資料

金融庁・e-Gov等の公式資料は、

「テーマとして関係しそう」

という理由だけで追加してはならない。

設問または公式解答の論点と実質的に関係する場合のみ追加する。

公式資料を変更・追加するときは、
原則として一次資料のみを使用する。


---

# 22. 過去問原本reference

references_json内の
「過去問原本」referenceは、

明確な誤りがない限り削除しない。

問題PDFページが誤っている場合のみ修正する。


---

# 23. 全件処理

対象となる全311設問を
1回の本番処理対象としてよい。

自動修正件数に固定上限を設けない。

全設問について判定を完了すること。

Human Reviewが発生しても、
残りの処理を継続する。


---

# 24. チェックポイント

全件処理では、
25設問ごとを目安として中間成果物を保存する。

途中で処理が中断した場合でも、

- 完了済みID
- 未処理ID
- Audit結果
- Fixer結果
- Review結果

を追跡可能な状態にする。

既に完了した設問を無意味に再処理しない。


---

# 25. 正本への適用

承認済み変更は、
全件の判定完了後に一括適用してよい。

適用直前に必ず正本CSVのバックアップを作成する。

各変更について、

- id
- before
- after
- evidence
- Fixer confidence
- Reviewer confidence

を記録する。


---

# 26. 変更禁止対象

以下の原本ファイルは変更禁止。

- 問題PDF
- 公式解答PDF
- 教科書PDF

原本PDFのSHA-256が処理前後で一致することを確認する。


---

# 27. Viewer Rebuild

正本CSVへ承認変更を適用した後、

正本CSVを唯一のsource of truthとして、

- index.html
- kakomon_dual_viewer.html

のQUESTION_DATAを再生成する。

HTMLのQUESTION_DATAを手作業で個別修正してはならない。


---

# 28. Validation

最終処理では最低限以下を検証する。

## CSV

- 行数が311である
- 列数が意図せず変化していない
- IDが空でない
- IDが重複していない
- IDが追加・削除されていない
- ID順序が変わっていない
- references_jsonが全件parse可能
- reference_countと実件数が一致

## PDF path

- problem_pathのPDFが存在
- answer_pathのPDFが存在
- textbook_pathのPDFが存在
- 指定pageがPDFページ数以内
- pdf_pageとtextbook_path#pageが一致

## Viewer

- index.htmlのQUESTION_DATA件数が311
- kakomon_dual_viewer.htmlのQUESTION_DATA件数が311
- CSVとQUESTION_DATAが完全一致
- index.htmlとkakomon_dual_viewer.htmlのQUESTION_DATAが一致

## 原本

- 問題・解答・教科書PDFのハッシュ不変


---

# 29. UI Validation

最低限以下を確認する。

- 311件表示できる
- 日本語が文字化けしていない
- 検索が機能する
- ID絞り込みが機能する
- 修正済みheadingが画面へ表示される
- 問題PDFを開ける
- 公式解答PDFを開ける
- 教科書PDFを開ける
- 参照資料表示が壊れていない
- 教科書見出し一覧が壊れていない


---

# 30. Rollback

検証で重大なエラーが発生した場合、
問題のある変更を正本へ残してはならない。

変更前バックアップから復元するか、
該当変更のみロールバックする。

Human Review案件は
無理に修正して処理完了扱いにしてはならない。


---

# 31. 最終成果物

全件本番処理では原則として以下を作成する。

`final_full_audit.jsonl`

全311設問のAudit / Fix / Review / Decision記録。

`approved_changes.json`

自動承認された全変更。

`applied_changes.json`

実際に正本CSVへ適用されたbefore / after。

`human_review.csv`

自動適用しなかった全案件。

`validation_result.json`

データ整合性検証結果。

`ui_validation.json`

画面機能検証結果。

`final_report.md`

本番処理の総括。


---

# 32. final_report.md

最低限以下を記載する。

- 実行日時
- 正本CSV
- 処理対象件数
- PASS_NO_CHANGE件数
- 自動修正件数
- HUMAN_REVIEW件数
- 修正した全ID
- 各設問の変更前mapping
- 各設問の変更後mapping
- Fixer confidence
- Reviewer confidence
- 主要根拠
- CSV変更前SHA-256
- CSV変更後SHA-256
- PDF原本不変確認
- Validation結果
- UI Validation結果


---

# 33. 最終完了条件

以下をすべて満たして初めて
本番ブラッシュアップ完了とする。

1. 全311設問のAuditが完了
2. 必要な設問についてFixer処理が完了
3. 修正候補についてIndependent Reviewが完了
4. 自動承認変更を件数制限なく全件適用
5. HUMAN_REVIEWを全件記録
6. 正本CSVの整合性検証PASS
7. index.html再生成完了
8. kakomon_dual_viewer.html再生成完了
9. ViewerとCSVの完全一致
10. PDF原本不変
11. UI Validation PASS
12. final_report.md生成完了


---

# 34. 最重要原則

このDBの目的は、

「それっぽい教科書箇所を表示すること」

ではない。

目的は、

「公式解答の論点を理解・再現するために最も有用な教科書箇所を、
過去問1設問単位で可能な限り精密に対応付けること」

である。

したがって、

「現在の参照でも間違いではない」

だけではPASS_NO_CHANGEにしてはならない。

常に、

「現在の参照が最も直接的・具体的・適切か」

まで検証すること。