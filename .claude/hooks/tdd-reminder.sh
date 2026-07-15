#!/bin/bash
# TDD 규칙 상기 스크립트
# .ts, .tsx 파일 수정 시 TDD 원칙을 상기시킵니다

# stdin에서 파일 경로 추출
file_path=$(jq -r '.tool_input.file_path // .tool_response.filePath' 2>/dev/null)

# .ts 또는 .tsx 파일인지 확인
if [[ "$file_path" =~ \.(ts|tsx)$ ]]; then
  echo "{\"systemMessage\": \"📝 TDD 상기: 이 파일 변경에 대해 먼저 테스트를 작성했나요? ~/.claude/rules/tdd.md 참조\"}"
fi
