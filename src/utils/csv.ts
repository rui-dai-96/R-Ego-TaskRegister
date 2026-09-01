import Papa from 'papaparse'
import { z } from 'zod'
import type { CandidateTaskInput } from '../services/tasks'

const rowSchema = z.object({
  一级场景: z.string().trim().min(1),
  二级场景: z.string().trim().min(1),
  二级任务: z.string().trim().min(1),
  三级任务示例名称: z.string().trim().min(1),
  三级示例任务步骤: z.string().trim().min(1),
  任务数量: z.coerce.number().int().positive(),
  上传状态: z.enum(['草稿', '已发布']),
})

export type CsvRowError = { row: number; message: string }
export type CsvParseResult = { tasks: CandidateTaskInput[]; errors: CsvRowError[] }

export function parseCandidateTaskCsv(file: File): Promise<CsvParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, errors: parserErrors }) => {
        const errors: CsvRowError[] = parserErrors.map((error) => ({
          row: (error.row ?? 0) + 2,
          message: error.message,
        }))
        const tasks: CandidateTaskInput[] = []
        const seen = new Set<string>()

        data.forEach((raw, index) => {
          const parsed = rowSchema.safeParse(raw)
          if (!parsed.success) {
            errors.push({ row: index + 2, message: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ') })
            return
          }
          const key = `${parsed.data.一级场景}/${parsed.data.二级场景}/${parsed.data.二级任务}/${parsed.data.三级任务示例名称}`
          if (seen.has(key)) {
            errors.push({ row: index + 2, message: '文件内存在重复任务' })
            return
          }
          seen.add(key)
          tasks.push({
            level1_scene: parsed.data.一级场景,
            level2_scene: parsed.data.二级场景,
            level2_task: parsed.data.二级任务,
            example_name: parsed.data.三级任务示例名称,
            example_steps: parsed.data.三级示例任务步骤.split(/\s*(?:→|\n|\d+[.、])\s*/).filter(Boolean),
            target_count: parsed.data.任务数量,
            status: parsed.data.上传状态 === '已发布' ? 'published' : 'draft',
          })
        })
        resolve({ tasks, errors })
      },
      error: reject,
    })
  })
}

export const candidateTaskCsvTemplate = [
  '一级场景,二级场景,二级任务,三级任务示例名称,三级示例任务步骤,任务数量,上传状态',
  '家庭场景,厨房,餐具整理,将餐后餐具放入洗碗机,识别餐具 → 分类收集 → 打开洗碗机 → 依次放入,20,已发布',
].join('\n')
