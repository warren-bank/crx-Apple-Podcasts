// ==UserScript==
// @name         Apple Podcasts
// @description  Listen to audio podcasts in external player.
// @version      1.0.0
// @match        *://podcasts.apple.com/*
// @match        *://*.podcasts.apple.com/*
// @icon         https://podcasts.apple.com/favicon.ico
// @run-at       document-end
// @homepage     https://github.com/warren-bank/crx-Apple-Podcasts/tree/webmonkey-userscript/es5
// @supportURL   https://github.com/warren-bank/crx-Apple-Podcasts/issues
// @downloadURL  https://github.com/warren-bank/crx-Apple-Podcasts/raw/webmonkey-userscript/es5/webmonkey-userscript/Apple-Podcasts.user.js
// @updateURL    https://github.com/warren-bank/crx-Apple-Podcasts/raw/webmonkey-userscript/es5/webmonkey-userscript/Apple-Podcasts.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

// ----------------------------------------------------------------------------- constants

var user_options = {
  "common": {
    "rewrite_page_dom":             true
  },
  "webmonkey": {
    "post_intent_redirect_to_url":  "about:blank"
  },
  "greasemonkey": {
    "redirect_to_webcast_reloaded": true,
    "force_http":                   true,
    "force_https":                  false
  }
}

var strings = {
  "button_start_video":            "Start Podcast",
  "episode_labels": {
    "title":                       "title:",
    "summary":                     "summary:",
    "date_release":                "air date:",
    "time_duration":               "duration:",
    "drm":                         "drm:"
  },
  "episode_units": {
    "duration_hour":               "hour",
    "duration_hours":              "hours",
    "duration_minutes":            "minutes"
  }
}

var constants = {
  "dom_classes": {
    "div_webcast_icons":           "icons-container"
  },
  "img_urls": {
    "base_webcast_reloaded_icons": "https://github.com/warren-bank/crx-webcast-reloaded/raw/gh-pages/chrome_extension/2-release/popup/img/"
  }
}

// ----------------------------------------------------------------------------- helpers

var make_element = function(elementName, html) {
  var el = unsafeWindow.document.createElement(elementName)

  if (html)
    el.innerHTML = html

  return el
}

var add_style_element = function(css) {
  if (!css) return

  var head = unsafeWindow.document.getElementsByTagName('head')[0]
  if (!head) return

  if ('function' === (typeof css))
    css = css()
  if (Array.isArray(css))
    css = css.join("\n")

  head.appendChild(
    make_element('style', css)
  )
}

// ----------------------------------------------------------------------------- URL links to tools on Webcast Reloaded website

var get_webcast_reloaded_url = function(video_url, vtt_url, referer_url, drm_scheme, drm_server, force_http, force_https) {
  force_http  = (typeof force_http  === 'boolean') ? force_http  : user_options.greasemonkey.force_http
  force_https = (typeof force_https === 'boolean') ? force_https : user_options.greasemonkey.force_https

  var encoded_video_url, encoded_vtt_url, encoded_referer_url, encoded_drm_url, webcast_reloaded_base, webcast_reloaded_url

  encoded_video_url     = encodeURIComponent(encodeURIComponent(btoa(video_url)))
  encoded_vtt_url       = vtt_url ? encodeURIComponent(encodeURIComponent(btoa(vtt_url))) : null
  referer_url           = referer_url ? referer_url : unsafeWindow.location.href
  encoded_referer_url   = encodeURIComponent(encodeURIComponent(btoa(referer_url)))
  encoded_drm_url       = (drm_scheme && drm_server) ? encodeURIComponent(encodeURIComponent(btoa(drm_scheme + '|' + drm_server))) : null

  webcast_reloaded_base = {
    "https": "https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html",
    "http":  "http://webcast-reloaded.surge.sh/index.html"
  }

  webcast_reloaded_base = (force_http)
                            ? webcast_reloaded_base.http
                            : (force_https)
                               ? webcast_reloaded_base.https
                               : (video_url.toLowerCase().indexOf('http:') === 0)
                                  ? webcast_reloaded_base.http
                                  : webcast_reloaded_base.https

  webcast_reloaded_url  = webcast_reloaded_base    + '#/watch/'    + encoded_video_url
                            + (encoded_vtt_url     ? ('/subtitle/' + encoded_vtt_url) : '')
                            + (encoded_referer_url ? ('/referer/'  + encoded_referer_url) : '')
                            + (encoded_drm_url     ? ('/drm/'      + encoded_drm_url) : '')

  return webcast_reloaded_url
}

