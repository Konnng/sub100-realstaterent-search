const Q = require('q')
const sleep = require('system-sleep')
const co = require('co')
const coRequest = require('co-request').defaults({jar: true})
const cheerio = require('cheerio')
const iconv = require('iconv-lite')
const db = require('./db')
const fs = require('fs-extra')
const path = require('path')
const dedupe = require('dedupe')
const commandLineArgs = require('command-line-args')
const moment = require('moment')

const options = commandLineArgs([
  { name: 'test', type: Boolean, defaultValue: false }
])
const resultFile = path.resolve(__dirname, '../data/result.json')

const Scrapper = {
  vars: {
    realStateTypes: db.getSetting('property_types'),
    realStateCityId: db.getSetting('city_id'), // city of Maringá
    realStateUrlSearch: db.getSetting('search_url'),
    realStateList: db.get('real_state_list').value()
  },
  init () {},
  process () {
    if (options.test) {
      if (fs.existsSync(resultFile)) {
        let result = JSON.parse(fs.readFileSync(resultFile, 'utf-8')) || []
        if (result.length > 0) {
          return Scrapper.saveResults(result)
        } else {
          _log('No valid results to test, will need to scrap...')
        }
      } else {
        _log('No result file to test, will need to scrap...')
      }
    }

    co(function* () {
      let generalResult = []
      let deferred = Q.defer()
      for (let i = 0; i < Scrapper.vars.realStateTypes.length; i++) {
        let response
        let pages = []
        let type = Scrapper.vars.realStateTypes[i]
        let baseUrl = `${Scrapper.vars.realStateUrlSearch}/${type}/${Scrapper.vars.realStateCityId}/ordem-imoveis.valor`

        _log('-'.repeat(100))
        _log('Processing Type =>', type)
        try {
          response = yield Scrapper.makeRequest(baseUrl + '/pag-0')
        } catch (err) {
          console.error('-'.repeat(100))
          console.error('ERROR: ', err.message)
          console.error(err.stack)
          console.error('-'.repeat(100))
          process.exit(1)
        }

        let body = response.body
        let processedBody = iconv.decode(Buffer.concat(new Array(body)), 'latin1').toString()
        let $ = cheerio.load(processedBody)

        let pageTotal = $('.resultados_paginacao_descricao').text().match(/P.gina 1 de (\d*)/)[1] || false
        if (!pageTotal) {
          throw new Error('No results')
        }

        _log('Total pages =>', pageTotal)
        for (let i = 1; i < pageTotal; i++) {
          pages.push(i)
        }

        _log('Processing page => 1')
        let result = Scrapper.processResponse(body)
        generalResult = generalResult.concat(result || [])
        _log('done processing page => 1 - results found =>', result.length, ' - total =>', generalResult.length)

        for (let i = 0; i < pages.length; i++) {
          let page = pages[i]

          _log('Processing page =>', page + 1)
          try {
            response = yield Scrapper.makeRequest(baseUrl + `/pag-${page}`)
          } catch (err) {
            console.error('-'.repeat(100))
            console.error('ERROR: ', err.message)
            console.error(err.stack)
            console.error('-'.repeat(100))
            process.exit(1)
          }
          result = Scrapper.processResponse(response.body)
          generalResult = generalResult.concat(result || [])

          _log('done processing page =>', page + 1, ' - results found =>', result.length, ' - total =>', generalResult.length)
          sleep(100)
        }
        _log('Done processing Type => ', type)

        sleep(150)
      }

      deferred.resolve(generalResult)

      return deferred.promise
    }).then(result => Scrapper.saveResults(result))
  },
  *makeRequest (url, callback) {
    return coRequest({
      followRedirect: true,
      followAllRedirects: true,
      maxRedirects: 3,
      uri: url,
      encoding: null,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2934.0 Safari/537.36'
      }
    })
  },
  processResponse (body) {
    let processedBody = iconv.decode(Buffer.concat(new Array(body)), 'latin1').toString()

    let $ = cheerio.load(processedBody)

    let result = $('.resultados_imoveis') || []
    if (!result.length) {
      _log('-'.repeat(100))
      console.error('No results found')
      _log('Page output', $('.estrutura_conteudo').html())
      _log('-'.repeat(100))
      result = []
    }

    return result && result.length ? result.filter(function (i) {
      let item = $(this)
      let realStateId = item.find('.resultados_imoveis_listadescricao.resultados_imoveis_border .link_cinza11').attr('href').match(/imobiliaria\/(\d+)/i)[1] || 0

      realStateId = Number(realStateId)
      if (!realStateId || isNaN(realStateId)) {
        return false
      }

      return Scrapper.vars.realStateList.filter(item => item.id === realStateId).length > 0
    }).get().map((element) => Scrapper.processResultItem(element)) : []
  },
  processResultItem (item) {
    let result = {}

    try {
      let $ = cheerio.load(item)

      let location = $('.resultados_imoveis_listatitulo .texto_laranja12').text() || ''
      let street = $('.resultados_imoveis_listatitulo').contents()[6] || ''
      let type = $('.resultados_imoveis_listadescricao').eq(0).find('.texto_cinza12').eq(0).text() || ''
      let price = $('.resultados_imoveis_listadescricao').eq(0).find('.texto_cinza18').text() || ''
      let dealer = $('.resultados_imoveis_listadescricao.resultados_imoveis_border').find('.texto_cinza12').text() || ''
      let url = $('.resultados_imoveis_listadescricao.resultados_imoveis_border').find('.link_botao').attr('href') || ''
      let picture = $('.resultados_imoveis_colunafoto .resultados_imoveis_listafoto img').attr('src') || ''
      let id = Number(/\/imoveis\/(\d+)\//.test(url) ? url.match(/\/imoveis\/(\d+)\//)[1] : 0)

      let roomsBlock = $('.resultados_imoveis_listadescricao').eq(0).text() || ''
      let rooms = 0
      let suites = 0

      street = street ? street.data.toString().trim() : ''
      try {
        suites = Number(/(\d+) su.te/.test(roomsBlock) ? roomsBlock.match(/(\d+) su.te/)[1] : 0)
        rooms = Number(/(\d+) quarto/.test(roomsBlock) ? roomsBlock.match(/(\d+) quarto/)[1] : 0)
      } catch (err) {
        console.error('-'.repeat(100))
        console.error('ERROR: ', err.message)
        console.error(err.stack)
        console.error('-'.repeat(100))
        _log(roomsBlock)
        process.exit(1)
      }

      result = {
        id,
        type,
        picture,
        location,
        street,
        price,
        suites,
        rooms,
        rooms_total: suites + rooms,
        dealer,
        url
      }
    } catch (err) {
      result = false
      console.error(err)
    }

    $ = undefined

    return result
  },
  processResult (result) {
    _log('-'.repeat(100))
    _log('Processing total of ', result.length, ' results...')

    fs.writeFileSync(resultFile, JSON.stringify(result), 'utf-8')

    try {
      // remove duplicated results, using the package "dedupe", then filter items with price and rooms
      result = (dedupe(result) || [])
        .filter(item => (item.price || false) && !/consulte/i.test(item.price) && item.rooms > 0)
        .map(item => {
          let realState = Scrapper.findRealStateByName(item.dealer)

          item.price = Number(item.price.replace(/R\$ /, '').replace('.', '').replace(',', '.')) || 0
          item.dealer = realState ? realState.id : 0

          return item
        })

      result.sort((a, b) => a.price > b.price ? 1 : (a.price === b.price ? 0 : -1))

      _log('Filtering complete. Processing ', result.length, ' results...')
    } catch (err) {
      result = []
      console.error(err)
    }

    return result
  },
  saveResults (result) {
    result = Scrapper.processResult(result)

    db.set('properties', result || []).value()
    db.setSetting('updated_at', Date.now())

    sleep(300)

    try {
      let webDbFile = path.join(__dirname, '../web/app/data/db.json')
      if (!fs.existsSync(path.dirname(webDbFile)) && fs.mkdirsSync(path.dirname(webDbFile))) {
        throw new Error('Error crating destination directory for web database.')
      }

      let webDb = Object.assign({}, {
        properties: db.get('properties').value(),
        real_state_list: db.get('real_state_list').value(),
        updated_at: db.getSetting('updated_at')
      })

      fs.writeFileSync(webDbFile, JSON.stringify(webDb))
    } catch (err) {
      console.error('-'.repeat(100))
      console.error('ERROR: ', err.message)
      console.error(err.stack)
      console.error('-'.repeat(100))
      process.exit(1)
    }

    _log('Processing complete.')
  },
  findRealStateByName (name) {
    let list = db.get('real_state_list').value()

    return (list.filter(item => item.name === name) || []).shift() || false
  }
}

function _log () {
  console.log.apply(console, [].concat([`[${moment().format('DD/MM/YYYY HH:mm:ss')}] =>`], Array.from(arguments) || []))
}

module.exports = Scrapper
