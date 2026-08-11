# v0.1.10+refpanel-light p1robust fix

- PDF本体URLへのクエリ付与を廃止。
- PDF URLは `xxx.pdf#page=n&view=FitH` に統一。
- 同一PDF内でページだけ変わる場合のみ、about:blank を短時間挟んで確実にページ遷移させる。
- 別PDFへの移動や表示モード切替では不要なリロードを避ける。
