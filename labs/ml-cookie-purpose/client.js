// Closed use: this cookie changes layout density only. Authentication uses the
// server's separate HttpOnly account_sid and never reads this preference.
const preferenceName='session_visual_mode';
function preference(){
  const pair=document.cookie.split(';').map(part=>part.trim()).find(part=>part.startsWith(preferenceName+'='));
  return pair?.slice(preferenceName.length+1)==='compact'?'compact':'comfortable';
}
function renderDensity(){document.documentElement.dataset.density=preference();document.querySelector('#density').value=preference();}
renderDensity();
document.querySelector('#density').addEventListener('change',event=>{
  const value=event.target.value==='compact'?'compact':'comfortable';
  document.cookie=preferenceName+'='+value+'; Path=/; SameSite=Lax';renderDensity();
});
fetch('/api/protected',{cache:'no-store'}).then(response=>{
  document.querySelector('#account').textContent=response.status===200?'Synthetic account connected':'Signed out';
  document.documentElement.dataset.ready='true';
});
