(function () {
  try {
    var t = localStorage.getItem('ingilizce-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.dataset.theme = t;
    } else {
      document.documentElement.dataset.theme = 'light';
    }
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
