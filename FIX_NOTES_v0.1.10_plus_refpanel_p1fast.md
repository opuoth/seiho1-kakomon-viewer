# v0.1.10+refpanel-light p1fast fix

- p.1対策で追加した pdf_frame.html 中継方式を廃止。
- PDFは直接 iframe に `xxx.pdf#page=n&view=FitH` で表示。
- 同一PDF内でページ番号だけ変わる場合のみ、hash側に `pdfjump` を付けてページ移動を促す。
- PDF本体URLへ `?viewerPage=` を付けない。
- `about:blank` を挟まないため、前版より軽量。
