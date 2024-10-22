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

const main = async () => {
  const deviceList = await SerialPort.list()
  const device = deviceList.find((device) => VENDOR_ID.includes(String(device.vendorId)))

  if (!device) {
    throw new Error('Нужно сначала подключить устройство')
  }

  const template = await readFile(TEMPLATES_FILE, 'utf-8')
  const config = existsSync(CONFIG_FILE)
    ? JSON.parse(await readFile(CONFIG_FILE, 'utf-8'))
    : {}

  const port = new SerialPort({
    path: device.path,
    baudRate: 9600,
  })

  setInterval(async () => {
    const data = await getData()
    const transformed = transform(
      data,
      template.split(TEMPLATE_DELIMITER),
      config.gpuModel,
    )

    maxPages = Math.ceil(transformed.length / LINES)

    port.write(paginate(transformed, page, LINES).join(DELIMITER))
  }, TIMEOUT)

  setInterval(() => {
    page = page + 1 > maxPages ? INITIAL_PAGE : page + 1
  }, TIMEOUT * 2)
}

void main()
