VASCONTA V0.1.6 · 瓦斯科的账本 · 品牌及启动动画升级

本次改动：启动动画采用确定的 V 标识/蓝绿光轨视觉；更新 App 名称、首页品牌、财务分析页面标识、桌面图标。
未改动：app.js、analytics.js、cloud.js，未修改 IndexedDB 名称 MyLedgerMobile、交易 store、Firebase 项目和权限规则。
特别保留：manifest 的 id、start_url、scope；旧的 JSON 备份内部 app 标识 MyLedgerMobile，以确保兼容。

更新之前：
1. 手机和 Windows 在 VPN 下确认“已连接·已同步”，待上传 0 项。
2. 在“交换”中导出 JSON 完整备份，保存在私人设备，不要上传到公开 GitHub。
3. 不要删除原来的手机/电脑 App，不要清除站点数据。

部署到 GitHub Pages：
1. 在 https://github.com/tong1225271412-ship-it/myledger-mobile 的 main 分支选择 Add file -> Upload files。
2. 解压“增量更新包”，把解压后的 5 个根文件以及 icons、assets 子文件夹一起拖入 GitHub 上传区域。请确认路径为：
   index.html, manifest.webmanifest, splash.css, splash.js, sw.js, icons/icon-180.png, icons/icon-192.png, icons/icon-512.png, assets/vasconta-splash.webp
3. Commit changes，待 Actions 中 pages build and deployment 出现绿色对勾。
4. Chrome 无痕窗口访问 https://tong1225271412-ship-it.github.io/myledger-mobile/?v=016 核对新动画。
5. 普通 Chrome 按 Ctrl+Shift+R；iPhone 启动已安装的 App 待自动更新后关闭重开。
6. 确认云同步、全部记账和财务分析正常。

注意：iOS/Chrome 已经安装的应用的桌面名称或桌面图标有时不会随 manifest 自动改变，这不影响 App 内品牌或账目。如果桌面标签仍是旧名，先不要删除旧 App；可以暂时保留旧标签，也可以在完成独立备份后另外讨论安全重装/重建快捷方式。

内部技术标识 MyLedgerMobile、Firestore 数据结构和 JSON 备份 app 字段保留旧名是为了迁移安全，并不是漏改。
