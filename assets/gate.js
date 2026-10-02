/* The gate. The site is sealed: every page, its style and script, and every picture are AES-256-GCM
   payloads in vault/, under a key drawn from the invitation code with PBKDF2-SHA256. The code opens
   them here, in the browser; the page then takes this one's place. The key (never the code) stays
   in this tab's sessionStorage, so going between pages does not ask again. */
(function () {
  'use strict';

  var ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var LENGTH = 12;
  var STORE = 'ground.key';
  var WRONG = 'That code isn’t right. Try again.';
  var FAILED = 'The page couldn’t load. Try again.';
  var OLD = 'This browser can’t open the page. Try another.';

  var vault = JSON.parse(document.getElementById('vault').textContent);
  var form = document.getElementById('gate');
  var field = document.getElementById('code');
  var go = document.getElementById('go');
  var problem = document.getElementById('problem');
  var encoder = new TextEncoder();
  var decoder = new TextDecoder();
  var working = false;

  /* A code as it was typed, in any case, with or without its dashes and spaces; null if it can't be
     one (Cloud/src/invitations.ts `code()`). */
  function normalized(typed) {
    var plain = String(typed).toUpperCase().replace(/[\s-]/g, '');
    if (plain.length !== LENGTH) return null;
    for (var i = 0; i < plain.length; i++) if (ALPHABET.indexOf(plain[i]) < 0) return null;
    return plain;
  }
  function plainOf(text) { return String(text).toUpperCase().replace(/[\s-]/g, ''); }
  function shown(plain) { return (plain.match(/.{1,4}/g) || []).join('-'); }

  function bytes(base64) {
    var s = atob(base64), out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  function base64(data) {
    var s = '';
    for (var i = 0; i < data.length; i++) s += String.fromCharCode(data[i]);
    return btoa(s);
  }
  function remember(raw) { try { sessionStorage.setItem(STORE, base64(raw)); } catch (e) {} }
  function remembered() { try { var v = sessionStorage.getItem(STORE); return v ? bytes(v) : null; } catch (e) { return null; } }
  function forget() { try { sessionStorage.removeItem(STORE); } catch (e) {} }

  function say(words) { problem.textContent = words || ''; }
  function ready() { go.disabled = working || normalized(field.value) === null; }
  function showGate() { document.documentElement.className = ''; }

  /* Typing puts the code in fours, between dashes, as Ground shows it ("7KQM-X9PA-3RTW"). */
  function format() {
    var value = field.value;
    var caret = field.selectionStart == null ? value.length : field.selectionStart;
    var before = plainOf(value.slice(0, caret)).length;
    var plain = plainOf(value).slice(0, LENGTH);
    var next = shown(plain);
    if (next !== value) {
      field.value = next;
      var n = Math.min(before, plain.length);
      var at = Math.min(next.length, n + Math.floor(n / 4) - (n > 0 && n % 4 === 0 && n === plain.length ? 1 : 0));
      try { field.setSelectionRange(at, at); } catch (e) {}
    }
    if (problem.textContent && problem.textContent !== FAILED) say('');
    ready();
  }
  field.addEventListener('input', format);
  field.addEventListener('keydown', function (event) {
    // Backspace just after a dash takes the letter before it, not only the dash.
    if (event.key !== 'Backspace' || field.selectionStart !== field.selectionEnd) return;
    var at = field.selectionStart;
    if (at > 1 && field.value[at - 1] === '-') {
      event.preventDefault();
      field.value = field.value.slice(0, at - 2) + field.value.slice(at);
      try { field.setSelectionRange(at - 2, at - 2); } catch (e) {}
      format();
    }
  });

  var subtle = window.crypto && window.crypto.subtle;

  function fetched(path) {
    return fetch(path, { cache: 'no-cache', credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error('missing');
      return r.arrayBuffer();
    });
  }
  // The sealed manifest, asked for at once so it is here by the time the code is.
  var manifestBox = fetched(vault.manifest);
  manifestBox.catch(function () {});

  function opened(key, sealed, name) {
    var data = new Uint8Array(sealed);
    return subtle.decrypt({ name: 'AES-GCM', iv: data.subarray(0, 12), additionalData: encoder.encode(name), tagLength: 128 },
      key, data.subarray(12)).then(function (plain) { return new Uint8Array(plain); });
  }
  function keyFrom(raw) { return subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']); }
  function derived(plain) {
    return subtle.importKey('raw', encoder.encode(plain), 'PBKDF2', false, ['deriveBits']).then(function (base) {
      return subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: bytes(vault.salt), iterations: vault.iterations }, base, 256);
    }).then(function (bits) { return new Uint8Array(bits); });
  }

  /* The manifest, opened with this key: null if the key is wrong. */
  function manifestWith(key) {
    return manifestBox.then(function (sealed) {
      return opened(key, sealed, 'manifest').then(function (plain) {
        return JSON.parse(decoder.decode(plain));
      }, function () { return null; });
    });
  }

  function file(key, manifest, path) {
    var entry = manifest.files[path];
    if (!entry) return Promise.reject(new Error('missing ' + path));
    return fetched(entry.blob).then(function (sealed) { return opened(key, sealed, path); });
  }

  /* The page, opened, in this one's place: its pictures as blob URLs, its style and script inline. */
  function show(key, manifest) {
    var page = vault.page;
    return Promise.all([
      file(key, manifest, page),
      file(key, manifest, 'assets/site.css'),
      file(key, manifest, 'assets/site.js')
    ]).then(function (parts) {
      var html = decoder.decode(parts[0]);
      var css = decoder.decode(parts[1]);
      var js = decoder.decode(parts[2]);
      var names = [];
      html.replace(/pictures\/[A-Za-z0-9_-]+\.jpg/g, function (m) { if (names.indexOf(m) < 0) names.push(m); return m; });
      return Promise.all(names.map(function (name) {
        return file(key, manifest, name).then(function (data) {
          return URL.createObjectURL(new Blob([data], { type: 'image/jpeg' }));
        });
      })).then(function (urls) {
        var url = {};
        names.forEach(function (name, i) { url[name] = urls[i]; });
        html = html.replace(/pictures\/[A-Za-z0-9_-]+\.jpg/g, function (m) { return url[m]; });
        html = html.replace(/<link rel="stylesheet" href="assets\/site\.css">/, function () {
          return '<style>' + css.replace(/<\/style/gi, '<\\/style') + '</style>';
        });
        html = html.replace(/<script src="assets\/site\.js"><\/script>/, function () {
          return '<script>' + js.replace(/<\/script/gi, '<\\/script') + '</script>' +
            '<script>(function(){var h=location.hash.slice(1);if(!h)return;var t=document.getElementById(decodeURIComponent(h));' +
            'if(!t)return;function j(){t.scrollIntoView({behavior:"instant",block:"start"});}j();addEventListener("load",j);})();</script>';
        });
        html = html.replace(/<head>/, function () { return '<head>\n<meta name="robots" content="noindex, nofollow">'; });
        document.open();
        document.write(html);
        document.close();
      });
    });
  }

  function unlock(raw, fromStore) {
    return keyFrom(raw).then(function (key) {
      return manifestWith(key).then(function (manifest) {
        if (!manifest) return false;
        if (!fromStore) remember(raw);
        return show(key, manifest).then(function () { return true; });
      });
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var plain = normalized(field.value);
    if (!plain || working) return;
    if (!subtle) { say(OLD); return; }
    working = true;
    ready();
    say('');
    derived(plain).then(function (raw) { return unlock(raw, false); }).then(function (opened) {
      if (opened) return;
      working = false;
      say(WRONG);
      ready();
      field.focus();
      field.select();
    }, function () {
      working = false;
      // The manifest may not have come: ask for it again next time.
      manifestBox = fetched(vault.manifest);
      manifestBox.catch(function () {});
      say(FAILED);
      ready();
    });
  });

  // This tab opened the site before: open it again without asking.
  var raw = remembered();
  if (raw && subtle) {
    unlock(raw, true).then(function (opened) {
      if (!opened) { forget(); showGate(); field.focus(); }
    }, function () { showGate(); say(FAILED); });
  } else {
    showGate();
    field.focus();
  }
  ready();
})();
