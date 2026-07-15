---
name: create-pr
description: |
  GitHub PR을 자동으로 생성합니다. 현재 변경사항을 분석하여 PR 제목과 본문을 자동으로 작성하고,
  gh 명령어로 PR을 열어줍니다. 사용자가 PR을 만들거나 변경사항을 푸시한 후 PR을 열고 싶을 때 사용하세요.
  "PR 생성해줘", "pull request 열어줘", "변경사항 PR로 올려줘" 같은 요청에 활성화합니다.
compatibility:
  tools: [Bash, Read]
  context: fork
---

# Create PR 스킬

GitHub PR을 신속하게 생성하는 스킬입니다. 현재 브랜치의 변경사항을 분석하여 자동으로 PR 제목과 본문을 작성합니다.

## 사용 시기

- 변경사항을 완성하고 PR을 열고 싶을 때
- PR을 빠르게 생성하되, 제목과 설명을 자동으로 채우고 싶을 때
- 원격 브랜치로 푸시한 후 PR 링크를 얻고 싶을 때

## 작동 방식

1. **변경사항 분석**
   - git status로 현재 상태 확인
   - git log와 git diff로 변경 내용 파악
   - 커밋 메시지에서 PR 제목 추출

2. **PR 제목 생성**
   - 가장 최근 커밋 메시지에서 제목 추출
   - 형식: `<type>: <description>` (AGENTS.md의 commit message format 기준)

3. **PR 본문 작성**
   - `references/template.md` 템플릿 읽기
   - 변경사항, 테스트 계획 등을 자동으로 채우기

4. **PR 생성**
   - `gh pr create` 명령어로 PR 생성
   - PR URL 반환

## 필수 조건

- 현재 디렉토리가 git 저장소여야 함
- 변경사항이 원격 브랜치로 푸시되어 있어야 함
- GitHub CLI(`gh`) 설치 및 인증됨
- `references/template.md` 파일이 프로젝트에 존재

## 실행 단계

1. git 상태 확인 (현재 브랜치, 스테이징 상태 등)
2. 로컬에 푸시되지 않은 변경이 있으면 오류 반환
3. git log로 base 브랜치와의 차이점 확인
4. 최근 커밋 메시지에서 PR 제목 추출
5. 변경된 파일 목록 수집
6. references/template.md 읽기
7. PR 본문 템플릿에 정보 입력
8. gh pr create --title "제목" --body "본문" 실행
9. PR URL 출력

## 예시

```
사용자: "이 기능 PR로 올려줘"

스킬 실행:
$ git status
On branch feature/new-component
Your branch is ahead of 'origin/main' by 1 commit.

$ git log origin/main..HEAD --oneline
abc1234 feat(component): add new component

$ gh pr create --title "feat(component): add new component" \
  --body "..."
✓ Created pull request
https://github.com/user/repo/pull/123
```

## 주의사항

- **푸시 필수**: 스킬 실행 전에 반드시 `git push`로 변경사항을 푸시해야 함
- **인증 필수**: `gh auth status`로 GitHub 인증 확인
- **base 브랜치**: 기본값은 `main` (또는 리포지토리의 기본 브랜치)
- **Template 의존성**: `references/template.md`가 없으면 기본 템플릿으로 폴백