var get_webcast_reloaded_url_chromecast_sender = function(video_url, vtt_url, referer_url, drm_scheme, drm_server) {
  return get_webcast_reloaded_url(video_url, vtt_url, referer_url, drm_scheme, drm_server, /* force_http= */ null, /* force_https= */ null).replace('/index.html', '/chromecast_sender.html')
}

var get_webcast_reloaded_url_airplay_sender = function(video_url, vtt_url, referer_url, drm_scheme, drm_server) {
  return get_webcast_reloaded_url(video_url, vtt_url, referer_url, drm_scheme, drm_server, /* force_http= */ true, /* force_https= */ false).replace('/index.html', '/airplay_sender.es5.html')
}

var get_webcast_reloaded_url_proxy = function(hls_url, vtt_url, referer_url, drm_scheme, drm_server) {
  return get_webcast_reloaded_url(hls_url, vtt_url, referer_url, drm_scheme, drm_server, /* force_http= */ true, /* force_https= */ false).replace('/index.html', '/proxy.html')
}

// ----------------------------------------------------------------------------- URL redirect

var redirect_to_url = function(url) {
  if (!url) return

  if (typeof GM_loadUrl === 'function') {
    if (typeof GM_resolveUrl === 'function')
      url = GM_resolveUrl(url, unsafeWindow.location.href) || url

    GM_loadUrl(url, 'Referer', unsafeWindow.location.href)
  }
  else {
    try {
      unsafeWindow.top.location = url
    }
    catch(e) {
      unsafeWindow.window.location = url
    }
  }
}

var process_webmonkey_post_intent_redirect_to_url = function() {
  var url = null

  if (typeof user_options.webmonkey.post_intent_redirect_to_url === 'string')
    url = user_options.webmonkey.post_intent_redirect_to_url

  if (typeof user_options.webmonkey.post_intent_redirect_to_url === 'function')
    url = user_options.webmonkey.post_intent_redirect_to_url()

  if (typeof url === 'string')
    redirect_to_url(url)
}

var process_video_url = function(video_url, video_type, vtt_url, referer_url, drm_scheme, drm_server) {
  if (!referer_url)
    referer_url = unsafeWindow.location.href

  if (typeof GM_startIntent === 'function') {
    // running in Android-WebMonkey: open Intent chooser

    var args = [
      /* action = */ 'android.intent.action.VIEW',
      /* data   = */ video_url,
      /* type   = */ video_type
    ]

    // extras:
    if (vtt_url) {
      args.push('textUrl')
      args.push(vtt_url)
    }
    if (referer_url) {
      args.push('referUrl')
      args.push(referer_url)
    }
    if (drm_scheme && drm_server) {
      args.push('drmScheme')
      args.push(drm_scheme)

      args.push('drmUrl')
      args.push(drm_server)
    }

    GM_startIntent.apply(this, args)
    process_webmonkey_post_intent_redirect_to_url()
    return true
  }
  else if (user_options.greasemonkey.redirect_to_webcast_reloaded) {
    // running in standard web browser: redirect URL to top-level tool on Webcast Reloaded website

    redirect_to_url(get_webcast_reloaded_url(video_url, vtt_url, referer_url, drm_scheme, drm_server))
    return true
  }
  else {
    return false
  }
}

var process_hls_url = function(hls_url, vtt_url, referer_url, drm_scheme, drm_server) {
  process_video_url(/* video_url= */ hls_url, /* video_type= */ 'application/x-mpegurl', vtt_url, referer_url, drm_scheme, drm_server)
}

var process_dash_url = function(dash_url, vtt_url, referer_url, drm_scheme, drm_server) {
  process_video_url(/* video_url= */ dash_url, /* video_type= */ 'application/dash+xml', vtt_url, referer_url, drm_scheme, drm_server)
}

var process_mp4_url = function(mp4_url, vtt_url, referer_url, drm_scheme, drm_server) {
  process_video_url(/* video_url= */ mp4_url, /* video_type= */ 'video/mp4', vtt_url, referer_url, drm_scheme, drm_server)
}

var process_mp3_url = function(mp3_url, vtt_url, referer_url, drm_scheme, drm_server) {
  process_video_url(/* video_url= */ mp3_url, /* video_type= */ 'audio/mpeg', vtt_url, referer_url, drm_scheme, drm_server)
}

// ----------------------------------------------------------------------------- bootstrap

