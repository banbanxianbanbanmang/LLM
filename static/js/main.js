
// 全局变量来跟踪当前页和每页显示的行数
let currentPage = 1;
const rowsPerPage = 5; // 设定每页显示5行
var globalprogressInterval
var resultArray
globalprogressInterval = null;  // 全局变量来保存循环查询进度的interval id
const progressStatusElement = document.getElementById('loadingIndicator');  // 获取显示进度的元素

// 改进后的displayTable函数
function displayTable(page) {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedItems = resultArray.slice(start, end);
    updateTableWithData(paginatedItems); // 显示当前页的数据
    setupPagination(resultArray.length, page); // 设置分页按钮
}

// 设置分页控件
function setupPagination(totalItems, currentPage) {
    const paginationElement = document.getElementById('pagination');
    paginationElement.innerHTML = '';  // 清空分页控件

    const pageCount = Math.ceil(totalItems / rowsPerPage);

    for (let i = 1; i <= pageCount; i++) {
        const button = document.createElement('button');
        button.innerText = i;
        button.className = currentPage === i ? 'active' : '';
        button.addEventListener('click', () => displayTable(i));
        paginationElement.appendChild(button);
    }
}
let selectedFiles = [];
const fileInput = document.getElementById('fileInput');
const file_list = document.getElementById('file_list');
const downloadButton = document.getElementById('download_button');

function handleDragOver(event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
}

// 函数用于将数据更新到页面的表格中
function updateTableWithData(data) {
    const tableBody = document.getElementById('data-table').querySelector('tbody');
    tableBody.innerHTML = ''; // 清空存在的表格内容

    data.forEach((item) => {
        const row = document.createElement('tr');
        for (const key in item) {
            const cell = document.createElement('td');
            cell.textContent = item[key]; // 将数据插入单元格
            row.appendChild(cell); // 将单元格添加到行
        }
        tableBody.appendChild(row); // 将行添加到表格的tbody中
    });
}

function handleFilesSelection(files) {
    // 将文件显示在文件列表中
    updateFileList(file_list, files);

    // 更新 selectedFiles 数组
    selectedFiles = [...files];
    console.log("将拖拽的文件显示在文件列表中")

    // 启用下载按钮
    downloadButton.disabled = true;
}

function handleDrop(event) {
    event.stopPropagation();
    event.preventDefault();

    const files = event.dataTransfer.files;
    handleFilesSelection(files);
}

function updateFileList(container, fileList) {
    let files = Array.from(fileList); // 将FileList转换为数组

    if (files.length === 0) {
        container.innerHTML = '没有可用的数据';
    } else {
        container.innerHTML = ''; // 清空容器，为了显示最新选择的文件列表
        files.forEach((file) => {
            const listItem = document.createElement('div');
            listItem.className = 'file-item';
            listItem.textContent = file.name; // 显示文件名
            container.appendChild(listItem); // 添加到文件列表容器中
        });
    }
}

function clearFiles() {
    selectedFiles = [];
    file_list.innerHTML = '没有可用的数据';
    downloadButton.disabled = true;
    fileInput.value = '';
}




function uploadFiles() {
    if (selectedFiles.length > 0) {
        // 创建 FormData 对象
        let formData = new FormData();

        // 将所有选中的文件添加到 FormData
        for (let i = 0; i < selectedFiles.length; i++) {
            formData.append('files[]', selectedFiles[i], selectedFiles[i].name);
        }
        // 使用 fetch 发送 FormData 到后端
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                startProgressChecking();  // 上传成功后开始定期查询进度

                // 在数据加载完毕时隐藏加载提示
                progressStatusElement.style.display = "block";
            })
            .catch(error => {
                console.error('上传发生错误:', error);
                alert('文件上传失败');

                // 错误处理也需要隐藏加载提示
                progressStatusElement.style.display = "none";
                downloadButton.disabled = true; // 上传失败时禁用下载按钮
            });
    }
}
// 获取模型结果
function fetchDataAndDisplay() {
    fetch('/api/getresult') // 修改为您数据的实际URL
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应不是ok状态：' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            if (data.result) {
                // console.log(data.result)
                if (typeof data === 'undefined') {
                    console.log('data 是 undefined');
                    return
                }
                if (data instanceof File) {
                    console.log('这是一个文件对象');
                    return
                }
                if (Array.isArray(data.result)) {
                    resultArray = data.result
                    updateTableWithData(data.result);  // 更新表格数据
                    displayTable(1); // 显示第一页数据
                }


            } else if (data.error) {
                alert("错误：" + data.error);
            } else {
                alert("返回数据格式不正确。");
            }
        })
        .catch(error => {
            console.error('获取数据发生错误:', error);
            alert("获取数据时出错，请稍后再试。");
        });
}
// 发送请求给服务器，表示选中了某个模型
function chooseModel(modelName) {
    fetch('/api/SetSelectedModel', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: modelName })
    }).then((response) => {
        if (response.ok) {
            // 请求成功，改变按钮样式
            const buttons = document.querySelectorAll('.model-button');
            buttons.forEach((button) => {
                if (button.textContent === modelName) {
                    button.classList.add('active-button');
                } else {
                    button.classList.remove('active-button');
                }
            });
        } else {
            console.error(`Failed to set selected model: ${response.statusText}`);
        }
    }).catch((error) => console.error('Error:', error));
}

