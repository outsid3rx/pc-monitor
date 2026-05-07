import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { SerialPort } from 'serialport'
import {
  CONFIG_FILE,
  DELIMITER,
  INITIAL_PAGE,
  LINES,
  TEMPLATE_DELIMITER,
  TEMPLATES_FILE,
  TIMEOUT,
  VENDOR_ID,
} from './constants'
import { getData, paginate, transform } from './utils'

let page = INITIAL_PAGE
let maxPages = 0
let tick = 0

const main = async () => {
  const deviceList = await SerialPort.list()
  const device = deviceList.find((device) =>
    VENDOR_ID.includes(String(device.vendorId)),
  )

  if (!device) {
    throw new Error('Нужно сначала подключить устройство')
  }

  const template = await readFile(TEMPLATES_FILE, 'utf-8')
  const config = existsSync(CONFIG_FILE)
    ? JSON.parse(await readFile(CONFIG_FILE, 'utf-8'))
    : {}

  const templateLines = template.split(TEMPLATE_DELIMITER)
  maxPages = Math.ceil(templateLines.length / LINES)

  const port = new SerialPort({
    path: device.path,
    baudRate: 9600,
  })

  port.on('open', () => {
    setInterval(async () => {
      const data = await getData(config.hwinfoUrl)
      const transformed = transform(data, templateLines, config.gpuModel)

      const resultLines = paginate(transformed, page, LINES)
      const result = resultLines.join(DELIMITER)

      port.write(result)

      if (++tick % 2 === 0) {
        page = page >= maxPages ? INITIAL_PAGE : page + 1
      }
    }, TIMEOUT)
  })
}

void main()