var init = function() {
  if (('function' === (typeof GM_getUrl)) && (GM_getUrl() !== unsafeWindow.location.href)) return

  var data = extract_data()
  if (!data || !data.episodes || !data.episodes.length) return

  if (data.episodes.length === 1) {
    process_mp3_url(data.episodes[0].audio_url)
  }
  else if (user_options.common.rewrite_page_dom) {
    user_options.webmonkey.post_intent_redirect_to_url = null
    reinitialize_dom(data)
  }
}

// ----------------------------------------------------------------------------- extract podcast episodes data

var extract_data = function() {
  var json, keys, key, val
  var title, description, episodes, episode, data

  try {
    json = document.querySelector('script#shoebox-media-api-cache-amp-podcasts[type="fastboot/shoebox"]')
    json = json.innerText
    json = JSON.parse(json)
    keys = Object.keys(json)

    for (var i=0; i < keys.length; i++) {
      key = keys[i]

      try {
        val = json[key]
        val = JSON.parse(val)

        for (var index_d=0; index_d < val.d.length; index_d++) {
          // page for entire series
          try {
            title       = val.d[index_d].attributes.name
            description = val.d[index_d].attributes.description.standard
            episodes    = val.d[index_d].relationships.episodes.data

            episodes = episodes.filter(filter_episode)
            if (!episodes.length) continue

            episodes = episodes.map(normalize_episode)

            data = {title: title, description: description, episodes: episodes}
            return data
          }
          catch(e3) {}

          // page for individual episode
          try {
            title       = null
            description = null
            episode     = val.d[index_d]

            if (filter_episode(episode)) {
              episodes = [
                normalize_episode(episode)
              ]

              data = {title: title, description: description, episodes: episodes}
              return data
            }
          }
          catch(e4) {}
        }
      }
      catch(e2) {}
    }
  }
  catch(e1) {}
}

var filter_episode = function(ep) {
  return ep && (ep instanceof Object) && (ep.attributes instanceof Object) && (ep.attributes.kind === 'full') && ep.attributes.assetUrl
}

var normalize_episode = function(ep) {
  return {
    audio_url:    ep.attributes.assetUrl,
    deeplink_url: ep.attributes.url,
    title:        ep.attributes.name || ep.attributes.itunesTitle,
    description:  ep.attributes.description.standard,
    duration:     ep.attributes.durationInMilliseconds,
    date:         ep.attributes.releaseDateTime
  }
}

// ----------------------------------------------------------------------------- DOM: static skeleton

