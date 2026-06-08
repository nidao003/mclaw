# 开发工作流说明

## 分支架构

```
ValueCell-ai/ClawX (上游开源)
        │
        │  自动同步 (每6小时 / 手动触发)
        ▼
    main 分支 (镜像，不要直接修改！)
        │
        │  手动合并
        ▼
    dev 分支 (二次开发，默认分支)
```

| 分支 | 用途 | 修改规则 |
|------|------|---------|
| `main` | 上游 ClawX 的镜像 | ⛔ 禁止直接修改，仅由 sync-upstream workflow 自动同步 |
| `dev` | 二次开发 | ✅ 所有开发工作都在此分支进行 |

## 日常开发

```bash
# 确保在 dev 分支
git checkout dev

# 开发前先拉取最新
git pull origin dev

# 正常开发、提交...
git add .
git commit -m "feat: 你的功能描述"
git push origin dev
```

## 合并上游更新

当 main 分支有新的上游更新时，需要手动合并到 dev：

```bash
# 普通合并（保留合并提交，推荐）
./scripts/merge-main-to-dev.sh

# 或者 rebase 模式（保持线性历史）
./scripts/merge-main-to-dev.sh --rebase
```

### 合并冲突处理

如果合并时出现冲突：

1. `git status` 查看冲突文件
2. 手动编辑冲突文件，选择保留的内容
3. `git add <冲突文件>`
4. 继续合并：
   - merge 模式：`git commit --no-edit`
   - rebase 模式：`git rebase --continue`
5. `git push origin dev`

### 放弃合并

如果冲突太多想放弃：

```bash
# merge 模式
git merge --abort

# rebase 模式
git rebase --abort
```

## 查看上游更新内容

合并前可以先看看 main 有哪些新变化：

```bash
git fetch origin
git log --oneline dev..origin/main
```
