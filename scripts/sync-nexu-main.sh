#!/usr/bin/env bash
#
# sync-nexu-main.sh - 将 nexu-io/nexu 的 main 分支同步到本地 nexu-main 分支
#
# 使用方法：
#   ./scripts/sync-nexu-main.sh              # 拉取并推送
#   ./scripts/sync-nexu-main.sh --fetch-only # 仅拉取，不推送
#
# 说明：
#   nexu-main 分支同步来自 nexu-io/nexu 的 main 分支
#   支持手动触发和 GitHub Actions 自动调度
#

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
fail()  { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

NEXU_REMOTE="git@github.com:nexu-io/nexu.git"
NEXU_NAME="nexu"
LOCAL_BRANCH="nexu-main"
FETCH_ONLY=false

if [[ "${1:-}" == "--fetch-only" ]]; then
    FETCH_ONLY=true
fi

# 检查 nexu remote 是否存在
if ! git remote get-url "$NEXU_NAME" &>/dev/null; then
    info "添加 nexu remote: $NEXU_REMOTE"
    git remote add "$NEXU_NAME" "$NEXU_REMOTE"
fi

ok "nexu remote 已配置"

# 拉取 nexu 最新代码
info "拉取 nexu 仓库..."
git fetch "$NEXU_NAME" || fail "拉取 nexu 失败，检查网络和 SSH 配置"

ok "nexu 拉取完成"

# 检查 nexu-main 分支是否存在
if git show-ref --verify --quiet "refs/heads/$LOCAL_BRANCH"; then
    info "本地 $LOCAL_BRANCH 分支已存在，切换到该分支..."
    git checkout "$LOCAL_BRANCH" || fail "切换分支失败"
else
    info "创建本地 $LOCAL_BRANCH 分支（基于 nexu/main）..."
    git checkout -b "$LOCAL_BRANCH" "nexu/main" || fail "创建分支失败"
    ok "本地 $LOCAL_BRANCH 分支已创建"
fi

# 合并 nexu/main 的更新
info "合并 nexu/main 到 $LOCAL_BRANCH..."
git merge "nexu/main" --allow-unrelated-histories -m "sync: merge nexu-io/nexu main into nexu-main" || {
    fail "合并冲突！请手动解决：
    1. 查看冲突文件：git status
    2. 解决冲突后：git add <文件>
    3. 完成合并：git commit --no-edit
    4. 如需放弃：git merge --abort"
}

ok "合并完成"

if $FETCH_ONLY; then
    ok "仅拉取模式，跳过推送"
    exit 0
fi

# 推送到远程
info "推送 $LOCAL_BRANCH 到 origin..."
git push --force-with-lease origin "$LOCAL_BRANCH" || {
    warn "首次推送，尝试普通 push..."
    git push -u origin "$LOCAL_BRANCH" || fail "推送失败"
}

ok "同步完成！nexu-main 已更新"
