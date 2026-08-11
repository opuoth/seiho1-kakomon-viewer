# v0.1.10+refpanel-light p1fix

- 問題PDF p.1 を含むページ遷移を安定化。
- PDF本体URLに `?viewerPage=` を付ける方式を廃止。
- `pdf_frame.html` を介して外側 iframe のURLだけを変え、PDF本体は `xxx.pdf#page=n` のまま表示。
- 同じ年度PDF内のページ移動対応、表示モード切替時の不要リロード抑制、公式参照パネルは維持。