var reinitialize_dom = function(data) {
  if (
    !data || !(data instanceof Object) ||
    !data.episodes || !Array.isArray(data.episodes) || !data.episodes.length
  ) return

  var div, ul, li

  div = make_element('div')
  ul  = make_element('ul')
  div.appendChild(ul)

  if (data.title) {
    div.insertBefore(
      make_element('h2', data.title),
      ul
    )
  }

  if (data.description) {
    div.insertBefore(
      make_element('div', data.description),
      ul
    )
  }

  for (var i=0; i < data.episodes.length; i++) {
    li = make_video_listitem_element(data.episodes[i])

    if (li)
      ul.appendChild(li)
  }

  if ((div.childNodes.length === 1) && !ul.childNodes.length) return

  unsafeWindow.document.body.innerHTML = ''
  unsafeWindow.document.body.appendChild(div)

  add_style_element(function(){
    return [
      // --------------------------------------------------- reset

      'body {',
      '  margin: 0;',
      '  padding: 0;',
      '  font-family: serif;',
      '  font-size: 16px;',
      '  background-color: #fff !important;',
      '  overflow: auto !important;',
      '}',

      // --------------------------------------------------- series title

      'body > div > h2 {',
      '  display: block;',
      '  margin: 0;',
      '  padding: 0.5em;',
      '  font-size: 22px;',
      '  text-align: center;',
      '  background-color: #ccc;',
      '}',

      // --------------------------------------------------- series description

      'body > div > div {',
      '  padding: 0.5em;',
      '  font-size: 18px;',
      '}',

      // --------------------------------------------------- list of videos: episodes in series, or individual movie or episode

      'body > div > ul {',
      '  list-style: none;',
      '  margin: 0;',
      '  padding: 0;',
      '  padding-left: 1em;',
      '  padding-bottom: 1em;',
      '}',

      'body > div > ul > li {',
      '  list-style: none;',
      '  margin-top: 0.5em;',
      '  border-top: 1px solid #999;',
      '  padding-top: 0.5em;',
      '}',

      'body > div > ul > li > table td:first-child {',
      '  font-style: italic;',
      '  padding-right: 1em;',
      '}',

      'body > div > ul > li > blockquote {',
      '  display: block;',
      '  background-color: #eee;',
      '  padding: 0.5em 1em;',
      '  margin: 0;',
      '}',

      'body > div > ul > li > input[type="button"] {',
      '  margin: 0.75em 0;',
      '  padding: 0.25em;',
      '  cursor: pointer;',
      '}',

      // --------------------------------------------------- links to tools on Webcast Reloaded website

      'body > div > ul > li div.icons-container {',
      '  display: block;',
      '  position: relative;',
      '  z-index: 1;',
      '  float: right;',
      '  margin: 0.5em;',
      '  width: 60px;',
      '  height: 60px;',
      '  max-height: 60px;',
      '  vertical-align: top;',
      '  background-color: #d7ecf5;',
      '  border: 1px solid #000;',
      '  border-radius: 14px;',
      '}',

      'body > div > ul > li div.icons-container > a.chromecast,',
      'body > div > ul > li div.icons-container > a.chromecast > img,',
      'body > div > ul > li div.icons-container > a.airplay,',
      'body > div > ul > li div.icons-container > a.airplay > img,',
      'body > div > ul > li div.icons-container > a.proxy,',
      'body > div > ul > li div.icons-container > a.proxy > img,',
      'body > div > ul > li div.icons-container > a.video-link,',
      'body > div > ul > li div.icons-container > a.video-link > img {',
      '  display: block;',
      '  width: 25px;',
      '  height: 25px;',
      '}',

      'body > div > ul > li div.icons-container > a.chromecast,',
      'body > div > ul > li div.icons-container > a.airplay,',
      'body > div > ul > li div.icons-container > a.proxy,',
      'body > div > ul > li div.icons-container > a.video-link {',
      '  position: absolute;',
      '  z-index: 1;',
      '  text-decoration: none;',
      '}',

      'body > div > ul > li div.icons-container > a.chromecast,',
      'body > div > ul > li div.icons-container > a.airplay {',
      '  top: 0;',
      '}',
      'body > div > ul > li div.icons-container > a.proxy,',
      'body > div > ul > li div.icons-container > a.video-link {',
      '  bottom: 0;',
      '}',

      'body > div > ul > li div.icons-container > a.chromecast,',
      'body > div > ul > li div.icons-container > a.proxy {',
      '  left: 0;',
      '}',
      'body > div > ul > li div.icons-container > a.airplay,',
      'body > div > ul > li div.icons-container > a.video-link {',
      '  right: 0;',
      '}',
      'body > div > ul > li div.icons-container > a.airplay + a.video-link {',
      '  right: 17px; /* (60 - 25)/2 to center when there is no proxy icon */',
      '}'
    ]
  })
}

// ----------------------------------------------------------------------------- DOM: dynamic elements - single video list item

var make_video_listitem_element = function(episode) {
  if (!episode.audio_url) return null

  var li, tr, html

  var append_tr = function(td, colspan) {
    if (Array.isArray(td))
      tr.push('<tr><td>' + td.join('</td><td>') + '</td></tr>')
    else if ((typeof colspan === 'number') && (colspan > 1))
      tr.push('<tr><td colspan="' + colspan + '">' + td + '</td></tr>')
    else
      tr.push('<tr><td>' + td + '</td></tr>')
  }

  tr = []
  if (episode.title)
    append_tr([strings.episode_labels.title, episode.title])
  if (episode.date)
    append_tr([strings.episode_labels.date_release, get_formatted_date_string(episode.date)])
  if (episode.duration)
    append_tr([strings.episode_labels.time_duration, get_ms_duration_time_string(episode.duration)])
  if (episode.description)
    append_tr(strings.episode_labels.summary, 2)

  html = [
    '<table>' + tr.join("\n") + '</table>',
    '<blockquote>' + episode.description + '</blockquote>'
  ]

  li = make_element('li', html.join("\n"))
  insert_webcast_reloaded_div(/* block_element= */ li, /* video_url= */ episode.audio_url)
  add_start_video_button(     /* block_element= */ li, /* old_button= */ null, /* video_url= */ episode.audio_url, /* video_type= */ 'audio/mpeg')

  return li
}

var get_formatted_date_string = function(date) {
  date = new Date(date)
  date = date.toLocaleDateString()
  return date
}

var get_ms_duration_time_string = function(ms) {
  var time_string = ''
  var mins = convert_ms_to_mins(ms)
  var hours

  if (mins >= 60) {
    hours       = Math.floor(mins / 60)
    time_string = hours + ' ' + ((hours < 2) ? strings.episode_units.duration_hour : strings.episode_units.duration_hours) + ', '
    mins        = mins % 60
  }

  return time_string + mins + ' ' + strings.episode_units.duration_minutes
}

