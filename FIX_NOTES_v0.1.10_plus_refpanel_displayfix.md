# v0.1.10+refpanel-light display fix

- 公式参照パネル追加時に欠落していた初期化変数（list/search/filter/PDF frame 等）を復元。
- 起動時に `listEl is not defined` で止まり、画面が表示されない不具合を修正。
- v0.1.10ベースの同一PDF内ページ移動対応、軽量PDF表示、参照資料パネルの構成は維持。
