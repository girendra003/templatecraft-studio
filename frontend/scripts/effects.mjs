import puppeteer from 'puppeteer-core';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=process.env.BASE_URL || 'http://127.0.0.1:8010';
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:1000});
 const directory=await mkdtemp(path.join(tmpdir(), 'templatecraft-effects-'));const client=await page.createCDPSession();await client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:directory});
 let failUpload=false, failDownload=false, downloads=0;
 await page.setRequestInterception(true);page.on('request',async request=>{
  const upload=request.url().includes('/api/upload');const download=request.url().includes('/api/download/');
  if(download)downloads++;
  if(upload||download)await new Promise(resolve=>setTimeout(resolve,500));
  if((upload&&failUpload)||(download&&failDownload))await request.respond({status:500,contentType:'application/json',body:JSON.stringify({detail:'Intentional test failure'})});else await request.continue();
 });
 await page.goto(base,{waitUntil:'networkidle0'});await page.screenshot({path:'/tmp/templatecraft-flashy-landing.png',fullPage:true});
 const input=await page.$('input[type=file]');await input.uploadFile(path.join(root,'assets/forms/sample-template.pdf'));
 await page.waitForSelector('.operation-loader');await page.screenshot({path:'/tmp/templatecraft-upload-effect.png'});
 await page.waitForSelector('.workspace');await page.waitForSelector('.action-celebration.upload');if(await page.$$eval('.action-sparkles i',e=>e.length)!==14)throw Error('Missing success particles');
 await page.screenshot({path:'/tmp/templatecraft-upload-success.png'});
 await page.click('.control-panel nav button:last-child');await page.click('.export-card');await page.waitForSelector('.operation-loader');await page.waitForSelector('.action-celebration.download');
 await page.screenshot({path:'/tmp/templatecraft-download-effect.png'});
 for(let i=0;i<30;i++){if((await readdir(directory)).includes('template.pdf'))break;await new Promise(resolve=>setTimeout(resolve,100));}
 if(!(await readFile(path.join(directory,'template.pdf'))).subarray(0,4).equals(Buffer.from('%PDF')))throw Error('PDF download is invalid');
 await page.waitForFunction(()=>!document.querySelector('.action-celebration'));
 failDownload=true;await page.click('.export-card');await page.waitForFunction(()=>document.querySelector('.toast.error')?.textContent.includes('Export failed'));
 if(await page.$('.action-celebration.download'))throw Error('Failed download celebrated');
 failUpload=true;await input.uploadFile(path.join(root,'assets/forms/sample-template.pdf'));await page.waitForSelector('.operation-loader');await page.waitForFunction(()=>!document.querySelector('.operation-loader'));
 if(await page.$('.action-celebration.upload'))throw Error('Failed upload celebrated');
 failUpload=false;await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await input.uploadFile(path.join(root,'assets/forms/sample-template.pdf'));await page.waitForSelector('.action-celebration.upload');
 if(await page.$eval('.action-sparkles',e=>getComputedStyle(e).display!=='none'))throw Error('Reduced motion particles visible');
 if(await page.$eval('.action-celebration',e=>getComputedStyle(e).animationName!=='none'))throw Error('Reduced motion celebration animated');
 if(downloads!==2)throw Error('Unexpected duplicate download requests');if(errors.length)throw Error(errors.join('\n'));
 console.log('Action effects passed: actual PDF upload/download, loading/success effects, real downloaded PDF, failure handling and reduced motion.');
}finally{await browser.close();}
