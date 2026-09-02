const APP='https://iiils3.github.io/ResolveRelay/';
const $=id=>document.getElementById(id);
chrome.tabs.query({active:true,currentWindow:true},tabs=>{const tab=tabs[0];if(!tab)return;$('title').value=tab.title||'';$('url').value=tab.url||'';try{$('merchant').value=new URL(tab.url).hostname.replace(/^www\./,'')}catch{}});
$('save').addEventListener('click',()=>{const p=new URLSearchParams({title:$('title').value,url:$('url').value,merchant:$('merchant').value,price:$('price').value});chrome.tabs.create({url:APP+'#/fingerprints?'+p.toString()});});
