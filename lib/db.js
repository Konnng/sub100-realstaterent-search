const fs = require('fs-extra')
const lowdb = require('lowdb')
const path = require('path')

function db () {
  let dbFile = path.join(__dirname, '../data/db.json')

  let db = lowdb(dbFile)
  let defaultDB = {
    properties: [],
    real_state_list: JSON.parse(fs.readFileSync(path.join(__dirname, '../data/real_state.json'))),
    settings: {
      search_url: 'http://www.sub100.com.br/imoveis/locacao',
      city_id: 10,
      property_types: [ 'apartamentos', 'casas', 'residenciais' ]
    }
  }

  db.defaults(defaultDB).value()

  db.getSetting = (key, defaultValue) => {
    defaultValue = defaultValue || false

    return db.get(`settings.${key}`) ? db.get(`settings.${key}`).value() : defaultValue
  }
  db.setSetting = (key, value) => {
    return db.set(`settings.${key}`, value).value()
  }

  return db
}

module.exports = db()
