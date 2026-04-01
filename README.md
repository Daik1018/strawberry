# 草莓识别项目说明

# 一、项目功能概述
本项目实现了草莓的多场景智能识别，核心功能包含：
图像端识别：支持单张 / 批量草莓图片的识别，判断是否为草莓、区分成熟 / 未成熟草莓、识别草莓是否存在病虫害（如灰霉病、白粉病）；
实时视频 / 摄像头识别：调用本地摄像头或视频文件，实时检测画面中的草莓并标注识别结果（类别、置信度、检测框）；
识别结果可视化：自动生成带检测框、类别标签的识别结果图，输出识别日志（包含识别类别、置信度、耗时）；
轻量化部署支持：模型支持轻量化导出，可适配边缘设备（如树莓派）或 Web 端快速部署。

# 二、技术实现原理
1. 核心技术栈
深度学习框架	PyTorch/TensorFlow（二选一，根据实际使用标注）
目标检测模型	YOLOv8/YOLOv5/Faster R-CNN（优先轻量化的 YOLO 系列，适配草莓检测场景）
数据处理	OpenCV（图像预处理）、PIL（图像读取）、LabelImg（数据标注）、Albumentations（数据增强）
可视化 / 部署	Matplotlib（结果可视化）、Gradio/Streamlit（Web 端）、ONNX（模型轻量化）
2. 实现步骤
（1）数据集构建与预处理
数据采集：收集不同场景（自然光、大棚、不同角度）、不同状态（成熟 / 未成熟 / 病虫害）的草莓图片，数量建议≥1000 张；
数据标注：使用 LabelImg 工具标注图片，生成 VOC/YOLO 格式的标注文件（标注类别：strawberry_ripe、strawberry_unripe、strawberry_diseased）；
数据增强：通过随机裁剪、翻转、亮度调整、噪声添加等增强手段扩充数据集，划分训练集 / 验证集 / 测试集（比例约 7:2:1）。
（2）模型训练
基础模型加载：基于预训练的 YOLOv8（或其他模型）权重，冻结主干网络进行迁移学习；
超参数配置：设置批次大小（batch size）、学习率（lr=0.001）、迭代次数（epochs=100）等；
训练过程：在训练集上迭代训练，验证集实时评估精度（mAP@0.5），通过早停法（Early Stopping）避免过拟合；
模型评估：在测试集上验证，核心指标：精确率（Precision）、召回率（Recall）、mAP@0.5，确保识别准确率≥90%。
（3）识别功能开发
# 核心识别代码示例（以YOLOv8为例）
from ultralytics import YOLO
import cv2

加载训练好的模型
model = YOLO("runs/detect/train/weights/best.pt")

单张图片识别
def detect_image(img_path, save_path="result.jpg"):
    img = cv2.imread(img_path)
    results = model(img)  # 模型推理
    # 可视化结果
    annotated_img = results[0].plot()
    cv2.imwrite(save_path, annotated_img)
    # 解析识别结果
    detect_info = []
    for box in results[0].boxes:
        cls = model.names[int(box.cls)]  # 类别
        conf = float(box.conf)  # 置信度
        detect_info.append({"class": cls, "confidence": conf})
    return detect_info, save_path

实时摄像头识别
def detect_camera():
    cap = cv2.VideoCapture(0)  # 调用本地摄像头
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        results = model(frame)
        annotated_frame = results[0].plot()
        cv2.imshow("Strawberry Detection", annotated_frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    # 测试单张图片识别
    detect_info, res_path = detect_image("test.jpg")
    print("识别结果：", detect_info)
    # 测试摄像头识别
    # detect_camera()
（4）结果可视化与封装
对识别结果绘制检测框、类别标签、置信度；
封装识别函数为可调用接口，支持命令行 / API 调用。

# 三、部署教程
1. 环境部署（本地 / 服务器）
（1）环境要求
系统：Windows/Linux/macOS
Python 版本：3.8~3.10
依赖库：
bash


安装核心依赖
pip install ultralytics opencv-python pillow matplotlib numpy
若使用PyTorch，补充安装（根据CUDA版本适配）
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

（2）源码部署步骤
克隆代码仓库：
bash
运行
git clone https://github.com/你的用户名/strawberry-detection.git
cd strawberry-detection
下载训练好的模型权重：
将训练好的best.pt（或 ONNX 文件）放入weights/目录；
运行识别脚本：
bash
运行

 单张图片识别
python detect.py --img_path test.jpg
 摄像头实时识别
python detect.py --camera
# 2. Web 端部署（Gradio 快速搭建）
python
运行
import gradio as gr
from detect import detect_image

def gradio_detect(img):
    # 临时保存图片
    img_path = "temp.jpg"
    cv2.imwrite(img_path, cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
    detect_info, res_path = detect_image(img_path)
    return res_path, str(detect_info)

# 搭建Web界面
with gr.Blocks() as demo:
    gr.Markdown("# 草莓智能识别系统")
    with gr.Row():
        input_img = gr.Image(type="numpy", label="上传草莓图片")
        output_img = gr.Image(label="识别结果")
    output_info = gr.Textbox(label="识别详情")
    submit_btn = gr.Button("开始识别")
    submit_btn.click(fn=gradio_detect, inputs=input_img, outputs=[output_img, output_info])

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
运行 Web 服务：
bash
运行
python app.py
访问 http://服务器IP:7860 即可在浏览器中上传图片识别。
3. 轻量化部署（边缘设备 / ONNX）
（1）模型导出为 ONNX 格式
python
运行
from ultralytics import YOLO

model = YOLO("weights/best.pt")
model.export(format="onnx")  # 导出为best.onnx
（2）ONNX 模型推理（适配树莓派等边缘设备）
bash
运行
##安装ONNX运行依赖
pip install onnxruntime opencv-python
python
运行
##onnx_detect.py
import onnxruntime as ort
import cv2
import numpy as np

##加载ONNX模型
ort_session = ort.InferenceSession("weights/best.onnx")

##图像预处理
def preprocess(img, input_size=(640, 640)):
    img = cv2.resize(img, input_size)
    img = img / 255.0
    img = np.transpose(img, (2, 0, 1))
    img = np.expand_dims(img, axis=0).astype(np.float32)
    return img

##ONNX推理
def onnx_detect(img_path):
    img = cv2.imread(img_path)
    img_origin = img.copy()
    input_img = preprocess(img)
    # 推理
    outputs = ort_session.run(None, {ort_session.get_inputs()[0].name: input_img})
    # 解析输出（需根据YOLOv8 ONNX输出格式适配）
    # 此处省略输出解析逻辑，可参考YOLOv8 ONNX推理教程
    return img_origin

if __name__ == "__main__":
    onnx_detect("test.jpg")

# 4. 部署注意事项
若使用 GPU 加速，需确保安装对应版本的 CUDA/CUDNN；
边缘设备（树莓派）建议使用轻量化模型（YOLOv8n），并关闭不必要的可视化；
服务器部署可配合 Nginx 反向代理，对外提供稳定的 Web 识别服务。
四、补充说明（GitHub/CSDN 发布适配）
GitHub 仓库建议包含：README.md（本说明）、detect.py（核心代码）、app.py（Web 部署）、weights/（模型权重，可通过 Release 上传）、requirements.txt（依赖列表）；
CSDN 发布时可补充：数据集标注示例、模型训练损失曲线、识别效果对比图，以及常见问题（如模型推理慢、识别准确率低）的解决方案。
