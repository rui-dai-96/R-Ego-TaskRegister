import { describe, expect, it } from 'vitest'
import { parseCandidateTaskCsv } from './csv'

function csvFile(content: string) {
  return new File([content], 'tasks.csv', { type: 'text/csv' })
}

describe('parseCandidateTaskCsv', () => {
  it('parses and normalizes a valid candidate task', async () => {
    const result = await parseCandidateTaskCsv(csvFile([
      '一级场景,二级场景,二级任务,三级任务示例名称,三级示例任务步骤,任务数量,上传状态',
      '家庭场景,厨房,餐具整理,整理餐具,识别餐具 → 放入洗碗机,20,已发布',
    ].join('\n')))

    expect(result.errors).toEqual([])
    expect(result.tasks).toEqual([expect.objectContaining({
      level1_scene: '家庭场景',
      example_steps: ['识别餐具', '放入洗碗机'],
      target_count: 20,
      status: 'published',
    })])
  })

  it('reports duplicate rows and invalid quantities', async () => {
    const header = '一级场景,二级场景,二级任务,三级任务示例名称,三级示例任务步骤,任务数量,上传状态'
    const valid = '家庭场景,厨房,餐具整理,整理餐具,识别 → 放置,10,草稿'
    const invalid = '家庭场景,厨房,餐具整理,错误数量,识别 → 放置,0,草稿'
    const result = await parseCandidateTaskCsv(csvFile([header, valid, valid, invalid].join('\n')))

    expect(result.tasks).toHaveLength(1)
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0].message).toContain('重复')
  })
})
