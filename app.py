import os
from flask import Flask, request, jsonify, render_template
import pandas as pd
from werkzeug.utils import secure_filename
from threading import Thread
import random
import time
import json

config = {}
with open('config.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

progress = 0  # 初始化进度为0
processed_data = []
selected_model = None

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'Uploads/'  # 设置上传文件的存储文件夹


ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}  # 允许的文件扩展名集合

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def process_excel(file_path):

    # 下面都是模拟返回值，具体返回值大家自己看着办，
    # global progress  # 使用全局进度变量
    # progress = 0  # 开始新任务时将进度设置为0
    # 通过设置一个全局变量，/progress 有人访问就读取这个变量并返回告知进度
    # 客户端浏览器在获得进度100%后访问/api/getresult获取结果
    
    try:
        print(file_path)
        original_data = {
    "住院号": 410291, 
    "年龄": 71, 
    "性别": "男", 
    "吸烟年数": "40+年", 
    "每天吸烟量": "10支", 
    "是否戒烟": "否", 
    "是否有肿瘤家族史": "是", 
    "ECOG评分/PS分/EOOG/": "未报告"
}

        # 指定生成数据的数量
        num_items = 31 
        data = []

        # 生成31个带有随机住院号的字典
        for _ in range(num_items):
            # 复制原始数据
            new_item = original_data.copy()
            
            # 生成新的随机住院号，并确保它是唯一的
            while True:
                new_hospital_number = random.randint(100000, 999999)  # 假设住院号是六位数
                if new_hospital_number not in [item['住院号'] for item in data]:
                    new_item['住院号'] = new_hospital_number
                    break
            # 生成新的随机年龄，并确保它是唯一的
            while True:
                new_age = random.randint(40, 99)  # 假设住院号是六位数
                if new_age not in [item['年龄'] for item in data]:
                    new_item['年龄'] = new_age
                    break
            
            # 为列表添加新字典
            data.append(new_item)



        global progress  # 使用全局进度变量
        progress = 0  # 开始新任务时将进度设置为0
        for _ in range(10):  # 模拟一个运行10秒的任务
            time.sleep(1)  # 每秒钟更新一次
            progress += int(100 / 10)  # 更新进度
            if progress>100:
                progress = 100
        

    # df = pd.read_excel(file_path)
    # return df.to_dict(orient='records')
        
        global processed_data
        processed_data = data
        # return data
    except Exception as e:
        return {'error': str(e)}

@app.route('/', methods=['GET'])
def home():
    return render_template('upload.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'files[]' not in request.files:
        return jsonify({'error': '没有文件被上传'}), 400

    file = request.files['files[]']
    if file.filename == '':
        return jsonify({'error': '没有选中文件'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        print('上传的文件名:', filename)
        saved_file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(saved_file_path)
        # 调用接口
        
        # 开始处理文件（在新的线程中，以便能够同时进行长任务和响应）
        Thread(target=process_excel, args=(saved_file_path,)).start()

        return jsonify({'message': '文件上传成功，处理已开始'})
    
@app.route('/progress', methods=['GET'])
def get_progress():
    global progress

    if progress is None:
        return jsonify({'error': '没有正在运行的任务'}), 400
    elif progress >= 100:
        # progress = None  # 当任务完成时，重置进度变量
        return jsonify({'progress': 100})
    else:
        return jsonify({'progress': progress})
    
@app.route('/api/getresult', methods=['GET'])
def api_get_result():
    global processed_data
    global progress
    # 检查是否有处理后的数据
    if progress==100:
        progress=None
        print("数据列表已经返回")
        return jsonify({'result': processed_data})  # 返回处理后的数据
        
    else:
        return jsonify({'error': '没有可用的处理后的数据'}), 404   
# 回应网页端可以访问模型列表
@app.route('/api/GetModelsList', methods=['GET'])
def get_models():
    try:
        return jsonify({'models': config['models']
}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# 假设你已经保存了当前选中的模型
@app.route('/api/SetSelectedModel', methods=['POST'])
def set_selected_model():
    global selected_model
    model = request.get_json().get('model', None)
    if model is None:
        return jsonify({'error': '没有提供模型名称'}), 400

    # 在设置新模型前，检查是否在可用模型列表中
    if model not in config['models']:
        return jsonify({'error': '选择的模型不在可用模型列表中'}), 400

    selected_model = model
    return jsonify({'message': '模型选择成功'}), 200
if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)  # 创建上传文件夹
    app.run(debug=True)