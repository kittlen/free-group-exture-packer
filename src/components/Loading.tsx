/**
 * 全屏加载动画组件
 * 用于应用初始化、项目加载等场景
 */
import { LoadingOutlined } from "@ant-design/icons"
import { Spin, Typography } from "antd"
import { t } from "i18next"
const { Text } = Typography

const LoadingView = () => {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
            <div className="flex flex-col items-center gap-4">
                <Spin indicator={<LoadingOutlined className="text-5xl text-white" spin />} />
                <Text className="text-white text-lg">{t("PLEASE_WAIT")}</Text>
            </div>
        </div>
    )
}
export default LoadingView;