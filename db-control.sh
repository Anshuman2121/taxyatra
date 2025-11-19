#!/bin/bash

case "$1" in
  start)
    brew services start postgresql@15
    echo "✅ PostgreSQL started"
    ;;
  stop)
    brew services stop postgresql@15
    echo "🛑 PostgreSQL stopped"
    ;;
  status)
    brew services list | grep postgresql
    ps aux | grep postgres | grep -v grep | awk '{sum_mem+=$4; sum_cpu+=$3} END {printf "\nMemory: %.1f%% (~%.0fMB)\nCPU: %.1f%%\n", sum_mem, sum_mem*16000/100, sum_cpu}'
    ;;
  *)
    echo "Usage: ./db-control.sh {start|stop|status}"
    exit 1
    ;;
esac
