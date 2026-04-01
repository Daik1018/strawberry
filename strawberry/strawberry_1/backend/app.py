from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import os
import random
import time

app = Flask(__name__)
CORS(app)

# 上传目录
UPLOAD_FOLDER = 'd:\strawberry\strawberry_1\uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 确保上传目录存在
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# 模拟草莓类型识别结果
STRAWBERRY_TYPES = ['红颜', '章姬', '甜宝', '其他']

# 模拟病害类型
DISEASE_TYPES = ['健康', '灰霉病', '白粉病', '其他病害']

# 模拟识别函数
def recognize_strawberry(image_path):
    """模拟草莓识别功能"""
    # 模拟识别延迟
    time.sleep(1)
    
    # 随机生成识别结果
    result = {
        'type': random.choice(STRAWBERRY_TYPES),
        'disease': random.choice(DISEASE_TYPES),
        'confidence': random.uniform(0.7, 0.99)
    }
    
    return result

# API路由：识别草莓
@app.route('/api/recognize', methods=['POST'])
def recognize():
    try:
        # 检查是否有文件上传
        if 'image' not in request.files:
            return jsonify({'success': False, 'message': '没有上传图片'})
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({'success': False, 'message': '图片文件名为空'})
        
        # 保存上传的图片
        filename = str(int(time.time())) + '_' + file.filename
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # 调用识别函数
        result = recognize_strawberry(filepath)
        
        return jsonify({
            'success': True,
            'result': result,
            'image_path': filepath
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# API路由：保存标注
@app.route('/api/annotate', methods=['POST'])
def annotate():
    try:
        data = request.json
        
        if not data:
            return jsonify({'success': False, 'message': '没有提供标注数据'})
        
        # 模拟保存标注
        # 在实际应用中，这里应该将标注数据保存到数据库
        print('保存标注:', data)
        
        return jsonify({'success': True, 'message': '标注保存成功'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# 健康检查路由
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'success': True, 'message': '服务运行正常'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)