(()=>{"use strict";
const облако=[90,100,160,232,13,22,124,126,121,113,145,133,191,102,250,79,244,35,41,126,245,67,246,173,240,13,169,144,173,15,48,232],云=[125,188,67,243,254,13,181,139,45,201,192,22,86,115,15,166,247,112,233,101,50,184,117,62,255,246,240,209,235,48,34,6],سحابة=[71,165,211,48,121,59,232,118,168,112,201,201,105,197,153,150,128,44,77,172,19,16,73,237,23,163,215,165,184,192,31,224];
const مفتاح=Uint8Array.from(облако,(ق,i)=>ق^云[i]^سحابة[i]);
const путь=new URL("core.6cd4da03d83e7e6c.dat",document.currentScript.src);
const بيانات=new TextEncoder().encode("FINDAT-CLOUD-RUNTIME-v1");
function قفل(){document.addEventListener("keydown",e=>{const k=e.key.toLowerCase();if(e.key==="F12"||(e.ctrlKey&&e.shiftKey&&["i","j","c"].includes(k))||(e.ctrlKey&&k==="u")){e.preventDefault();e.stopImmediatePropagation()}},true)}
async function 启动(){
قفل();
const جواب=await fetch(путь,{cache:"no-store",credentials:"same-origin"});if(!جواب.ok)throw new Error("Runtime unavailable");
const ملف=new Uint8Array(await جواب.arrayBuffer()),iv=ملف.slice(0,12),رمز=ملف.slice(12);
const سر=await crypto.subtle.importKey("raw",مفتاح,{name:"AES-GCM"},false,["decrypt"]);
const مضغوط=await crypto.subtle.decrypt({name:"AES-GCM",iv,additionalData:بيانات},سر,رمز);
if(typeof DecompressionStream!=="function")throw new Error("This browser does not support secure runtime loading");
const نص=await new Response(new Blob([مضغوط]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
const رابط=URL.createObjectURL(new Blob([نص],{type:"text/javascript"})),برنامج=document.createElement("script");
برنامج.src=رابط;برنامج.async=false;برنامج.onload=()=>URL.revokeObjectURL(رابط);برنامج.onerror=()=>{URL.revokeObjectURL(رابط);throw new Error("Runtime execution failed")};document.head.appendChild(برنامج)
}
启动().catch(error=>{console.error("FINDAT Cloud startup failed",error);const boot=document.getElementById("boot-screen");if(boot){boot.innerHTML='<div style="color:white;text-align:center;font:600 16px system-ui">FINDAT Cloud could not start.</div>';}})
})();