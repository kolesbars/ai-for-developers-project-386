# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Общие правила проекта — в AGENTS.md (единый источник для всех агентов, правьте его, а не этот файл):

@AGENTS.md

## Локальное окружение

- mise установлен в `~/.local/bin` и не активирован в shell — в Bash-командах нужен
  `export PATH=$HOME/.local/bin:$PATH` (или `~/.local/bin/mise ...`).
- Сеть на машине разработчика медленная (GitHub и services.gradle.org ~20 КБ/с): не менять версии
  JDK/Node/Gradle без необходимости, большие загрузки запускать в фоне.
- Remote `origin` — по SSH, push работает без дополнительной авторизации; `gh` не установлен,
  статус CI смотреть через публичный API GitHub Actions.
