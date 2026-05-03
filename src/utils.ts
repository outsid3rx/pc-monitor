interface HwinfoSensor {
  Text: string
  Value: string
  Children: HwinfoSensor[]
  HardwareId?: string
}

type HwinfoData = HwinfoSensor

const parseValue = (value: string): number | undefined => {
  if (!value) return undefined
  const num = Number.parseFloat(
    value.replace(',', '.').replace(/[^0-9.-]/g, ''),
  )
  return Number.isNaN(num) ? undefined : num
}

const findSensor = (
  sensors: HwinfoSensor[],
  path: string[],
): HwinfoSensor | undefined => {
  if (path.length === 0) return undefined
  const [first, ...rest] = path
  const found = sensors.find((s) => s.Text === first)
  if (!found) return undefined
  if (rest.length === 0) return found
  return findSensor(found.Children, rest)
}

const findByHardwareId = (
  sensors: HwinfoSensor[],
  prefix: string,
): HwinfoSensor | undefined => {
  for (const sensor of sensors) {
    if (sensor.HardwareId?.startsWith(prefix)) {
      return sensor
    }
    const found = findByHardwareId(sensor.Children, prefix)
    if (found) return found
  }
}

const findHardware = (
  sensors: HwinfoSensor[],
  name: string,
): HwinfoSensor | undefined => {
  for (const sensor of sensors) {
    if (sensor.Text === name && sensor.Children.length > 0) {
      return sensor
    }
    const found = findHardware(sensor.Children, name)
    if (found) return found
  }
}

const findCpu = (sensors: HwinfoSensor[]): HwinfoSensor | undefined => {
  const cpuById = findByHardwareId(sensors, '/cpu')
  if (cpuById) return cpuById

  for (const sensor of sensors) {
    if (sensor.Children) {
      const hasClocks = sensor.Children.some((c) => c.Text === 'Clocks')
      const hasTemps = sensor.Children.some((c) => c.Text === 'Temperatures')
      const hasLoad = sensor.Children.some((c) => c.Text === 'Load')
      if (hasClocks && hasTemps && hasLoad) {
        return sensor
      }
    }
  }
}

const findFirstGpu = (sensors: HwinfoSensor[]): HwinfoSensor | undefined => {
  for (const sensor of sensors) {
    if (
      sensor.HardwareId &&
      (sensor.HardwareId.startsWith('/gpu-nvidia') ||
        sensor.HardwareId.startsWith('/gpu-amd'))
    ) {
      return sensor
    }
    const found = findFirstGpu(sensor.Children)
    if (found) return found
  }
}

export const getData = async (url: string): Promise<HwinfoData> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`)
  }
  return response.json()
}

export interface TransformInput {
  cpu: {
    speed: number
    temperature: number
    load: number
  }
  gpu: {
    clock: number
    temperature: number
    load: number
  }
  mem: {
    active: number
    total: number
  }
}

export const transform = (
  data: HwinfoData,
  templates: string[],
  gpuModel?: string,
): string[] => {
  const [computer] = data.Children
  if (!computer?.Children) {
    return templates.map(() => '')
  }

  const cpu = findCpu(computer.Children)
  const cpuClock =
    cpu && findSensor(cpu.Children, ['Clocks', 'Cores (Average)'])
  const cpuTemp =
    cpu && findSensor(cpu.Children, ['Temperatures', 'Core (Tctl/Tdie)'])
  const cpuLoad = cpu && findSensor(cpu.Children, ['Load', 'CPU Total'])

  let gpu: HwinfoSensor | undefined
  if (gpuModel) {
    gpu = findHardware(computer.Children, gpuModel)
  }
  if (!gpu) {
    gpu = findFirstGpu(computer.Children)
  }

  const gpuClock = gpu && findSensor(gpu.Children, ['Clocks', 'GPU Core'])
  const gpuTemp = gpu && findSensor(gpu.Children, ['Temperatures', 'GPU Core'])
  const gpuLoad = gpu && findSensor(gpu.Children, ['Load', 'GPU Core'])

  const totalMemory = findHardware(computer.Children, 'Total Memory')
  const ramLoad =
    totalMemory && findSensor(totalMemory.Children, ['Load', 'Memory'])

  const transformData: TransformInput = {
    cpu: {
      speed: parseValue(cpuClock?.Value || '') || 0,
      temperature: parseValue(cpuTemp?.Value || '') || 0,
      load: parseValue(cpuLoad?.Value || '') || 0,
    },
    gpu: {
      clock: parseValue(gpuClock?.Value || '') || 0,
      temperature: parseValue(gpuTemp?.Value || '') || 0,
      load: parseValue(gpuLoad?.Value || '') || 0,
    },
    mem: {
      active: parseValue(ramLoad?.Value || '') || 0,
      total: 100,
    },
  }

  return templates.map((template) => {
    let result = template

    result = result.replaceAll(
      '%C-Ghz%',
      (transformData.cpu.speed / 1000).toFixed(1),
    )
    result = result.replaceAll(
      '%C-Temp%',
      Math.round(transformData.cpu.temperature).toString(),
    )
    result = result.replaceAll(
      '%C-Load%',
      Math.round(transformData.cpu.load).toString(),
    )
    result = result.replaceAll(
      '%G-Ghz%',
      (transformData.gpu.clock / 1000).toFixed(1),
    )
    result = result.replaceAll(
      '%G-Temp%',
      Math.round(transformData.gpu.temperature).toString(),
    )
    result = result.replaceAll(
      '%G-Load%',
      Math.round(transformData.gpu.load).toString(),
    )
    result = result.replaceAll(
      '%R-Used%',
      Math.round(transformData.mem.active).toString(),
    )

    if (result.length < 16) {
      result = result.padEnd(16, ' ')
    }

    return result
  })
}

export const paginate = (array: string[], page: number, pageSize: number) => {
  return array.slice((page - 1) * pageSize, page * pageSize)
}
