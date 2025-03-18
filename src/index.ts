import { readFile } from 'node:fs/promises'
import { SerialPort } from 'serialport'
import { parse } from 'valibot'
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
import { logger } from './logger'
import { ConfigSchema } from './scheme'
import { getOhmData, paginate, transformOhmData } from './utils'

let page = INITIAL_PAGE
let maxPages = 0

const main = async () => {
  const deviceList = await SerialPort.list()
  const device = deviceList.find((device) =>
    VENDOR_ID.includes(String(device.vendorId)),
  )

  if (!device) {
    logger.error('Устройство не найдено')
    throw new Error('Нужно сначала подключить устройство')
  }

  logger.debug('Устройство найдено', device)

  const template = await readFile(TEMPLATES_FILE, 'utf-8')
  const config = parse(
    ConfigSchema,
    JSON.parse(await readFile(CONFIG_FILE, 'utf-8')),
  )

  const port = new SerialPort({
    path: device.path,
    baudRate: 9600,
  })

  setInterval(async () => {
    const data = await getOhmData(config)
    const transformed = transformOhmData(
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