var convert_ms_to_mins = function(X) {
  // (X ms)(1 sec / 1000 ms)(1 min / 60 sec)
  return Math.ceil(X / 60000)
}

// ----------------------------------------------------------------------------- DOM: dynamic elements - URL links to tools on Webcast Reloaded website

var insert_webcast_reloaded_div = function(block_element, video_url, vtt_url, referer_url, drm_scheme, drm_server) {
  var webcast_reloaded_div = make_webcast_reloaded_div(video_url, vtt_url, referer_url, drm_scheme, drm_server)

  if (block_element.childNodes.length)
    block_element.insertBefore(webcast_reloaded_div, block_element.childNodes[0])
  else
    block_element.appendChild(webcast_reloaded_div)
}

var make_webcast_reloaded_div = function(video_url, vtt_url, referer_url, drm_scheme, drm_server) {
  var webcast_reloaded_urls = {
//  "index":             get_webcast_reloaded_url(                  video_url, vtt_url, referer_url, drm_scheme, drm_server),
    "chromecast_sender": get_webcast_reloaded_url_chromecast_sender(video_url, vtt_url, referer_url, drm_scheme, drm_server),
    "airplay_sender":    get_webcast_reloaded_url_airplay_sender(   video_url, vtt_url, referer_url, drm_scheme, drm_server),
    "proxy":             get_webcast_reloaded_url_proxy(            video_url, vtt_url, referer_url, drm_scheme, drm_server)
  }

  var div = make_element('div')

  var html = [
    '<a target="_blank" class="chromecast" href="' + webcast_reloaded_urls.chromecast_sender   + '" title="Chromecast Sender"><img src="'         + constants.img_urls.base_webcast_reloaded_icons + 'chromecast.png"></a>',
    '<a target="_blank" class="airplay" href="'    + webcast_reloaded_urls.airplay_sender      + '" title="ExoAirPlayer Sender"><img src="'       + constants.img_urls.base_webcast_reloaded_icons + 'airplay.png"></a>',
//  '<a target="_blank" class="proxy" href="'      + webcast_reloaded_urls.proxy               + '" title="HLS-Proxy Configuration"><img src="'   + constants.img_urls.base_webcast_reloaded_icons + 'proxy.png"></a>',
    '<a target="_blank" class="video-link" href="' + video_url                                 + '" title="direct link to audio file"><img src="' + constants.img_urls.base_webcast_reloaded_icons + 'video_link.png"></a>'
  ]

  div.setAttribute('class', constants.dom_classes.div_webcast_icons)
  div.innerHTML = html.join("\n")

  return div
}

// ----------------------------------------------------------------------------- DOM: dynamic elements - play video button

var add_start_video_button = function(block_element, old_button, video_url, video_type, vtt_url, referer_url, drm_scheme, drm_server) {
  var new_button = make_start_video_button(video_url, video_type, vtt_url, referer_url, drm_scheme, drm_server)

  if (old_button)
    old_button.parentNode.replaceChild(new_button, old_button)
  else
    block_element.appendChild(new_button)
}

var make_start_video_button = function(video_url, video_type, vtt_url, referer_url, drm_scheme, drm_server) {
  var button = make_element('input')

  button.setAttribute('type',  'button')
  button.setAttribute('value', strings.button_start_video)

  button.setAttribute('x-video-url',   video_url   || '')
  button.setAttribute('x-video-type',  video_type  || '')
  button.setAttribute('x-vtt-url',     vtt_url     || '')
  button.setAttribute('x-referer-url', referer_url || '')
  button.setAttribute('x-drm-scheme',  drm_scheme  || '')
  button.setAttribute('x-drm-server',  drm_server  || '')

  button.addEventListener("click", onclick_start_video_button)

  return button
}

var onclick_start_video_button = function(event) {
  event.stopPropagation();event.stopImmediatePropagation();event.preventDefault();event.returnValue=true;

  var button      = event.target
  var video_url   = button.getAttribute('x-video-url')
  var video_type  = button.getAttribute('x-video-type')
  var vtt_url     = button.getAttribute('x-vtt-url')
  var referer_url = button.getAttribute('x-referer-url')
  var drm_scheme  = button.getAttribute('x-drm-scheme')
  var drm_server  = button.getAttribute('x-drm-server')

  if (video_url)
    process_video_url(video_url, video_type, vtt_url, referer_url, drm_scheme, drm_server)
}

// -----------------------------------------------------------------------------

init()
