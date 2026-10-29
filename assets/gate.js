/* The site's door, which is the whole site for now (Site/build.mjs `door`): the waitlist, and behind
   "Have an invitation code?" a box for each of a code's letters. An address goes to Compile's cloud's waitlist
   (Cloud/src/waitlist.ts), which answers this page alone. A code goes to the cloud too, which answers a
   code Compile made with where Compile downloads from; the code's form then gives way to the download,
   which rises into its place. Nothing is kept here. The site is made from Site/ in the Ground repository;
   change it there, never here. */
(function () {
  'use strict';

  var ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var LENGTH = 12;

  var cloud = document.querySelector('.gate').getAttribute('data-cloud');
  var asking = document.getElementById('ask');
  var email = document.getElementById('email');
  var send = document.getElementById('send');
  var said = document.getElementById('asked');
  var entering = document.getElementById('enter');
  var field = document.getElementById('code');
  var problem = document.getElementById('problem');
  var get = document.getElementById('get');
  var download = document.getElementById('download');
  var switchLine = document.getElementById('switch-line');
  var words = document.getElementById('switch-words');
  var toggle = document.getElementById('switch');
  var sending = false, checking = false;

  function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function appear(element) {
    element.hidden = false;
    element.classList.remove('shown');
    void element.offsetWidth;
    element.classList.add('shown');
  }
  /* A message under a field, arriving as the form did; nothing, at once. */
  function say(element, text) {
    element.textContent = text;
    if (text) appear(element); else element.classList.remove('shown');
  }

  // MARK: The waitlist

  function looksRight() { return /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(email.value.trim()); }
  function readyAsk() { send.disabled = sending || asking.classList.contains('done') || !looksRight(); }

  email.addEventListener('input', function () { say(said, ''); readyAsk(); });
  asking.addEventListener('submit', function (event) {
    event.preventDefault();
    if (sending || !looksRight()) return;
    sending = true;
    asking.classList.add('sending');
    readyAsk();
    // The button's filled arrow says the address is going; no words with it (the owner, 29 October 2026).
    say(said, '');
    fetch(cloud + '/v1/waitlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim() })
    }).then(function (response) {
      if (response.status === 202) {
        asking.classList.add('done');
        email.readOnly = true;
        say(said, 'You’re on the waitlist.');
        return;
      }
      // 429: this network's five a day, or everyone's day's asks (Cloud/src/waitlist.ts): both are today's.
      say(said, response.status === 400 ? 'That isn’t an email address.'
        : response.status === 429 ? 'Too many addresses were left today. Try again tomorrow.'
        : 'Compile couldn’t save your address. Try again.');
    }, function () {
      say(said, 'Compile couldn’t connect. Check your internet connection and try again.');
    }).then(function () { sending = false; asking.classList.remove('sending'); readyAsk(); });
  });

  // MARK: An invitation code

  /* A box for each of the code's twelve letters and digits (the owner, 28 October 2026: “the entry … should
     just be a thing per character or digit”). One field, unseen, over the boxes takes what is typed or
     pasted, in any case, with or without dashes and spaces; the boxes show it, a letter landing in each, and
     the box that is next shows a caret. A letter no code has (I, L, O, 0, 1) isn't taken. The code checks
     itself once its twelfth letter is in (Cloud/src/invitations.ts `code()`). */
  var boxes = Array.prototype.slice.call(document.querySelectorAll('#cells .box'));
  var cells = document.getElementById('cells');
  var drawn = '', refused = '';

  function plainOf(text) {
    var upper = String(text).toUpperCase(), plain = '';
    for (var i = 0; i < upper.length && plain.length < LENGTH; i++) if (ALPHABET.indexOf(upper[i]) >= 0) plain += upper[i];
    return plain;
  }
  /* The caret stays after the last letter: a letter is taken back from the end, as it was given. */
  function toEnd() {
    var end = field.value.length;
    if (field.selectionStart !== end || field.selectionEnd !== end) { try { field.setSelectionRange(end, end); } catch (e) {} }
  }
  function draw() {
    var plain = plainOf(field.value);
    if (field.value !== plain) field.value = plain;
    toEnd();
    boxes.forEach(function (box, i) {
      var letter = plain[i] || '';
      if (box.textContent !== letter) {
        box.textContent = letter;
        box.classList.remove('landed');
        if (letter && i >= drawn.length && !reduced()) { void box.offsetWidth; box.classList.add('landed'); }
      }
      box.classList.toggle('next', i === plain.length);
    });
    drawn = plain;
    return plain;
  }
  field.addEventListener('input', function () {
    var plain = draw();
    say(problem, '');
    if (plain.length === LENGTH && plain !== refused) check();
  });
  ['focus', 'click', 'keyup', 'select'].forEach(function (kind) { field.addEventListener(kind, toEnd); });

  /* Not a code: the boxes shake a little, as a Mac's password field does, and keep what was typed to put right. */
  function shake() {
    if (reduced()) return;
    cells.classList.remove('wrong');
    void cells.offsetWidth;
    cells.classList.add('wrong');
  }
  cells.addEventListener('animationend', function (event) { if (event.target === cells) cells.classList.remove('wrong'); });

  /* The code was one: the boxes' tint clears, one after another, leaving the code, which holds a moment; the
     form and the way to the waitlist step back, and the download rises into their place. */
  function opened(link) {
    entering.classList.add('done');
    field.readOnly = true;
    field.blur();
    download.href = link;
    var calm = reduced();
    // The column keeps its height while the form gives way, so nothing above it moves.
    var column = document.querySelector('.col');
    column.style.minHeight = column.offsetHeight + 'px';
    window.setTimeout(function () {
      entering.classList.add('leaving');
      switchLine.classList.add('leaving');
      window.setTimeout(function () {
        entering.hidden = true;
        switchLine.hidden = true;
        appear(get);
        // The download takes the focus the code had, without a ring until a key is pressed.
        get.classList.add('quiet');
        document.addEventListener('keydown', function loud() { get.classList.remove('quiet'); document.removeEventListener('keydown', loud); });
        try { download.focus({ preventScroll: true }); } catch (e) { download.focus(); }
      }, calm ? 0 : 240);
    }, calm ? 0 : 820);
  }

  /* What the download is, as the cloud reads it from Sparkle's feed when it answers the code (the owner, 29
     October 2026: “make sure its connected to sparkle somehow”): its version and build, its size, and the macOS
     it needs, in place of what the page said when it was made. */
  function newest(release) {
    var plain = /^[0-9]{1,4}(\.[0-9]{1,4}){0,3}$/;
    if (!release || !plain.test(String(release.version)) || !/^[0-9]{1,7}$/.test(String(release.build))) return;
    var said = 'Version ' + release.version + ' (' + release.build + ')';
    if (typeof release.bytes === 'number' && release.bytes > 0) said += ' \u00B7 ' + Math.round(release.bytes / 1e6) + ' MB';
    get.querySelector('.release').textContent = said;
    if (plain.test(String(release.minimum))) get.querySelector('.system').textContent = 'macOS ' + String(release.minimum).replace(/\.0$/, '') + ' or later';
  }

  function check() {
    var plain = plainOf(field.value);
    if (plain.length !== LENGTH || checking || entering.classList.contains('done')) return;
    checking = true;
    entering.classList.add('sending');
    // The cells' wave says the code is being checked; no words with it (the owner, 29 October 2026).
    say(problem, '');
    fetch(cloud + '/v1/site/download', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: plain })
    }).then(function (response) {
      if (response.status === 200) {
        return response.json().then(function (answer) {
          if (!answer || typeof answer.download !== 'string') throw new Error('no download');
          entering.classList.remove('sending');
          say(problem, '');
          if (answer.release) newest(answer.release);
          opened(answer.download);
        });
      }
      entering.classList.remove('sending');
      if (response.status === 404) { refused = plain; shake(); }
      say(problem, response.status === 404 ? 'That isn’t an invitation code. Check it and try again.'
        : response.status === 429 ? 'Too many codes were tried from here today. Try again tomorrow.'
        : 'Compile couldn’t check the code. Try again.');
      field.focus();
    }).catch(function () {
      entering.classList.remove('sending');
      say(problem, 'Compile couldn’t connect. Check your internet connection and try again.');
    }).then(function () { checking = false; });
  }
  entering.addEventListener('submit', function (event) { event.preventDefault(); check(); });

  /* The download's button carries the Apple logo, which only Apple's own systems' font has (U+F8FF, as SF
     Pro draws it): elsewhere the button has its words alone. */
  if (/Mac|iPhone|iPad|iPod/.test(navigator.platform || '') || /Macintosh|iPhone|iPad/.test(navigator.userAgent || '')) {
    document.documentElement.classList.add('apple');
  }

  // MARK: Light or Dark

  /* The moon at the top right: Dark, or Light again, kept in this browser (the owner, 29 October 2026: “the
     symbol for dark and light is tha thalf moon and then fill all white on dark mode”). Until it is used, the
     page is as the reader's system is. */
  var theme = document.getElementById('theme');
  var root = document.documentElement;
  var systemDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function isDark() {
    var chosen = root.getAttribute('data-theme');
    return chosen ? chosen === 'dark' : !!(systemDark && systemDark.matches);
  }
  function showTheme() { theme.setAttribute('aria-pressed', isDark() ? 'true' : 'false'); }
  theme.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('appearance', next); } catch (e) {}
    showTheme();
  });
  if (systemDark && systemDark.addEventListener) systemDark.addEventListener('change', showTheme);
  showTheme();

  // MARK: Between the two

  /* The form going steps back and the words under it fade as they change; then the other form arrives, the
     same height, so nothing else moves. On a touch screen the other form arrives at once, in the tap itself:
     a phone raises its keyboard only for a field focused there. */
  var swap = 0;
  function touch() { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); }
  function mode(ask) {
    var going = ask ? entering : asking, coming = ask ? asking : entering;
    window.clearTimeout(swap);
    function arrive() {
      going.hidden = true;
      going.classList.remove('stepping');
      appear(coming);
      // Back to the waitlist, in its words alone (the owner, 28 October 2026: “cut 'new to compile'”).
      words.hidden = !ask;
      toggle.textContent = ask ? 'Enter it' : 'Join the waitlist';
      toggle.setAttribute('aria-controls', ask ? 'enter' : 'ask');
      switchLine.classList.remove('swapping');
      if (!ask) field.focus();
      else if (!asking.classList.contains('done')) email.focus();
    }
    if (reduced() || touch()) { arrive(); return; }
    going.classList.add('stepping');
    switchLine.classList.add('swapping');
    swap = window.setTimeout(arrive, 160);
  }
  toggle.addEventListener('click', function () { mode(asking.hidden); });

  readyAsk();
  draw();
})();
