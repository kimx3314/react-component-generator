#!/bin/bash
# 문자 수 카운터 상태 표시
# Claude Code의 statusLine에서 사용되는 스크립트

# 현재 시간
current_time=$(date '+%H:%M:%S')

# 간단한 상태 메시지
echo "{\"text\": \"[$current_time] 입력 준비 완료 | 💾 저장됨\"}"
