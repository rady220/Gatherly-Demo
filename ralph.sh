#!/usr/bin/env bash
# ============================================
# GATHERLY RALPH — Automated Story Implementer
# ============================================
# Iteratively implements user stories from .claude/stories/
# using Claude Code as the implementation engine.
#
# Usage:
#   ./ralph.sh
#
# The script will:
# 1. Discover stories in .claude/stories/
# 2. Let you select which stories to implement
# 3. Process each story sequentially with Claude
# 4. Enforce a 5-iteration max per story
# 5. Print a final summary

set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────────

MAX_ITERATIONS=5
STORIES_DIR=".claude/stories"
RALPH_MD=".claude/ralph.md"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Colors ─────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ─── Helpers ────────────────────────────────────────────────────────────────────

print_header() {
    echo ""
    echo -e "${BOLD}========================================${NC}"
    echo -e "${BOLD}        GATHERLY RALPH${NC}"
    echo -e "${BOLD}========================================${NC}"
    echo ""
}

print_separator() {
    echo -e "${CYAN}----------------------------------------${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_failure() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${CYAN}$1${NC}"
}

print_warn() {
    echo -e "${YELLOW}$1${NC}"
}

# ─── Story Discovery ───────────────────────────────────────────────────────────

discover_stories() {
    if [ ! -d "$STORIES_DIR" ]; then
        echo -e "${RED}Error: Stories directory '$STORIES_DIR' not found.${NC}"
        echo "Make sure you run this script from the project root."
        exit 1
    fi

    mapfile -t ALL_STORIES < <(find "$STORIES_DIR" -name "US-*.md" -type f | sort)

    if [ ${#ALL_STORIES[@]} -eq 0 ]; then
        echo -e "${RED}Error: No story files found in '$STORIES_DIR'.${NC}"
        exit 1
    fi
}

display_stories() {
    echo -e "${BOLD}Available stories:${NC}"
    echo ""
    for i in "${!ALL_STORIES[@]}"; do
        local filename
        filename=$(basename "${ALL_STORIES[$i]}")
        printf "  %2d. %s\n" "$((i + 1))" "$filename"
    done
    echo ""
}

# ─── Story Selection ────────────────────────────────────────────────────────────

parse_selection() {
    local input="$1"
    SELECTED_STORIES=()

    # Trim whitespace
    input=$(echo "$input" | xargs)

    # Handle "all"
    if [[ "${input,,}" == "all" ]]; then
        SELECTED_STORIES=("${ALL_STORIES[@]}")
        return 0
    fi

    # Handle "From US-X.Y To US-X.Y" range syntax
    if [[ "${input,,}" =~ ^from[[:space:]]+us-([0-9]+\.[0-9]+)[[:space:]]+to[[:space:]]+us-([0-9]+\.[0-9]+)$ ]]; then
        local from_id="${BASH_REMATCH[1]}"
        local to_id="${BASH_REMATCH[2]}"
        local in_range=false

        for story in "${ALL_STORIES[@]}"; do
            local filename
            filename=$(basename "$story")
            local story_id
            story_id=$(echo "$filename" | grep -oP 'US-\K[0-9]+\.[0-9]+')

            if [[ "$story_id" == "$from_id" ]]; then
                in_range=true
            fi

            if $in_range; then
                SELECTED_STORIES+=("$story")
            fi

            if [[ "$story_id" == "$to_id" ]]; then
                break
            fi
        done

        if [ ${#SELECTED_STORIES[@]} -eq 0 ]; then
            echo -e "${RED}Error: No stories found in range US-$from_id to US-$to_id${NC}"
            return 1
        fi
        return 0
    fi

    # Handle comma-separated values (numbers or IDs)
    IFS=',' read -ra PARTS <<< "$input"
    for part in "${PARTS[@]}"; do
        part=$(echo "$part" | xargs) # trim

        # Check if it's a number
        if [[ "$part" =~ ^[0-9]+$ ]]; then
            local idx=$((part - 1))
            if [ $idx -ge 0 ] && [ $idx -lt ${#ALL_STORIES[@]} ]; then
                SELECTED_STORIES+=("${ALL_STORIES[$idx]}")
            else
                echo -e "${RED}Error: Story number $part is out of range (1-${#ALL_STORIES[@]}).${NC}"
                return 1
            fi
        # Check if it's a story ID (US-X.Y format)
        elif [[ "${part^^}" =~ ^US-[0-9]+\.[0-9]+$ ]]; then
            local found=false
            for story in "${ALL_STORIES[@]}"; do
                local filename
                filename=$(basename "$story")
                if [[ "$filename" == "${part^^}"* ]]; then
                    SELECTED_STORIES+=("$story")
                    found=true
                    break
                fi
            done
            if ! $found; then
                echo -e "${RED}Error: Story '${part}' not found.${NC}"
                return 1
            fi
        else
            echo -e "${RED}Error: Unrecognized selection format: '$part'${NC}"
            return 1
        fi
    done

    if [ ${#SELECTED_STORIES[@]} -eq 0 ]; then
        echo -e "${RED}Error: No stories selected.${NC}"
        return 1
    fi

    return 0
}

prompt_selection() {
    echo -e "${BOLD}Which stories do you want to implement?${NC}"
    echo -e "Enter story numbers, IDs, or \"all\":"
    echo -e "(Examples: ${CYAN}1,2,3${NC}  |  ${CYAN}US-1.1,US-1.2${NC}  |  ${CYAN}From US-1.1 To US-1.4${NC}  |  ${CYAN}all${NC})"
    echo ""
    echo -n "> "
    read -r selection

    if [ -z "$selection" ]; then
        echo -e "${RED}Error: No selection provided.${NC}"
        exit 1
    fi

    if ! parse_selection "$selection"; then
        exit 1
    fi

    echo ""
    echo -e "${BOLD}Selected:${NC}"
    for story in "${SELECTED_STORIES[@]}"; do
        echo "  - $(basename "$story")"
    done
    echo ""
}

# ─── Story Processing ──────────────────────────────────────────────────────────

process_story() {
    local story_file="$1"
    local story_name
    story_name=$(basename "$story_file" .md)

    local iteration=1
    local success=false

    while [ $iteration -le $MAX_ITERATIONS ]; do
        print_separator
        echo -e "${BOLD}Story: ${story_name}${NC}"
        echo -e "${BOLD}Iteration: ${iteration}/${MAX_ITERATIONS}${NC}"
        print_separator
        echo ""

        if [ $iteration -eq 1 ]; then
            print_info "Reading story..."
            print_info "Implementing..."
        else
            print_warn "Tests failed on previous iteration."
            print_info "Analyzing failures..."
            print_info "Applying fixes..."
        fi

        # Build the Claude prompt for this iteration
        local claude_prompt
        if [ $iteration -eq 1 ]; then
            claude_prompt="You are the Ralph agent. Follow the instructions in ${RALPH_MD} exactly.

STORY TO IMPLEMENT: ${story_file}

ITERATION: ${iteration}/${MAX_ITERATIONS}

TASK:
1. Read the story file at '${story_file}' completely.
2. Read the relevant agent instructions under '.claude/agents/' and skill patterns under '.claude/skills/'.
3. Inspect the existing codebase to understand current state.
4. Implement the story according to its acceptance criteria.
5. Run the relevant tests:
   - Backend: cd apps/api && npx vitest run
   - Frontend: cd apps/web && npx ng test --watch=false
   - Type check: cd apps/api && npx tsc --noEmit
6. Report whether all tests pass.

IMPORTANT:
- Follow all conventions in .claude/agents/ and .claude/skills/
- Do NOT modify tests just to make them pass
- Implement ALL acceptance criteria
- This is iteration ${iteration} of maximum ${MAX_ITERATIONS}"
        else
            claude_prompt="You are the Ralph agent. Follow the instructions in ${RALPH_MD} exactly.

STORY: ${story_file}
ITERATION: ${iteration}/${MAX_ITERATIONS}

The previous iteration had test/build failures. Your task:
1. Analyze what went wrong in the previous iteration.
2. DO NOT repeat the same fix that already failed.
3. Apply a targeted, different fix.
4. Run the relevant tests again:
   - Backend: cd apps/api && npx vitest run
   - Frontend: cd apps/web && npx ng test --watch=false
   - Type check: cd apps/api && npx tsc --noEmit
5. Report whether all tests pass.

IMPORTANT:
- Make observable progress on each iteration
- Do NOT blindly repeat previous changes
- This is iteration ${iteration} of ${MAX_ITERATIONS} — if this fails, $((MAX_ITERATIONS - iteration)) attempts remain"
        fi

        # Invoke Claude Code
        print_info "Running Claude Code..."
        echo ""

        local claude_output
        local claude_exit_code=0

        claude_output=$(claude --print "$claude_prompt" 2>&1) || claude_exit_code=$?

        # Check if Claude reported tests passing
        if echo "$claude_output" | grep -qiE "(all tests pass|tests passed|test.*pass|build succeed|story.*complete|successfully implemented)"; then
            echo ""
            print_info "Running verification tests..."

            # Run actual test verification
            local test_exit_code=0
            npm run test 2>&1 || test_exit_code=$?

            if [ $test_exit_code -eq 0 ]; then
                echo ""
                print_success "Tests passed."
                echo ""
                print_success "Story completed successfully: ${story_name}"
                success=true
                break
            else
                echo ""
                print_warn "Tests reported as passing by Claude but verification failed."
                if [ $iteration -eq $MAX_ITERATIONS ]; then
                    break
                fi
            fi
        else
            echo ""
            print_warn "Implementation or tests not yet successful."
            if [ $iteration -eq $MAX_ITERATIONS ]; then
                break
            fi
        fi

        iteration=$((iteration + 1))
    done

    if $success; then
        return 0
    else
        echo ""
        print_failure "Story failed after ${MAX_ITERATIONS} iterations: ${story_name}"
        echo ""
        echo "Remaining failures from last attempt:"
        echo "$claude_output" | tail -20
        echo ""
        print_warn "Moving to the next story."
        return 1
    fi
}

# ─── Main ───────────────────────────────────────────────────────────────────────

main() {
    cd "$PROJECT_ROOT"

    # Verify ralph.md exists
    if [ ! -f "$RALPH_MD" ]; then
        echo -e "${RED}Error: Ralph instructions not found at '${RALPH_MD}'.${NC}"
        exit 1
    fi

    # Verify claude CLI is available
    if ! command -v claude &> /dev/null; then
        echo -e "${RED}Error: 'claude' CLI not found. Please install Claude Code first.${NC}"
        echo "See: https://docs.anthropic.com/en/docs/claude-code"
        exit 1
    fi

    print_header
    discover_stories
    display_stories
    prompt_selection

    # Confirm before starting
    echo -e "${BOLD}Starting Ralph...${NC}"
    echo ""

    # Track results
    declare -a COMPLETED=()
    declare -a FAILED=()
    declare -a FAIL_REASONS=()

    # Process each story
    for story in "${SELECTED_STORIES[@]}"; do
        if process_story "$story"; then
            COMPLETED+=("$(basename "$story")")
        else
            FAILED+=("$(basename "$story")")
            FAIL_REASONS+=("Tests still failing after ${MAX_ITERATIONS} iterations")
        fi
        echo ""
    done

    # ─── Final Summary ──────────────────────────────────────────────────────────

    echo ""
    echo -e "${BOLD}========================================${NC}"
    echo -e "${BOLD}           RALPH SUMMARY${NC}"
    echo -e "${BOLD}========================================${NC}"
    echo ""

    if [ ${#COMPLETED[@]} -gt 0 ]; then
        echo -e "${GREEN}Completed:${NC}"
        for story in "${COMPLETED[@]}"; do
            echo -e "  ${GREEN}✓${NC} $story"
        done
        echo ""
    fi

    if [ ${#FAILED[@]} -gt 0 ]; then
        echo -e "${RED}Failed:${NC}"
        for i in "${!FAILED[@]}"; do
            echo -e "  ${RED}✗${NC} ${FAILED[$i]}"
            echo -e "    Reason: ${FAIL_REASONS[$i]}"
        done
        echo ""
    fi

    local total=$(( ${#COMPLETED[@]} + ${#FAILED[@]} ))
    echo -e "Total: ${total}"
    echo -e "Completed: ${GREEN}${#COMPLETED[@]}${NC}"
    echo -e "Failed: ${RED}${#FAILED[@]}${NC}"
    echo -e "${BOLD}========================================${NC}"
    echo ""

    # Exit with failure if any story failed
    if [ ${#FAILED[@]} -gt 0 ]; then
        exit 1
    fi
}

main "$@"
