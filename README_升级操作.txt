MyLedger Mobile V0.1.4 — Firebase 云同步测试版
=================================================

你已经拥有的 GitHub Pages 网站：
https://tong1225271412-ship-it.github.io/myledger-mobile/

重要：这是一份软件测试版，不是已经通过真实 Firebase / iPhone 联机验收的正式版。

一、升级前，务必备份
1. 在你正在使用的 iPhone MyLedger 中，进入「交换」页面，导出 JSON 完整备份，保存到 iPhone 的“文件”App。
2. 在 Windows MyLedger 中也备份原有 SQLite 数据库。
3. 不要删除现有 App，不要清除网站数据，也不要把数据 CSV 上传到公开 GitHub 仓库。

二、更新 GitHub Pages
1. 打开 https://github.com/tong1225271412-ship-it/myledger-mobile
2. 点击 Add file > Upload files。
3. 上传本 ZIP 内的 index.html、app.js、style.css、sw.js、cloud.js、manifest.webmanifest、icons 文件夹。不要再多套一个文件夹，不要上传整个 ZIP。
4. 点击 Commit changes，等待 Pages 发布成功。
5. 首次使用新版本可打开以下地址刷新：
   https://tong1225271412-ship-it.github.io/myledger-mobile/?v=014
   如果旧桌面 App 尚未更新，先用 Safari 打开上述地址，再关闭并重新打开桌面 App。

三、第一次登录 / 合并历史账本
1. iPhone 在联网状态下打开升级后的 MyLedger，点击底部「交换」/「同步与备份」。
2. 在「我的云端账本」填写之前在 Firebase Authentication 中创建的邮箱和密码。请勿在聊天中透露密码。
3. 先查看云端与本机记录数量，确保已导出 JSON 备份。
4. 只在你选定的“历史记录主设备”上点击「首次启用同步」。建议主设备是已含你全部历史账目的 iPhone。
5. 当云端仍为空时，软件会再次确认，然后将本机现有记录排队上传。等待状态显示“待上传操作 0 项”且云端笔数与本机笔数匹配。
6. 另一台没有历史记录的设备，使用同一个 GitHub Pages 网站、相同 Firebase 账户登录，点击「首次启用同步」，从云端读入数据。
7. 以后两端在「启用同步」状态下记录、修改或删除，联网后会上传/接收对应操作。

特别注意：
- 如果新设备已有不同的历史记录，程序不会自动拼在一起；会提示停止并先人工核对。这是为防止重复记账。
- 云同步目前支持 iPhone PWA 与 Windows 的浏览器版 MyLedger。Windows 原生 MyLedger.exe 仍需后续单独改造；不能据此认为 EXE 已自动同步。
- 记账逻辑先写本地 IndexedDB，再提交云端；断网后仍可记账。联网后，待同步操作会重试。
- 如果 CDN 无法连接 Firebase，云同步可能暂时不可用，但原本的本地记账功能不受影响。
- 当前为个人测试版；没有单独的云端历史版本恢复/冲突审查页。两台设备离线同时改同一条记录时，可能以最后提交的版本为准。
- 手动 JSON/CSV 备份仍然必要。登录的手机属于可信设备；Firebase 离线缓存及本地数据库可能在设备上保留数据。

四、问题排查
- Firebase 登录失败：检查邮箱密码、网络和 Firebase Authentication 是否启用邮箱/密码。
- 无法访问云数据：检查 Firestore Rules 已发布，路径为 users/<uid>/transactions/<docId>，且当前登录 UID 对应路径。
- 初次启用按钮提示“云端非空、本机也非空”：不要重复上传，先保存两边备份再核对。
- 网页仍是旧版：先核对 GitHub 仓库根目录是否新增 cloud.js，再刷新 ?v=014 的网站。
- 请勿将你的 Firebase 登录密码、服务账号私钥或完整个人账本上传 GitHub。
