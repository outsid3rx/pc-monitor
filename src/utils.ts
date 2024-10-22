import si from 'systeminformation'
import { CHARS_WIDTH, TEMPLATE_TOKENS } from './constants'

export const getData = () =>
  si.get({
    cpu: 'speed',
    cpuTemperature: 'max',
    graphics: 'controllers',
    currentLoad: 'currentLoad',
    mem: 'total, active',
  })

export const transform = (
  data: Awaited<ReturnType<typeof getData>>,
  templates: string[],
  gpuModel?: string,
) => {
  const gpu = gpuModel
    ? data.graphics.controllers.find((controller) =>
        controller.model.includes(gpuModel),
      )
    : data.graphics.controllers[0]

  const replaceValues = {
    [TEMPLATE_TOKENS.CPU_Ghz]: data.cpu.speed.toFixed(1),
    [TEMPLATE_TOKENS.CPU_Temp]: Math.round(data.cpuTemperature.max),
    [TEMPLATE_TOKENS.CPU_Load]: Math.round(data.currentLoad.currentLoad),
    [TEMPLATE_TOKENS.GPU_Ghz]: ((gpu?.clockCore || 0) / 1000)?.toFixed(1),
    [TEMPLATE_TOKENS.GPU_Temp]:
      gpu?.temperatureGpu || gpu?.temperatureMemory
        ? Math.round(
            Math.max(gpu.temperatureGpu || 0, gpu.temperatureMemory || 0),
          )
        : undefined,
    [TEMPLATE_TOKENS.GPU_Load]: Math.round(gpu?.utilizationGpu || 0),
    [TEMPLATE_TOKENS.RAM_Used]: Math.round(
      data.mem.active / (data.mem.total / 100),
    ),
  }

  return templates.map((template) => {
    let result = template

    Object.entries(replaceValues).forEach(([key, value]) => {
      result = result.replaceAll(key, String(value))

      if (result.length < CHARS_WIDTH) {
        result = result.padEnd(CHARS_WIDTH, ' ')
      }
    })

    return result
  })
}

export const paginate = (array: string[], page: number, pageSize: number) => {
  return array.slice((page - 1) * pageSize, page * pageSize)
}
