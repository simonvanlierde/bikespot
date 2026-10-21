# Task runner: https://just.systems. `just` lists the recipes, `just <name>` runs one.
#
# `import?` skips a recipe file you did not scaffold. Recipes are prefixed
# (`py-`, `ts-`, `rs-`, `go-`) because imports share one namespace, except the few only
# one kind has, such as `pipeline` or `up`.
import? 'just/python.just'
import? 'just/ts.just'
import? 'just/rust.just'
import? 'just/go.just'
import? 'just/docker.just'

# List the recipes (what a bare `just` runs).
default:
    @just --list

# The stack checks CI runs. `just hooks` runs the git hooks, which CI also runs.
check:
    @just ts-check

# Fix and format every stack here, as each stack's `fmt` recipe does.
fmt:
    @just ts-fmt

# Run every git hook over the whole repo, not just staged files.
hooks:
    pnpm exec prek run -a
