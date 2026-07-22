========== slide-01 ==========
MCLAW 内部解读

## mclaw

面向地铁行业的图形化 AI 桌面助手

把命令行 AI 编排能力，变成开箱即用的桌面体验

========== slide-02 ==========
## CONTENTS

## 本次解读六个部分

<div style="text-align: center;"><img src="imgs/img_in_image_box_132_316_227_413.jpg" alt="Image" width="4%" /></div>


## 是什么

产品定位与一句话价值

<div style="text-align: center;"><img src="imgs/img_in_image_box_758_316_850_413.jpg" alt="Image" width="4%" /></div>


## 有什么用

核心能力与地铁特色

<div style="text-align: center;"><img src="imgs/img_in_image_box_1383_316_1474_413.jpg" alt="Image" width="4%" /></div>


## 怎么想的

产品思路与取舍

<div style="text-align: center;"><img src="imgs/img_in_image_box_132_646_226_744.jpg" alt="Image" width="4%" /></div>


## 借鉴了谁

参考对象与对标

<div style="text-align: center;"><img src="imgs/img_in_image_box_759_646_851_744.jpg" alt="Image" width="4%" /></div>


## 怎么运转

架构与业务流程

<div style="text-align: center;"><img src="imgs/img_in_image_box_1383_646_1472_744.jpg" alt="Image" width="4%" /></div>


## 一 起共创

邀请全员参与

========== slide-03 ==========
PART 01 · 是什么

## mclaw 是什么

一句话定位

## 基于 OpenClaw 二次开发的

欧孚士产品生态的统一客户端——连接旗下所有产品，技能与专家可在其他AI系统运行。

图形化桌面  
鼠标即用，告别命令行  
开箱即用  
设置向导，零配置上手  
地铁行业定制  
预装数据查询与专家灵魂  
多模型接入  
auto 智能模型路由  
开放生态  
连欧孚士所有产品，技能可移植  
安全计费  
登录才能用，防白嫖

========== slide-04 ==========
## 为什么需要它

行业痛点

 $ ^{×} $ 命令行门槛高，非技术人员用不了

配置文件复杂，上手成本高

通用 AI 不懂地铁业务

模型 key 裸奔，白嫖风险大

无计费体系，无法商业化

## mclaw 解法

图形化桌面，鼠标即用  
设置向导，零配置开箱  
预装地铁数据查询技能  
登录才能用，key 不外泄防白嫖  
三档会员计费 + 按次数据计费

========== slide-05 ==========
## PART 02 · 有什么用

## 核心能力全景 · 八大模块

<div style="text-align: center;"><img src="imgs/img_in_image_box_132_293_198_361.jpg" alt="Image" width="3%" /></div>


## 对话

多模型聊天 · @agent 路由

<div style="text-align: center;"><img src="imgs/img_in_image_box_597_293_662_361.jpg" alt="Image" width="3%" /></div>


## 模型

云端管理 · auto 智能路由

<div style="text-align: center;"><img src="imgs/img_in_image_box_1064_293_1129_361.jpg" alt="Image" width="3%" /></div>


## 专家

小欧 / 精营有数 / 报告

<div style="text-align: center;"><img src="imgs/img_in_image_box_1531_293_1597_361.jpg" alt="Image" width="3%" /></div>


## 任务

Cron 定时 · 自动化

<div style="text-align: center;"><img src="imgs/img_in_image_box_132_579_197_646.jpg" alt="Image" width="3%" /></div>


## 技能

数据查询·文档处理

<div style="text-align: center;"><img src="imgs/img_in_image_box_597_579_662_646.jpg" alt="Image" width="3%" /></div>


## 链接

多通道·按账号绑代理

<div style="text-align: center;"><img src="imgs/img_in_image_box_1063_578_1131_647.jpg" alt="Image" width="3%" /></div>


## 梦境

梦境创作

<div style="text-align: center;"><img src="imgs/img_in_image_box_1530_579_1595_647.jpg" alt="Image" width="3%" /></div>


## 设置

账户 / 订阅 / 代理

========== slide-06 ==========
### PART 02. 有什么用

## 地铁行业四大能力

## 01

## 地铁数据查询

——18类查询：画像/城市/线路/业态

一 含客流 / 人口 / 产业等经营数据

