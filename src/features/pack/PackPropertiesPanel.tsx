/**
 * 打包参数配置面板
 * 使用 Ant Design Form 实现，包含所有打包选项
 */

import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import { Form, InputNumber, Select, Switch, Input, Tabs, Typography } from 'antd'
import { usePackStore } from '@/app/store'
import { exporters } from '@/features/export/exporters'
import { packers, getPackerByType } from '@/core/packers'

const { Text } = Typography

export function PackPropertiesPanel() {
  const { t } = useTranslation()
  const packOptions = usePackStore((s) => s.packOptions)
  const setPackOptions = usePackStore((s) => s.setPackOptions)
  const exportOptions = usePackStore((s) => s.exportOptions)
  const setExportOptions = usePackStore((s) => s.setExportOptions)

  const packerMethods = useMemo(() => {
    const packer = getPackerByType(packOptions.packer)
    if (!packer) return []
    return Object.keys(packer.methods)
  }, [packOptions.packer])

  return (
    <div className="flex-1  overflow-auto p-4">
      <Text strong className="text-base mb-4 block">
        {t('PACK_PARAMS_TITLE')}
      </Text>
      <Form layout="vertical" size="small" style={{ height: "calc(100vh - 150px)" }}>
        <Tabs
          items={[
            {
              key: 'pack',
              label: t('TAB_PACK'),
              children: (
                <>
                  <Form.Item label={t('WIDTH')}>
                    <InputNumber value={packOptions.width} onChange={(v) => setPackOptions({ width: v || 0 })} min={0} className="w-full" />
                  </Form.Item>
                  <Form.Item label={t('HEIGHT')}>
                    <InputNumber value={packOptions.height} onChange={(v) => setPackOptions({ height: v || 0 })} min={0} className="w-full" />
                  </Form.Item>
                  <Form.Item label={t('PACKER')}>
                    <Select
                      value={packOptions.packer}
                      onChange={(v) => {
                        const p = getPackerByType(v)
                        const methods = p ? Object.keys(p.methods) : []
                        const isNone = v === 'None'
                        setPackOptions({
                          packer: v,
                          packerMethod: methods[0] || '',
                          allowRotation: isNone ? false : packOptions.allowRotation,
                          allowTrim: isNone ? false : packOptions.allowTrim,
                        })
                      }}
                      options={packers.map((p) => ({ value: p.type, label: p.type }))}
                    />
                  </Form.Item>
                  <Form.Item label={t('PACKER_METHOD')}>
                    <Select
                      value={packOptions.packerMethod}
                      onChange={(v) => setPackOptions({ packerMethod: v })}
                      options={packerMethods.map((m) => ({ value: m, label: m }))}
                      disabled={packOptions.packer === 'OptimalPacker'}
                    />
                  </Form.Item>
                  <Form.Item label={t('PADDING')}>
                    <InputNumber value={packOptions.padding} onChange={(v) => setPackOptions({ padding: v || 0 })} min={0} className="w-full" />
                  </Form.Item>
                  <Form.Item label={t('FIXED_SIZE')}>
                    <Switch checked={packOptions.fixedSize} onChange={(v) => setPackOptions({ fixedSize: v })} />
                  </Form.Item>
                  <Form.Item label={t('ALLOW_ROTATION')}>
                    <Switch checked={packOptions.allowRotation} onChange={(v) => setPackOptions({ allowRotation: v })} disabled={packOptions.packer === 'None'} />
                  </Form.Item>
                  <Form.Item label={t('DETECT_IDENTICAL')}>
                    <Switch checked={packOptions.detectIdentical} onChange={(v) => setPackOptions({ detectIdentical: v })} />
                  </Form.Item>
                  <Form.Item label={t('POWER_OF_TWO')}>
                    <Switch checked={packOptions.powerOfTwo} onChange={(v) => setPackOptions({ powerOfTwo: v })} />
                  </Form.Item>
                  <Form.Item label={t('ALLOW_TRIM')}>
                    <Switch checked={packOptions.allowTrim} onChange={(v) => setPackOptions({ allowTrim: v })} disabled={packOptions.packer === 'None'} />
                  </Form.Item>
                  <Form.Item label={t('TRIM_MODE')}>
                    <Select
                      value={packOptions.trimMode}
                      onChange={(v) => setPackOptions({ trimMode: v })}
                      disabled={!packOptions.allowTrim || packOptions.packer === 'None'}
                      options={[
                        { value: 'trim', label: t('TRIM_MODE_TRIM') },
                        { value: 'crop', label: t('TRIM_MODE_CROP') },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item label={t('EXTRUDE')}>
                    <InputNumber value={packOptions.extrude} onChange={(v) => setPackOptions({ extrude: v || 0 })} min={0} className="w-full" />
                  </Form.Item>
                  <Form.Item label={t('SCALE')}>
                    <InputNumber value={packOptions.scale} onChange={(v) => setPackOptions({ scale: v || 1 })} min={0.1} step={0.25} className="w-full" />
                  </Form.Item>
                </>
              ),
            }, {
              key: 'export',
              label: t('TAB_EXPORT'),
              children: (
                <>
                  <Form.Item label={t('FILE_NAME')}>
                    <Input value={exportOptions.fileName} onChange={(e) => setExportOptions({ fileName: e.target.value })} />
                  </Form.Item>
                  <Form.Item label={t('FORMAT')}>
                    <Select
                      value={exportOptions.exporter}
                      onChange={(v) => setExportOptions({ exporter: v })}
                      options={exporters.map((e) => ({ value: e.type, label: e.type }))}
                    />
                  </Form.Item>
                  <Form.Item label={t('TEXTURE_FORMAT')}>
                    <Select
                      value={exportOptions.textureFormat}
                      onChange={(v) => setExportOptions({ textureFormat: v })}
                      options={[
                        { value: 'png', label: t('FORMAT_PNG') },
                        { value: 'jpg', label: t('FORMAT_JPG') },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item label={t('REMOVE_FILE_EXT')}>
                    <Switch checked={exportOptions.removeFileExtension} onChange={(v) => setExportOptions({ removeFileExtension: v })} />
                  </Form.Item>

                  <Form.Item label={t('PREPEND_FOLDER')}>
                    <Switch checked={exportOptions.prependFolderName} onChange={(v) => setExportOptions({ prependFolderName: v })} />
                  </Form.Item>

                  <Form.Item label={t('BASE64_EXPORT')}>
                    <Switch checked={exportOptions.base64Export} onChange={(v) => setExportOptions({ base64Export: v })} />
                  </Form.Item>

                  <Form.Item label={t('TINIFY')}>
                    <Switch checked={exportOptions.tinify} onChange={(v) => setExportOptions({ tinify: v })} />
                  </Form.Item>

                  {exportOptions.tinify && (
                    <Form.Item label={t('TINIFY_KEY')}>
                      <Input value={exportOptions.tinifyKey} onChange={(e) => setExportOptions({ tinifyKey: e.target.value })} placeholder={t('TINIFY_KEY_PLACEHOLDER')} />
                    </Form.Item>
                  )}
                </>
              ),
            },
            {
              key: 'other',
              label: t('TAB_OTHER'),
              children: (
                <>
                  <Form.Item label={t('ALPHA_THRESHOLD')}>
                    <InputNumber value={packOptions.alphaThreshold} onChange={(v) => setPackOptions({ alphaThreshold: v || 0 })} min={0} max={255} className="w-full" />
                  </Form.Item>
                  <Form.Item label={t('FILTER')}>
                    <Select
                      value={packOptions.filter}
                      onChange={(v) => setPackOptions({ filter: v })}
                      options={[
                        { value: 'Original', label: t('FILTER_ORIGINAL') },
                        { value: 'Mask', label: t('FILTER_MASK') },
                        { value: 'Grayscale', label: t('FILTER_GRAYSCALE') },
                      ]}
                    />
                  </Form.Item>
                </>
              ),
            },
          ]} />
      </Form>
    </div>
  )
}
