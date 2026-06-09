#!/usr/bin/env bash
#
# sync-coze-main.sh - 将 coze-dev/coze-studio 的 main 分支同步到本地 coze-main 分支
#
# 使用方法：
#   ./scripts/sync-coze-main.sh              # 拉取并推送
#   ./scripts/sync-coze-main.sh --fetch-only # 仅拉取，不推送
#
# 说明：
#   coze-main 分支同步来自 coze-dev/coze-studio 的 main 分支
#   使用 reset 镜像模式，避免合并冲突
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

COZE_REMOTE="git@github.com:coze-dev/coze-studio.git"
COZE_NAME="coze"
LOCAL_BRANCH="coze-main"
FETCH_ONLY=false

if [[ "${1:-}" == "--fetch-only" ]]; then
    FETCH_ONLY=true
fi

# 检查 coze remote 是否存在
if ! git remote get-url "$COZE_NAME" &>/dev/null; then
    info "添加 coze remote: $COZE_REMOTE"
    git remote add "$COZE_NAME" "$COZE_REMOTE"
fi

ok "coze remote 已配置"

# 拉取 coze 最新代码
info "拉取 coze-studio 仓库..."
git fetch "$COZE_NAME" || fail "拉取 coze 失败，检查网络和 SSH 配置"

ok "coze 拉取完成"

# 使用 reset 镜像模式，强制对齐上游
if git show-ref --verify --quiet "refs/heads/$LOCAL_BRANCH"; then
    info "本地 $LOCAL_BRANCH 分支已存在，重置为 coze/main..."
    git checkout "$LOCAL_BRANCH" || fail "切换分支失败"
    git reset --hard "coze/main" || fail "重置失败"
else
    info "创建本地 $LOCAL_BRANCH 分支（基于 coze/main）..."
    git checkout -b "$LOCAL_BRANCH" "coze/main" || fail "创建分支失败"
    ok "本地 $LOCAL_BRANCH 分支已创建"
fi

ok "镜像重置完成"

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

ok "同步完成！coze-main 已更新"
