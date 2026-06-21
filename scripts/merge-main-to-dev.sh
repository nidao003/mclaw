#!/usr/bin/env bash
#
# merge-main-to-dev.sh - 将 main 分支（上游同步）合并到 dev 分支（开发分支）
#
# 使用方法：
#   ./scripts/merge-main-to-dev.sh          # 普通合并（保留合并提交）
#   ./scripts/merge-main-to-dev.sh --rebase # rebase 合并（保持线性历史）
#
# 说明：
#   main 分支由 sync-upstream workflow 自动从 ValueCell-ai/mclaw 同步
#   开发工作在 dev 分支进行，定期将 main 的更新合并进来
#

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
fail()  { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

REBASE_MODE=false
if [[ "${1:-}" == "--rebase" ]]; then
    REBASE_MODE=true
fi

# 确认当前在 dev 分支
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "dev" ]]; then
    warn "当前分支是 '$CURRENT_BRANCH'，正在切换到 dev..."
    git checkout dev || fail "切换到 dev 分支失败"
fi

ok "当前在 dev 分支"

# 拉取远程最新代码
info "拉取远程最新代码..."
git fetch origin || fail "拉取远程信息失败"

# 确保 dev 是最新的
info "更新本地 dev 分支..."
git pull origin dev --rebase || fail "更新 dev 分支失败，请先解决本地冲突"

# 检查 main 是否有新提交
LOCAL_MAIN=$(git rev-parse origin/main 2>/dev/null || echo "")
MERGED_MAIN=$(git merge-base dev origin/main 2>/dev/null || echo "")

if [[ "$LOCAL_MAIN" == "$MERGED_MAIN" ]]; then
    ok "main 分支没有新的更新需要合并"
    exit 0
fi

# 显示 main 的更新内容
info "main 分支有新更新，以下是变更摘要："
echo ""
git log --oneline --color=always $MERGED_MAIN..origin/main
echo ""

if $REBASE_MODE; then
    info "使用 rebase 模式合并..."
    git rebase origin/main || {
        fail "Rebase 发生冲突！请手动解决：
        1. 查看冲突文件：git status
        2. 编辑冲突文件并解决
        3. 标记为已解决：git add <文件>
        4. 继续 rebase：git rebase --continue
        5. 如需放弃：git rebase --abort"
    }
    ok "Rebase 合并完成"
else
    info "使用 merge 模式合并..."
    git merge origin/main --no-edit || {
        fail "合并发生冲突！请手动解决：
        1. 查看冲突文件：git status
        2. 编辑冲突文件并解决
        3. 标记为已解决：git add <文件>
        4. 完成合并：git commit --no-edit
        5. 如需放弃：git merge --abort"
    }
    ok "Merge 合并完成"
fi

# 推送到远程
info "推送到远程 dev 分支..."
git push origin dev || fail "推送失败"

ok "全部完成！main 的更新已合并到 dev 分支"
