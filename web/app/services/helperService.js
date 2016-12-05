'use strict'

app.service('helperService', function () {
  // taken from http://stackoverflow.com/a/149099/390946
  this.formatCurrency = function (n, c, d, t) {
    c = isNaN(c = Math.abs(c)) ? 2 : c
    d = d === undefined ? '.' : d
    t = t === undefined ? ',' : t
    var s = n < 0 ? '-' : ''
    var i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c)))
    var j = (j = i.length) > 3 ? j % 3 : 0

    return s + (j ? i.substr(0, j) + t : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, '$1' + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : '')
  }
  this.formatCurrencyBRL = function (number) {
    return 'R$' + this.formatCurrency(number, 2, ',', '.')
  }
  this.formatDate = function (date, format) {
    return moment(date).format(format)
  }
})