——后续持续扩展更多接口

## 02

## 登录即用·防白嫖

一 必须登录才能用任何功能

——云端模型 key 不外泄，绑定设备

— 数据 key 与模型 key 两套隔离

## 03

## 会员计费

一 三档套餐 × 日 / 周 / 月 token 池

— 1 积分 = 1 万 token

—— 自动选最合适的可用模型

<div style="text-align: center;"><img src="imgs/img_in_image_box_1071_715_1151_771.jpg" alt="Image" width="3%" /></div>


## 品牌定制

——地铁橙#EE7C4B 品牌色

——菜单两字化命名

——暗色默认 + 亮色自适应

========== slide-07 ==========
PART 03 · 怎么想的

## 产品思路

<div style="text-align: center;"><img src="imgs/img_in_image_box_123_293_215_383.jpg" alt="Image" width="4%" /></div>


## 通用底座 + 行业预装

不重新造轮子。OpenClaw 全功能保留，上叠地铁能力——类腾讯 QClaw / WorkBuddy 模式。

<div style="text-align: center;"><img src="imgs/img_in_image_box_124_470_212_558.jpg" alt="Image" width="4%" /></div>


## 站在巨人肩膀

借 OpenClaw 运行时、QClaw 架构、ooh-manus 行业内容，自己只做行业适配与商业化。

<div style="text-align: center;"><img src="imgs/img_in_image_box_123_646_214_735.jpg" alt="Image" width="4%" /></div>


## 两端协同

桌面端（用户使用）+ Go 后端（服务支撑），职责清晰，独立演进。

<div style="text-align: center;"><img src="imgs/img_in_image_box_124_824_213_911.jpg" alt="Image" width="4%" /></div>


## 数据统一

数据 API 从 Java 迁到 Go 后端，一套技术栈、一套鉴权、一套计费，长期省心。

========== slide-08 ==========
## 四 个参考对象

## OpenClaw 底座

借鉴了

· AI 代理运行时

Gateway 协议

技能 / 插件系统

控制电脑与浏览器

## QClaw 架构

借鉴了

· 升级不重装的运行时

可靠的数据存储

可装卸的扩展机制

· 灵活的进程调度

## ooh-manus 内容

借鉴了

4 个数据查询 skill

· 3 个专家灵魂

小欧 / 精营有数 / 报告

行业 know-how 来源

## Java 后端 数据

借鉴了

18 个数据接口迁到 Go

· ooh_data 数据源

按次计费模型

· 统一技术栈与鉴权

========== slide-09 ==========
## 三 个产品决策 · 借鉴 QClaw

<div style="text-align: center;"><img src="imgs/img_in_image_box_130_303_243_414.jpg" alt="Image" width="5%" /></div>


## 升级不重装

借鉴 QClaw：底层运行时独立打包，mclaw 升级时用户无感，不用重新下载安装整个应用。

<div style="text-align: center;"><img src="imgs/img_in_image_box_756_303_867_415.jpg" alt="Image" width="5%" /></div>


## 数据存得稳

借鉴 QClaw ：本地数据用专业数据库存储，可靠不丢、可追溯，满足合规审计要求。

<div style="text-align: center;"><img src="imgs/img_in_image_box_1378_303_1489_415.jpg" alt="Image" width="5%" /></div>


## 功能可装卸

借鉴 QClaw ：每个能力像装 App 一样独立安装卸载，用户按需扩展，互不干扰。

## mclaw 现有优势（不需改）

跨平台 Mac/Windows · 多语言界面 · 内置用量遥测 · 预装地铁数据技能与专家

========== slide-10 ==========
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

========== slide-11 ==========
## PART 05 · 怎么运转

## 业务流程 · 用户怎么用

<div style="text-align: center;"><img src="imgs/img_in_image_box_224_258_307_341.jpg" alt="Image" width="4%" /></div>


设置向导

2

登录 Go 后端

3

同步云端模型

4

自动配数据 key

对话 / 查询

## 示例对话

五四广场站的整体情况怎么样？

青岛 3 号线有哪些站？

五四广场站周边有没有星巴克？

不登录任何功能都用不了。登录后即可在对话中直接提问地铁数据，技能自动路由、数据 key 无感注入。

========== slide-12 ==========
## 计费模型 · 三档套餐

