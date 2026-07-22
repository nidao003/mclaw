## 技术架构 · 两端协同

mclaw 桌面端

## Electron + React 19

用户主应用

登录后使用：对话 / 查询专家 / 技能 / 任务底层 OpenClaw 服务

<div style="text-align: center;"><img src="imgs/img_in_image_box_967_482_1033_524.jpg" alt="Image" width="3%" /></div>


## Go 后端

### Go 1.25 · PostgreSQL

mclaw-server/ backend

登录鉴权 / 计费

模型代理 / 数据 API

钱包 / 订阅 / 官网

## 两端如何协同

桌面端登录 Go 后端，所有功能（对话 / 模型 / 数据查询 / 计费）都经后端鉴权与计费；后端另提供官网与管理后台，供用户管理账户、运营管理配置。
