import { CHARS_WIDTH, TEMPLATE_TOKENS } from './constants'

interface HwinfoSensor {
  Text: string
  Value: string
  Children: HwinfoSensor[]
  HardwareId?: string
}

type HwinfoData = HwinfoSensor

const SENSOR_PATHS = {
  cpu: {
    clock: ['Clocks', 'Cores (Average)'],
    temperature: ['Temperatures', 'Core (Tctl/Tdie)'],
    load: ['Load', 'CPU Total'],
  },
  gpu: {
    clock: ['Clocks', 'GPU Core'],
    temperature: ['Temperatures', 'GPU Core'],
    load: ['Load', 'GPU Core'],
  },
  ram: {
    load: ['Load', 'Memory'],
  },
} as const

const parseValue = (value: string): number => {
  if (!value) return 0
  const num = Number.parseFloat(
    value.replace(',', '.').replace(/[^0-9.-]/g, ''),
  )
  return Number.isNaN(num) ? 0 : num
}

const find = (
  sensors: HwinfoSensor[] | undefined,
  predicate: (s: HwinfoSensor) => boolean,
): HwinfoSensor | undefined => {
  if (!sensors) return
  for (const sensor of sensors) {
    if (predicate(sensor)) return sensor
    const found = find(sensor.Children, predicate)
    if (found) return found
  }
}

const findByHardwareId = (sensors: HwinfoSensor[], prefix: string) =>
  find(sensors, (s) => s.HardwareId?.startsWith(prefix) ?? false)

const findByName = (sensors: HwinfoSensor[], name: string) =>
  find(sensors, (s) => s.Text === name && s.Children.length > 0)

const findSensor = (
  sensors: HwinfoSensor[] | undefined,
  path: readonly string[],
): HwinfoSensor | undefined => {
  if (!sensors || path.length === 0) return undefined
  const [first, ...rest] = path
  const sensor = sensors.find((s) => s.Text === first)
  if (!sensor) return undefined
  if (rest.length === 0) return sensor
  return findSensor(sensor.Children, rest)
}

const findCpu = (sensors: HwinfoSensor[]): HwinfoSensor | undefined => {
  const byId = findByHardwareId(sensors, '/cpu')
  if (byId) return byId

  return find(sensors, (s) => {
    const children = s.Children || []
    const has = (name: string) => children.some((c) => c.Text === name)
    return has('Clocks') && has('Temperatures') && has('Load')
  })
}

const findGpu = (
  sensors: HwinfoSensor[],
  preferredName?: string,
): HwinfoSensor | undefined => {
  if (preferredName) {
    const byName = findByName(sensors, preferredName)
    if (byName) return byName
  }
  return find(sensors, (s) => {
    const id = s.HardwareId
    return id === '/gpu-nvidia/0' || id === '/gpu-amd/0'
  })
}

export const getData = async (url: string): Promise<HwinfoData> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`)
  }
  return response.json()
}

interface SensorValues {
  cpu: { speed: number; temperature: number; load: number }
  gpu: { clock: number; temperature: number; load: number }
  ram: { load: number }
}

const extractValues = (data: HwinfoData, gpuModel?: string): SensorValues => {
  const computer = data.Children?.[0]
  const devices = computer?.Children || []

  const cpu = findCpu(devices)
  const gpu = findGpu(devices, gpuModel)
  const ram = findByName(devices, 'Total Memory')

  return {
    cpu: {
      speed: parseValue(
        findSensor(cpu?.Children, SENSOR_PATHS.cpu.clock)?.Value || '',
      ),
      temperature: parseValue(
        findSensor(cpu?.Children, SENSOR_PATHS.cpu.temperature)?.Value || '',
      ),
      load: parseValue(
        findSensor(cpu?.Children, SENSOR_PATHS.cpu.load)?.Value || '',
      ),
    },
    gpu: {
      clock: parseValue(
        findSensor(gpu?.Children, SENSOR_PATHS.gpu.clock)?.Value || '',
      ),
      temperature: parseValue(
        findSensor(gpu?.Children, SENSOR_PATHS.gpu.temperature)?.Value || '',
      ),
      load: parseValue(
        findSensor(gpu?.Children, SENSOR_PATHS.gpu.load)?.Value || '',
      ),
    },
    ram: {
      load: parseValue(
        findSensor(ram?.Children, SENSOR_PATHS.ram.load)?.Value || '',
      ),
    },
  }
}

const applyToken = (template: string, values: SensorValues): string => {
  const replacements: Record<string, string> = {
    [TEMPLATE_TOKENS.CPU_Ghz]: (values.cpu.speed / 1000).toFixed(1),
    [TEMPLATE_TOKENS.CPU_Temp]: Math.round(values.cpu.temperature).toString(),
    [TEMPLATE_TOKENS.CPU_Load]: Math.round(values.cpu.load).toString(),
    [TEMPLATE_TOKENS.GPU_Ghz]: (values.gpu.clock / 1000).toFixed(1),
    [TEMPLATE_TOKENS.GPU_Temp]: Math.round(values.gpu.temperature).toString(),
    [TEMPLATE_TOKENS.GPU_Load]: Math.round(values.gpu.load).toString(),
    [TEMPLATE_TOKENS.RAM_Used]: Math.round(values.ram.load).toString(),
  }

  let result = template
  for (const [token, value] of Object.entries(replacements)) {
    result = result.replaceAll(token, value)
  }

  return result.length < CHARS_WIDTH ? result.padEnd(CHARS_WIDTH, ' ') : result
}

export const transform = (
  data: HwinfoData,
  templates: string[],
  gpuModel?: string,
): string[] => {
  const values = extractValues(data, gpuModel)
  return templates.map((template) => applyToken(template, values))
}

export const paginate = (array: string[], page: number, pageSize: number) => {
  return array.slice((page - 1) * pageSize, page * pageSize)
}
