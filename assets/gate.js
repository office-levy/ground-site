/* The site's door, which is the whole site for now (Site/build.mjs `door`): the waitlist, and behind
   "Have an invitation code?" a box for each of a code's letters. An address goes to Compile's cloud's waitlist
   (Cloud/src/waitlist.ts), which answers this page alone. A code goes to the cloud too, which answers a
   code Compile made with where Compile downloads from; the code's form then gives way to the code in its
   box, the download, and Open in Compile with the code, which rise into its place, as the cloud's code page
   ends (Cloud/src/web.ts `codeInvitation`). On a phone, Send Link… in the download's place. Nothing is kept
   here. The site is made from Site/ in the Ground repository; change it there, never here. */
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
  var field = document.getElementById('typed');
  var problem = document.getElementById('problem');
  var got = document.getElementById('got');
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
        // What comes next: the operator sends every code by email (the journey audit, 4 November 2026).
        say(said, 'You’re on the waitlist. Your code will come by email.');
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
     form and the way to the waitlist step back, and the code in its box rises into their place with the
     download under it, then Open in Compile with the code, so it is typed once (the journey audit, 4 November
     2026). On a phone or a tablet, the code page's words for one and Send Link… in the download's place. */
  function opened(link, plain) {
    entering.classList.add('done');
    field.readOnly = true;
    field.blur();
    var phone = handheld();
    keep(plain);
    open.href = 'ground://code#c=' + plain;
    download.href = link;
    mac.hidden = phone;
    away.hidden = !phone;
    var first = phone ? share : download;
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
        appear(got);
        // The download, or Send Link…, takes the focus the code had, without a ring until a key is pressed.
        got.classList.add('quiet');
        document.addEventListener('keydown', function loud() { got.classList.remove('quiet'); document.removeEventListener('keydown', loud); });
        try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); }
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
          opened(answer.download, plain);
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

  // MARK: Once the code was one

  /* The code page's test (Cloud/src/web.ts `handheldAgent`), and an iPad that presents itself as a Mac, as its
     OPENING finds one: Compile can't open on either. */
  function handheld() {
    var agent = navigator.userAgent || '';
    return /iPhone|iPad|iPod|Android/i.test(agent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(agent));
  }

  var mac = document.getElementById('mac');
  var away = document.getElementById('handheld');
  var share = document.getElementById('send-link');
  var open = document.getElementById('open');
  var note = document.getElementById('note');
  var copy = document.getElementById('copy');
  var shownCode = document.getElementById('code');
  var copied = document.getElementById('copied');
  var kept = '', shown = '', back = 0;

  /* The code in its box, in fours, as the code page shows it (`KEPT`): a click copies it, for typing into
     Compile where Open in Compile didn't open it, and the copy symbol turns to a tick a moment. */
  function keep(plain) {
    kept = plain;
    shown = plain.match(/.{4}/g).join('-');
    shownCode.textContent = shown;
    copy.setAttribute('aria-label', 'Copy invitation code ' + shown);
  }
  function copiedNow() {
    copy.classList.add('copied');
    copied.textContent = 'Copied';
    window.clearTimeout(back);
    back = window.setTimeout(function () { copy.classList.remove('copied'); copied.textContent = ''; }, 1800);
  }
  /* Copied within the click itself first, which every browser allows; the clipboard's own call where that can't. */
  function copyInClick() {
    var area = document.createElement('textarea');
    area.value = shown;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    area.remove();
    copy.focus();
    return ok;
  }
  copy.addEventListener('click', function () {
    if (!shown) return;
    if (copyInClick()) copiedNow();
    else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(shown).then(copiedNow, function () {});
  });

  /* Open in Compile, tried as the code page tries it (Cloud/src/web.ts `OPENING`), without leaving the page: the
     link is opened in a frame of its own, where a Mac without Compile shows nothing at all. If the page still has
     the focus a moment later, nothing took it, and the line under it says so; if Compile takes it after all, the
     line goes. */
  var waiting = 0, watching = false;
  function left() { window.clearTimeout(waiting); waiting = 0; note.textContent = ''; }
  open.addEventListener('click', function (event) {
    event.preventDefault();
    if (!watching) {
      watching = true;
      window.addEventListener('blur', left);
      document.addEventListener('visibilitychange', function () { if (document.hidden) left(); });
    }
    note.textContent = '';
    var frame = document.createElement('iframe');
    frame.hidden = true;
    frame.src = open.href;
    document.body.appendChild(frame);
    window.setTimeout(function () { frame.remove(); }, 4000);
    window.clearTimeout(waiting);
    waiting = window.setTimeout(function () {
      waiting = 0;
      if (document.hasFocus() && !document.hidden) note.textContent = 'Compile didn’t open. If it isn’t on this Mac, download it above first.';
    }, 1200);
  });

  /* On a phone: the code page for this code, handed to the share sheet to send to a Mac, as the code page's own
     Send Link… does; without a share sheet, what to do instead. */
  share.addEventListener('click', function () {
    if (navigator.share) navigator.share({ title: 'Invitation · Compile', url: cloud + '/i#c=' + kept }).catch(function () {});
    else note.textContent = 'Open this link on your Mac.';
  });

  /* The download's button carries the Apple logo, which only Apple's own systems' font has (U+F8FF, as SF
     Pro draws it): elsewhere the button has its words alone. */
  if (/Mac|iPhone|iPad|iPod/.test(navigator.platform || '') || /Macintosh|iPhone|iPad/.test(navigator.userAgent || '')) {
    document.documentElement.classList.add('apple');
  }

  // MARK: Light or Dark

  /* The moon at the top right: Light, or Dark again, kept in this browser (the owner, 29 October 2026: “the
     symbol for dark and light is tha thalf moon and then fill all white on dark mode”). Until it is used, the
     page is Dark, whatever the reader's system is (the owner, 4 November 2026: “default dark mode in app and on
     website”; Site/build.mjs `look`). The browser's own bars and its colour scheme turn with the page. */
  var theme = document.getElementById('theme');
  var root = document.documentElement;
  function isDark() { return root.getAttribute('data-theme') !== 'light'; }
  function showTheme() { theme.setAttribute('aria-pressed', isDark() ? 'true' : 'false'); }
  theme.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    var bar = document.querySelector('meta[name="theme-color"]');
    if (bar) bar.setAttribute('content', bar.getAttribute('data-' + next));
    var scheme = document.querySelector('meta[name="color-scheme"]');
    if (scheme) scheme.setAttribute('content', next);
    try { localStorage.setItem('appearance', next); } catch (e) {}
    showTheme();
  });
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
