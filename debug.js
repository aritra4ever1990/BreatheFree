(function(){
  const el = document.getElementById('debugBtn');
  if(!el) return;
  let on=false;
  function overlay(){
    const divs=[...document.querySelectorAll('button, input, select, textarea, a')];
    divs.forEach(d=>{ d.style.outline = on? '2px solid #22c55e' : ''; });
  }
  function logButtons(){
    const btns=[...document.querySelectorAll('button')];
    console.table(btns.map(b=>({text:b.textContent.trim().slice(0,40), visible:!!(b.offsetWidth||b.offsetHeight), pe:getComputedStyle(b).pointerEvents, z:getComputedStyle(b).zIndex})));
  }
  el.addEventListener('click', ()=>{ on=!on; overlay(); logButtons(); });
  window.SMOKELESS_DEBUG = { overlay:()=>{on=!on; overlay();}, logButtons };
})();
