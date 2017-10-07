
process.on('uncaughtException', (err) => { console.log(err) })

try {
  require('./lib/scrapper').process()
} catch (err) {
  console.log('Error: ', err)
}
