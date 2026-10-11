/* Maine Stone Scapes — the few details that still need confirming. Edit here; every page picks them up.
 *
 * facebook            Full Facebook page URL. Leave '' and every Facebook link stays hidden.
 * instagramFollowers  e.g. '12.4K'. Leave '' and the follower count stays hidden.
 */
window.MSS_CONFIG = {
  instagram: 'https://www.instagram.com/mainestonescapes/',
  facebook: '',
  instagramFollowers: ''
};

/* If a photo file is ever missing, show a plain stone-colored tile instead of a broken-image icon.
   Runs before images load, so it catches every <img> on the page. */
document.addEventListener('error', function (e) {
  if (e.target && e.target.tagName === 'IMG') e.target.classList.add('is-missing');
}, true);
