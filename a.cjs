const { chromium } = require('@playwright/test');
(async () => {
  const b = await chromium.launch();
  for (const [route,name] of [['/login','login'],['/register','register']]) {
    for (const [w,h] of [[1440,900],[768,1024],[390,844],[320,568]]) {
      const p = await b.newPage({ viewport:{width:w,height:h} });
      await p.goto('http://localhost:5173'+route, { waitUntil:'load' });
      await p.waitForTimeout(1600);
      const m = await p.evaluate(()=>{ const i=document.querySelector('.auth-bg-img');
        return { src: i?(i.currentSrc||'').split('/').pop():'none', op: i?getComputedStyle(i).opacity:'-',
          pos: i?getComputedStyle(i).objectPosition:'-',
          over: document.documentElement.scrollWidth-window.innerWidth }; });
      console.log(`${name.padEnd(9)} ${String(w).padEnd(5)} ${m.src.padEnd(22)} op=${m.op} pos=${m.pos} ovf=${m.over}`);
      await p.screenshot({ path: `screenshots/auth/${name}-${w}x${h}.png` });
      await p.close();
    }
  }
  await b.close();
})();
