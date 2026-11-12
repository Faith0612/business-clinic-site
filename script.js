var btn = document.getElementById('menuBtn');
var menu = document.getElementById('menu');
function setMenu(open) {
  menu.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
btn.addEventListener('click', function (e) { e.stopPropagation(); setMenu(!menu.classList.contains('open')); });
document.addEventListener('click', function (e) { if (!menu.contains(e.target)) setMenu(false); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setMenu(false); btn.focus(); } });

/* show a labelled placeholder if a photo file is missing */
document.querySelectorAll('.ph img').forEach(function (img) {
  function miss() { img.parentNode.classList.add('missing'); }
  if (img.complete && img.naturalWidth === 0) miss();
  img.addEventListener('error', miss);
});