<div style="text-align: center;">三档套餐</div>



<table border=1 style='margin: auto; word-wrap: break-word;'><tr><td style='text-align: center; word-wrap: break-word;'>档位</td><td style='text-align: center; word-wrap: break-word;'>月费</td><td style='text-align: center; word-wrap: break-word;'>日 token</td><td style='text-align: center; word-wrap: break-word;'>月送积分</td><td style='text-align: center; word-wrap: break-word;'>并发</td></tr><tr><td style='text-align: center; word-wrap: break-word;'>basic</td><td style='text-align: center; word-wrap: break-word;'>¥0</td><td style='text-align: center; word-wrap: break-word;'>200 万</td><td style='text-align: center; word-wrap: break-word;'>200</td><td style='text-align: center; word-wrap: break-word;'>1</td></tr><tr><td style='text-align: center; word-wrap: break-word;'>pro</td><td style='text-align: center; word-wrap: break-word;'>¥99</td><td style='text-align: center; word-wrap: break-word;'>1000 万</td><td style='text-align: center; word-wrap: break-word;'>1000</td><td style='text-align: center; word-wrap: break-word;'>3</td></tr><tr><td style='text-align: center; word-wrap: break-word;'>ultra</td><td style='text-align: center; word-wrap: break-word;'>¥299</td><td style='text-align: center; word-wrap: break-word;'>4000 万</td><td style='text-align: center; word-wrap: break-word;'>5000</td><td style='text-align: center; word-wrap: break-word;'>10</td></tr></table>

周期：日 = 自然日 / 周 = ISO 周一起 / 月 = 自然月，各自独立懒触发重置

换算口径

=1万 token

auto 智能模型路由

按模型权重与可用性自动挑选最合适的模型，按实际用量记账。

========== slide-13 ==========
## 数据查询流程

用户提问

Gateway

数据查询 skill

Go 后端 /api/v1/data

ooh_data 库

<div style="text-align: center;"><img src="imgs/img_in_image_box_99_309_1879_962.jpg" alt="Image" width="88%" /></div>


返回结果

========== slide-14 ==========
PART 06 · 一起共创

## 行业 know-how，分散在每个人脑子里

mclaw 提供了容器，但真正的行业智慧，需要大家一起蒸馏进来。

一个人的经验

重复的劳动

→全公司的能力

→ 可复用的技能

私人的套路

→标准的资产

========== slide-15 ==========
## PART 06 · 一起共创

## 邀你一起共创

## 贡献行业技能 / 专家灵魂

把本职经验沉淀成可复用的 skill 或 agent 灵魂，不绑 mclaw，其他 AI 系统也能运行。

类似小欧 / 精营有数 / 报告生成

## 2 

## 试用产品 + 提反馈

装上用起来，提 bug、提需求、提场景，做产品验证。

你的真实使用是最好的需求来源

## 共创产品方向

讨论 mclaw 该往哪走、该加什么行业能力、优先级怎么排。

方向由使用者定义，不是闭门造车

## 开放数据 / 接口 / 资源

业务部门把数据源、业务接口、文档开放出来，供技能调用。

接 ooh_data 那套思路，接入即资产

========== slide-16 ==========
## 现状与路线

## 现在到哪了，接下来去哪

## 当前状态

v0.4.9-alpha

两端就绪：mclaw 桌面端 + Go 后端

✓ 数据查询 18 类接口调通（画像 / 经营）

会员计费三档 + 自动模型路由落地

云端模型登录绑定，key 不外泄防白嫖

✓ 品牌定制完成，地铁橙 + 菜单两字化

✓ macOS / Windows 跨平台安装包

## 后续方向

借鉴 QClaw + 行业深化  
→ 升级不重装，底层运行时独立  
本地数据可靠存储 + 可追溯合规  
→ 功能可装卸，建能力扩展市场  
更多数据 API：经营类 / 画像类持续扩展  
更多地铁行业 skill / 专家灵魂  
多工作区隔离 + 自动备份

========== slide-17 ==========
## 一起来，把 mclaw 蒸馏成地铁行业的 AI 操作系统

你的每一个业务经验，都可能变成全公司可复用的能力。

参与方式

联系产品 / 研发负责人 · 提交你的 skill 想法 · 申请试用账号 · 加入共创群

