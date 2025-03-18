import ky from 'ky'
import { ALLOWED_IMAGE_URL, CHARS_WIDTH, TEMPLATE_TOKENS } from './constants'
import { Config, OhmDataNode } from './types'

export const getOhmData = (config: Config) =>
  ky(`http://${config.ohmUrl}:${config.ohmPort}/data.json`).json<OhmDataNode>()

export const transformOhmData = (
  ohmData: OhmDataNode,
  templates: string[],
  gpuModel?: string,
) => {
  const stack = [ohmData]
  const data: OhmDataNode[] = []

  while (stack.length > 0) {
    const node = stack.pop()
    if (node) {
      if (node.Children) {
        stack.push(...node.Children)
      }

      if (ALLOWED_IMAGE_URL.includes(node.ImageURL)) {
        data.push(node)
      }
    }
  }

  const gpu = (
    gpuModel
      ? data.find((node) => node.Text.includes(gpuModel))
      : data.find(
          (node) =>
            node.Text.includes('NVIDIA') || node.Text.includes('AMD Radeon'),
        )
  ) as OhmDataNode

  const cpu = data.find((node) => node.ImageURL === 'images_icon/cpu.png')!
  const ram = data.find((node) => node.ImageURL === 'images_icon/ram.png')!

  const cpuData = getCpuData(cpu)
  const ramData = getRamData(ram)
  const gpuData = getGpuData(gpu)

  const replaceValues = {
    [TEMPLATE_TOKENS.CPU_Ghz]: cpuData.clock.toFixed(1),
    [TEMPLATE_TOKENS.CPU_Temp]: cpuData.temperature,
    [TEMPLATE_TOKENS.CPU_Load]: cpuData.load,
    [TEMPLATE_TOKENS.GPU_Ghz]: gpuData.clock,
    [TEMPLATE_TOKENS.GPU_Temp]: gpuData.temperature,
    [TEMPLATE_TOKENS.GPU_Load]: gpuData.load,
    [TEMPLATE_TOKENS.RAM_Used]: ramData.load,
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

const getCpuData = (node: OhmDataNode) => {
  const clock = Math.max(
    ...node.Children.find((node) => node.Text === 'Clocks')!
      .Children.filter((node) => node.Text !== 'Bus Speed')
      .map((node) => {
        const [clock] = node.Value!.split(' ')

        return Number(clock.replaceAll(',', '.'))
      }),
  )

  const [temperatureNode] = node.Children.find(
    (node) => node.Text === 'Temperatures',
  )!.Children
  const temperature = formatValue(temperatureNode.Value!)

  const load = formatValue(
    node.Children.find((node) => node.Text === 'Load')!.Children.find(
      (node) => node.Text === 'CPU Total',
    )!.Value!,
  )

  return { clock, temperature, load }
}

const getRamData = (node: OhmDataNode) => {
  const loadData = node.Children.find((node) => node.Text === 'Load')!

  return {
    load: formatValue(
      loadData.Children.find((node) => node.Text === 'Memory')!.Value!,
    ),
  }
}

const getGpuData = (node: OhmDataNode) => {
  const temperature = formatValue(
    node.Children.find((node) => node.Text === 'Temperatures')!.Children.find(
      (node) => node.Text === 'GPU Hot Spot',
    )!.Value!,
  )
  const load = formatValue(
    node.Children.find((node) => node.Text === 'Load')!.Children.find(
      (node) => node.Text === 'GPU Core',
    )!.Value!,
  )
  const clock = formatValue(
    node.Children.find((node) => node.Text === 'Clocks')!.Children.find(
      (node) => node.Text === 'GPU Core',
    )!.Value!,
  )

  return { temperature, load, clock }
}

const formatValue = (value: string) =>
  Number(value.split(' ')[0].replaceAll(',', '.')).toFixed()

export const paginate = (array: string[], page: number, pageSize: number) => {
  return array.slice((page - 1) * pageSize, page * pageSize)
}