// 查询进度的函数
function checkProgress() {
    fetch('/progress')
        .then(response => response.json())
        .then(data => {
            // 对查询到的进度进行处理，例如更新进度条等
            progressStatusElement.textContent = `任务进度：${data.progress}%`;

            // 如果进度已经完成，获取结果并处理
            if (data.progress >= 100) {
                clearInterval(globalprogressInterval);  // 停止查询进度
                // progressStatusElement.style.display = 'none';  // 隐藏提示    
                progressStatusElement.textContent = '处理完成';  // 可自定义完成后的信息
                // progressStatusElement.style.display = 'none';  // 可选择隐藏进度显示
                downloadButton.disabled = false; // 成功上传后启用下载按钮
                // 如果有返回结果，可以在这里处理结果，例如显示在表格中等

                // 网络获取结果
                fetchDataAndDisplay()
                // 结果展示
                updateTableWithData(data.result);  // 假设您有这样一个函数来展示数据
                displayTable(1); // 显示第一页数据

            }
        })
        .catch(error => {
            console.error('查询进度发生错误:', error);
        });
}
// 开始定期查询进度
function startProgressChecking() {
    globalprogressInterval = setInterval(checkProgress, 1000);  // 每隔2秒查询一次进度
    progressStatusElement.style.display = "block"; // 确保进度提示可见
}
function jsonToCSV(jsonData, filename) {
    // 如果jsonData不是对象数组，则抛出错误
    if (!Array.isArray(jsonData)) {
        throw new Error('jsonData is not an array');
    }

    // 提取标题(假定所有对象具有相同的键)
    const csvHeaders = Object.keys(jsonData[0]).join(',') + '\n';

    // 映射每个对象的值，并以CSV格式连接
    const csvRows = jsonData.map(row =>
        Object.values(row)
            .map(value => `"${value.toString().replace(/"/g, '""')}"`) // 处理CSV中的引号
            .join(',')
    ).join('\n');

    csvData = csvHeaders + csvRows;
    BOM = '\uFEFF';
    csvData = BOM + csvHeaders + csvRows;
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    // Excel在打开UTF-8 CSV文件时识别BOM


    // 创建临时链接，并触发下载
    const tempLink = document.createElement('a');
    tempLink.href = URL.createObjectURL(blob);
    tempLink.setAttribute('download', filename);
    tempLink.click();
}

function save2csv() {
    // 假设selectedFiles变量中存储了后台传回的JSON数据
    try {
        jsonToCSV(selectedFiles, 'data.csv');
    } catch (error) {
        console.error('Error while converting JSON to CSV:', error);
        alert('转换成CSV文件时出错');
    }
}
// 将获取模型列表和创建按钮的代码封装为一个函数，然后在需要的地方调用它
function fetchModelsAndCreateButtons() {
    fetch('/api/GetModelsList')
        .then(response => response.json())
        .then(data => {
            const models = data.models;
            const container = document.getElementById('models-container');

            for (let i = 0; i < models.length; i++) {
                const button = document.createElement('button');
                button.textContent = models[i];
                button.className = 'model-button';
                button.addEventListener('click', function () {
                    chooseModel(models[i]);
                });
                container.appendChild(button);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

document.addEventListener('DOMContentLoaded', function () {
    // 绑定input的改变事件处理文件选择
    fileInput.addEventListener('change', function (event) {
        handleFilesSelection(event.target.files);
    });

    // 绑定事件监听器到下载按钮上
    document.getElementById('download_button').addEventListener('click', save2csv);

    // 如果页面上还有其他控件也需要在DOM加载完毕后才能绑定事件监听器，
    // 你可以在这里继续添加更多的事件绑定
    // 获取模型列表
    fetchModelsAndCreateButtons()

});
