import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

// 컴포넌트 생성 테스트
const promptInput = await page.locator('textarea').first();
await promptInput.fill('빨간 버튼이 있는 카드');

// 생성 버튼 클릭
const generateBtn = await page.locator('button:has-text("생성")').first();
await generateBtn.click();

// 컴포넌트가 생성될 때까지 대기
await page.waitForTimeout(5000);

// 미리보기 탭이 있는지 확인
const previewTab = await page.locator('button:has-text("미리보기")');
if (await previewTab.isVisible()) {
  console.log('✓ 미리보기 탭 발견');
  
  // 반응형 버튼들이 있는지 확인
  const mobileBtn = await page.locator('button:has-text("모바일")');
  const tabletBtn = await page.locator('button:has-text("태블릿")');
  const desktopBtn = await page.locator('button:has-text("데스크탑")');
  
  if (await mobileBtn.isVisible()) {
    console.log('✓ 모바일 버튼 발견');
    await mobileBtn.click();
    await page.waitForTimeout(500);
    console.log('✓ 모바일 뷰로 전환됨');
  }
  
  if (await tabletBtn.isVisible()) {
    console.log('✓ 태블릿 버튼 발견');
    await tabletBtn.click();
    await page.waitForTimeout(500);
    console.log('✓ 태블릿 뷰로 전환됨');
  }
  
  if (await desktopBtn.isVisible()) {
    console.log('✓ 데스크탑 버튼 발견');
    await desktopBtn.click();
    await page.waitForTimeout(500);
    console.log('✓ 데스크탑 뷰로 전환됨');
  }
}

// 스크린샷 캡처
await page.screenshot({ path: 'preview.png' });
console.log('✓ 스크린샷 저장됨: preview.png');

await browser.close();
