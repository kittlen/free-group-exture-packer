/**
 * 关于对话框
 * 显示应用名称/版本/源码地址/贡献者/依赖库
 */
import { useTranslation } from 'react-i18next'
import { Modal, Descriptions, Typography, Space } from 'antd'
import { GithubOutlined, BugOutlined } from '@ant-design/icons'

const { Text, Link } = Typography

interface AboutProps {
  open: boolean
  onClose: () => void
}

/** 应用信息 */
const appInfo = {
  displayName: 'Free Group Texture Packer',
  version: '0.1.0',
  homepage: 'https://github.com/kittlen/free-group-exture-packer',
  gitee: 'https://gitee.com/kittlen/free-group-exture-packer',
  bugs: { url: 'https://github.com/kittlen/free-group-exture-packer/issues' },
  original: {
    name: 'odrick/free-tex-packer',
    url: 'https://github.com/odrick/free-tex-packer',
  },
  contributors: [
    { name: 'kittlen', homepage: 'https://github.com/kittlen' },
  ],
}

/** 依赖库列表 */
const libs = [
  { name: 'React', url: 'https://react.dev' },
  { name: 'Ant Design', url: 'https://ant.design' },
  { name: 'JSZip', url: 'https://stuk.github.io/jszip' },
  { name: 'FileSaver.js', url: 'https://github.com/eligrey/FileSaver.js' },
  { name: 'MaxRectsBinPack', url: 'https://github.com/06wj/MaxRectsBinPack' },
  { name: 'MaxRectsPacker', url: 'https://www.npmjs.com/package/maxrects-packer' },
]

export function About({ open, onClose }: AboutProps) {
  const { t } = useTranslation()
  return (
    <Modal
      title={appInfo.displayName}
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
    >
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 600 }}>{appInfo.displayName}</Text>
        <br />
        <Text type="secondary">v{appInfo.version}</Text>
      </div>

      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label={t('ABOUT_FORKED_FROM')}>
          <Link href={appInfo.original.url} target="_blank">{appInfo.original.name}</Link>
        </Descriptions.Item>
        <Descriptions.Item label={<><GithubOutlined /> {t('ABOUT_SOURCES')}</>}>
          <Link href={appInfo.homepage} target="_blank">{appInfo.homepage}</Link>
        </Descriptions.Item>
        <Descriptions.Item label={t('ABOUT_GITEE')}>
          <Link href={appInfo.gitee} target="_blank">{appInfo.gitee}</Link>
        </Descriptions.Item>
        <Descriptions.Item label={<><BugOutlined /> {t('ABOUT_BUGS')}</>}>
          <Link href={appInfo.bugs.url} target="_blank">{appInfo.bugs.url}</Link>
        </Descriptions.Item>
        <Descriptions.Item label={t('ABOUT_LIBS')}>
          <Space direction="vertical" size={2}>
            {libs.map((lib) => (
              <Link key={lib.name} href={lib.url} target="_blank">{lib.name}</Link>
            ))}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label={t('ABOUT_CONTRIBUTORS')}>
          {appInfo.contributors.map((c, i) => (
            <span key={c.name}>
              {i > 0 && ', '}
              <Link href={c.homepage} target="_blank">{c.name}</Link>
            </span>
          ))}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  )
}
