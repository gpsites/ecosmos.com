
window.gutils = {
  xml2js,
  slug,
  ding
}

// adapted from https://gist.github.com/erikvullings/5c5638842eaa4fa88c0f4a987ea45da2
// (I basically made it plain JS, suitable for loading in an SPA.)
function xml2js(xmlStr, excludeKeys = new Set(), jsonifyKeys = false) {
  let xml = new DOMParser().parseFromString(xmlStr, 'text/xml')
  const X = {
    toObj: function (xml) {
      let o = {}
      if (xml.nodeType == 1) {
        if (xml.attributes.length) {
          for (let i = 0; i < xml.attributes.length; i++) {
            o['@' + xml.attributes[i].nodeName] = (xml.attributes[i].nodeValue || '').toString()
          }
        }
        if (xml.firstChild) {
          let textChild = 0, cdataChild = 0, hasElementChild = false
          for (let n = xml.firstChild; n; n = n.nextSibling) {
            if (n.nodeType == 1) hasElementChild = true
            else if (n.nodeType == 3 && n.nodeValue.match(/[^ \f\n\r\t\v]/)) textChild++
            else if (n.nodeType == 4) cdataChild++
          }
          if (hasElementChild) {
            if (textChild < 2 && cdataChild < 2) {
              X.removeWhite(xml)
              for (let n = xml.firstChild; n; n = n.nextSibling) {
                if (n.nodeType == 3) o['#text'] = X.escape(n.nodeValue)
                else if (n.nodeType == 4) o['#cdata'] = X.escape(n.nodeValue)
                else if (o[n.nodeName]) {
                  if (o[n.nodeName] instanceof Array) o[n.nodeName][o[n.nodeName].length] = X.toObj(n)
                  else o[n.nodeName] = [o[n.nodeName], X.toObj(n)]
                } else o[n.nodeName] = X.toObj(n)
              }
            } else {
              if (!xml.attributes.length) o = X.escape(X.innerXml(xml))
              else o['#text'] = X.escape(X.innerXml(xml))
            }
          } else if (textChild) {
            if (!xml.attributes.length) o = X.escape(X.innerXml(xml))
            else o['#text'] = X.escape(X.innerXml(xml))
          } else if (cdataChild) {
            if (cdataChild > 1) o = X.escape(X.innerXml(xml))
            else for (let n = xml.firstChild; n; n = n.nextSibling) o['#cdata'] = X.escape(n.nodeValue)
          }
        }
        if (!xml.attributes.length && !xml.firstChild) o = null
      } else if (xml.nodeType == 9) {
        o = X.toObj(xml.documentElement)
      } else alert('unhandled node type: ' + xml.nodeType)
      return o
    },
    toJson: function (o, name, ind) {
      let json = name ? '"' + name + '"' : ''
      if (o instanceof Array) {
        for (let i = 0, n = o.length; i < n; i++) o[i] = X.toJson(o[i], '', ind + '\t')
        json += (name ? ':[' : '[') + (o.length > 1 ? '\n' + ind + '\t' + o.join(',\n' + ind + '\t') + '\n' + ind : o.join('')) + ']'
      } else if (o == null) json += (name && ':') + 'null'
      else if (typeof o == 'object') {
        let arr = []
        for (let m in o) arr[arr.length] = X.toJson(o[m], m, ind + '\t')
        json += (name ? ':{' : '{') + (arr.length > 1 ? '\n' + ind + '\t' + arr.join(',\n' + ind + '\t') + '\n' + ind : arr.join('')) + '}'
      } else if (typeof o == 'string') json += (name && ':') + '"' + o.toString() + '"'
      else json += (name && ':') + o.toString()
      return json
    },
    innerXml: function (node) {
      let s = ''
      if ('innerHTML' in node) s = node.innerHTML
      else {
        const asXml = function (n) {
          let s = ''
          if (n.nodeType == 1) {
            s += '<' + n.nodeName
            for (let i = 0; i < n.attributes.length; i++)
              s += ' ' + n.attributes[i].nodeName + '="' + (n.attributes[i].nodeValue || '').toString() + '"'
            if (n.firstChild) {
              s += '>'
              for (let c = n.firstChild; c; c = c.nextSibling) s += asXml(c)
              s += '</' + n.nodeName + '>'
            } else s += '/>'
          } else if (n.nodeType == 3) s += n.nodeValue
          else if (n.nodeType == 4) s += '<![CDATA[' + n.nodeValue + ']]>'
          return s
        }
        for (let c = node.firstChild; c; c = c.nextSibling) s += asXml(c)
      }
      return s
    },
    escape: function (txt) {
      return txt.replace(/[\\]/g, '\\\\').replace(/[\"]/g, '\\"').replace(/[\n]/g, '\\n').replace(/[\r]/g, '\\r')
    },
    removeWhite: function (e) {
      e.normalize()
      for (let n = e.firstChild; n;) {
        if (n.nodeType == 3) {
          if (!n.nodeValue.match(/[^ \f\n\r\t\v]/)) {
            let nxt = n.nextSibling
            e.removeChild(n)
            n = nxt
          } else n = n.nextSibling
        } else if (n.nodeType == 1) {
          X.removeWhite(n)
          n = n.nextSibling
        } else n = n.nextSibling
      }
      return e
    }
  }
  if (xml.nodeType == 9) xml = xml.documentElement
  const jsonStr = `{${X.toJson(X.toObj(X.removeWhite(xml)), xml.nodeName, '\t')}}`
  const toNumber = (key, value) => !excludeKeys.has(key) && typeof value === 'string' && !isNaN(+value) ? +value : value

  const multipleUpperCaseLettersRegex = /([A-Z]+)([A-Z])/
  const reviver = jsonifyKeys
    ? function (_key, value) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const newValue = {}
        for (const key in value) {
          const newKey = multipleUpperCaseLettersRegex.test(key)
            ? key.replace(multipleUpperCaseLettersRegex, (_full, a, b) => `${a.toLowerCase()}${b}`)
            : key.charAt(0).toLowerCase() + key.slice(1)
          newValue[newKey] = toNumber(key, value[key])
        }
        return newValue
      }
      return value
    }
    : toNumber
  return JSON.parse(jsonStr, reviver)
}

function slug(...texts) {
  function clean(str) {
    return str
    .toLowerCase()
    .replace(/\s+/g, '-')     // replace spaces with -
    .replace(/[^\w-]+/g, '')  // remove non-word chars
    .replace(/--+/g, '-')     // replace multiple - with single -
    .replace(/^-+/, '')       // trim - from start of text
    .replace(/-+$/, '')       // trim - from end of text
  }

  return texts.map(clean).join('-')
}

function ding () {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // 440 Hz is the A4 note
  gainNode.gain.setValueAtTime(1, audioContext.currentTime);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.5); // Play sound for 0.5 seconds

  // Fade out
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
}
