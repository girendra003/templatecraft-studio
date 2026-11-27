import puppeteer from 'puppeteer-core';
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
const base=process.env.BASE_URL || 'http://127.0.0.1:8010';
try {
 const page=await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width:1440,height:1000});await page.goto(base,{waitUntil:'networkidle0'});
 await page.waitForFunction(()=>document.querySelector('.document-demo').getAnimations().every(animation=>animation.playState==='finished'));
 const field=await page.$('.demo-field');await field.hover();const before=await field.boundingBox();
 await page.mouse.move(before.x+before.width/2,before.y+before.height/2);await page.mouse.down();await page.mouse.move(before.x+before.width/2+35,before.y+before.height/2+20,{steps:6});await page.mouse.up();
 const after=await field.boundingBox();if(after.x-before.x<25)throw Error(`Demo field drag failed: ${JSON.stringify({before,after,position:await field.evaluate(e=>[e.style.left,e.style.top])})}`);
 await field.focus();await page.keyboard.press('ArrowRight');
 if((await field.boundingBox()).x<=after.x)throw Error('Demo keyboard positioning failed');
 await page.click('.demo-controls button:first-child');await page.waitForSelector('.demo-signature');
 await page.click('.demo-controls button:nth-child(2)');await page.waitForSelector('.demo-field.is-filled');
 if(!(await page.$eval('.demo-field',e=>e.textContent.includes('Alex Morgan'))))throw Error('Demo fill failed');
 await page.$eval('.demo-comparison input',e=>{const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(e,'50');e.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.waitForSelector('.demo-comparison-line');
 await page.click('.demo-reset');if(await page.$('.demo-signature'))throw Error('Reset did not remove signature');
 await page.screenshot({path:'/tmp/templatecraft-landing-desktop.png',fullPage:true});
 for(const width of [320,390,768]){await page.setViewport({width,height:844});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`Overflow at ${width}`);}
 await page.setViewport({width:390,height:844});await page.screenshot({path:'/tmp/templatecraft-landing-mobile.png',fullPage:true});
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);const stage=await (await page.$('.demo-stage')).boundingBox();await page.mouse.move(stage.x+5,stage.y+5);if(await page.$eval('.document-stack',e=>getComputedStyle(e).transform!=='none'))throw Error('Reduced motion tilt enabled');
 await page.goto(base,{waitUntil:'networkidle0'});if(await page.$$eval('.sample-card',e=>e.length)!==1)throw Error('Expected one fictional sample');await page.click('.sample-card');await page.waitForSelector('.workspace');if(!(await page.$eval('.document-title h1',e=>e.textContent)).includes('sample-template'))throw Error('Wrong sample');
 await page.click('.brand');await page.waitForSelector('.start-screen');
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
 await page.evaluate(()=>document.querySelector('.document-demo').scrollIntoView({block:'center'}));await page.waitForFunction(()=>document.querySelector('.document-demo').dataset.running==='true');
 await page.mouse.move(0,0);if(await page.$$eval('.riffle-sheet',e=>e.length)!==6)throw Error('Expected six riffle pages');
 await page.click('.riffle-replay');if(!(await page.$eval('.riffle-sheet',e=>getComputedStyle(e).animationPlayState==='running')))throw Error('Riffle replay is not running');
 await page.click('.motion-toggle');if(!(await page.$$eval('.riffle-sheet,.depth-tool,.demo-orbit',elements=>elements.every(e=>getComputedStyle(e).animationPlayState==='paused'))))throw Error('Pause motion did not pause the scene');
 await page.click('.motion-toggle');if(!(await page.$eval('.depth-tool',e=>getComputedStyle(e).animationPlayState==='running')))throw Error('Play motion did not resume scene');
 if(!(await page.$eval('.document-float',e=>getComputedStyle(e).animationName.includes('document-drift'))))throw Error('Missing 3D idle motion');
 await page.setViewport({width:390,height:600});await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await page.waitForFunction(()=>document.querySelector('.document-demo').dataset.running==='false');
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);if(!(await page.$eval('.document-float',e=>getComputedStyle(e).animationName==='none')))throw Error('Reduced motion did not disable idle motion');if(!(await page.$eval('.riffle-sheet',e=>getComputedStyle(e).animationName==='none')))throw Error('Reduced motion did not disable riffle');
 await page.click('.sample-card');await page.waitForSelector('.workspace');await page.click('.field-actions button:nth-child(3)');
 page.once('dialog',dialog=>dialog.dismiss());await page.click('.brand');if(!(await page.$('.workspace')))throw Error('Cancel home lost the workspace');
 page.once('dialog',dialog=>dialog.accept());await page.click('.brand');await page.waitForSelector('.start-screen');
 if(await page.$('.workspace'))throw Error('Confirmed home did not leave editor');
 if(errors.length)throw Error(errors.join('\n'));console.log('Landing checks passed: dragging, keyboard movement, signature, fill, comparison, reset, responsive layout, reduced motion single fictional sample, 3D motion, offscreen pause, reduced motion and guarded home navigation.');
}finally{await browser.close();}
