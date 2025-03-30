// 全局变量
const fileInput = document.getElementById('file-input');
const selectedFilesText = document.getElementById('selected-files');
const previewContainer = document.getElementById('preview-container');
const processBtn = document.getElementById('process-btn');
const resetBtn = document.getElementById('reset-btn');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const messageElement = document.getElementById('message');

// 调整模式相关元素
const resizeMode = document.getElementById('resize-mode');
const dimensionsGroup = document.getElementById('dimensions-group');
const percentageGroup = document.getElementById('percentage-group');
const maxDimensionGroup = document.getElementById('max-dimension-group');

// 存储选中的文件
let selectedFiles = [];

// 监听文件选择
fileInput.addEventListener('change', handleFileSelect);

// 监听调整模式变化
resizeMode.addEventListener('change', updateResizeMode);

// 处理按钮点击事件
processBtn.addEventListener('click', processImages);

// 重置按钮点击事件
resetBtn.addEventListener('click', resetAll);

// 处理文件选择
function handleFileSelect(event) {
    const files = event.target.files;
    
    if (files.length === 0) {
        selectedFilesText.textContent = '未选择任何文件';
        processBtn.disabled = true;
        return;
    }
    
    selectedFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (selectedFiles.length === 0) {
        selectedFilesText.textContent = '未选择任何有效图片文件';
        processBtn.disabled = true;
        return;
    }
    
    selectedFilesText.textContent = `已选择 ${selectedFiles.length} 个图片文件`;
    processBtn.disabled = false;
    
    // 清空预览区域
    previewContainer.innerHTML = '';
    
    // 生成预览
    selectedFiles.forEach((file, index) => {
        createPreviewItem(file, index);
    });
}

// 创建预览项
function createPreviewItem(file, index) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.dataset.index = index;
        
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = file.name;
        
        const removeBtn = document.createElement('div');
        removeBtn.className = 'preview-remove';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', () => removePreviewItem(index));
        
        const info = document.createElement('div');
        info.className = 'preview-info';
        
        // 获取图片原始尺寸
        img.onload = function() {
            const originalWidth = this.naturalWidth;
            const originalHeight = this.naturalHeight;
            info.textContent = `${file.name.substring(0, 15)}${file.name.length > 15 ? '...' : ''} (${originalWidth}×${originalHeight})`;
        };
        
        previewItem.appendChild(img);
        previewItem.appendChild(removeBtn);
        previewItem.appendChild(info);
        
        previewContainer.appendChild(previewItem);
    };
    
    reader.readAsDataURL(file);
}

// 移除预览项
function removePreviewItem(index) {
    // 从数组中移除
    selectedFiles = selectedFiles.filter((_, i) => i !== index);
    
    // 更新选中文件文本
    if (selectedFiles.length === 0) {
        selectedFilesText.textContent = '未选择任何文件';
        processBtn.disabled = true;
    } else {
        selectedFilesText.textContent = `已选择 ${selectedFiles.length} 个图片文件`;
    }
    
    // 重新生成预览
    previewContainer.innerHTML = '';
    selectedFiles.forEach((file, i) => {
        createPreviewItem(file, i);
    });
}

// 更新调整模式
function updateResizeMode() {
    const mode = resizeMode.value;
    
    // 隐藏所有组
    dimensionsGroup.style.display = 'none';
    percentageGroup.style.display = 'none';
    maxDimensionGroup.style.display = 'none';
    
    // 显示选中的组
    switch (mode) {
        case 'dimensions':
            dimensionsGroup.style.display = 'block';
            break;
        case 'percentage':
            percentageGroup.style.display = 'block';
            break;
        case 'max-dimension':
            maxDimensionGroup.style.display = 'block';
            break;
    }
}

// 处理图片
async function processImages() {
    if (selectedFiles.length === 0) {
        showMessage('请先选择图片', 'error');
        return;
    }
    
    // 获取设置参数
    const mode = resizeMode.value;
    const maintainAspectRatio = document.getElementById('maintain-aspect-ratio').value === 'true';
    const quality = parseInt(document.getElementById('image-quality').value) / 100;
    const outputFormat = document.getElementById('output-format').value;
    
    let width, height, percentage, maxDimension;
    
    switch (mode) {
        case 'dimensions':
            width = parseInt(document.getElementById('width').value);
            height = parseInt(document.getElementById('height').value);
            if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
                showMessage('请输入有效的宽度和高度', 'error');
                return;
            }
            break;
        case 'percentage':
            percentage = parseInt(document.getElementById('scale-percentage').value) / 100;
            if (isNaN(percentage) || percentage <= 0) {
                showMessage('请输入有效的缩放比例', 'error');
                return;
            }
            break;
        case 'max-dimension':
            maxDimension = parseInt(document.getElementById('max-dimension').value);
            if (isNaN(maxDimension) || maxDimension <= 0) {
                showMessage('请输入有效的最大尺寸', 'error');
                return;
            }
            break;
    }
    
    // 显示进度条
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = `处理中... 0/${selectedFiles.length}`;
    
    // 禁用按钮
    processBtn.disabled = true;
    resetBtn.disabled = true;
    
    // 创建一个zip文件用于下载
    const zip = new JSZip();
    
    // 处理每个图片
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileName = file.name;
        const fileExtension = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
        
        // 确定输出格式
        let outputMimeType;
        let outputExtension;
        
        if (outputFormat === 'same') {
            // 保持原格式
            switch (fileExtension) {
                case 'jpg':
                case 'jpeg':
                    outputMimeType = 'image/jpeg';
                    outputExtension = fileExtension;
                    break;
                case 'png':
                    outputMimeType = 'image/png';
                    outputExtension = 'png';
                    break;
                case 'webp':
                    outputMimeType = 'image/webp';
                    outputExtension = 'webp';
                    break;
                default:
                    // 默认为JPEG
                    outputMimeType = 'image/jpeg';
                    outputExtension = 'jpg';
            }
        } else {
            // 使用指定格式
            switch (outputFormat) {
                case 'jpeg':
                    outputMimeType = 'image/jpeg';
                    outputExtension = 'jpg';
                    break;
                case 'png':
                    outputMimeType = 'image/png';
                    outputExtension = 'png';
                    break;
                case 'webp':
                    outputMimeType = 'image/webp';
                    outputExtension = 'webp';
                    break;
            }
        }
        
        // 生成新文件名
        const newFileName = fileName.substring(0, fileName.lastIndexOf('.')) + '_resized.' + outputExtension;
        
        try {
            // 调整图片尺寸
            const resizedImageBlob = await resizeImage(
                file,
                mode,
                width,
                height,
                percentage,
                maxDimension,
                maintainAspectRatio,
                outputMimeType,
                quality
            );
            
            // 添加到zip
            zip.file(newFileName, resizedImageBlob);
            
            // 更新进度
            const progress = Math.round(((i + 1) / selectedFiles.length) * 100);
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `处理中... ${i + 1}/${selectedFiles.length}`;
        } catch (error) {
            console.error('处理图片时出错:', error);
            showMessage(`处理图片 ${fileName} 时出错: ${error.message}`, 'error');
            
            // 启用按钮
            processBtn.disabled = false;
            resetBtn.disabled = false;
            
            return;
        }
    }
    
    // 生成zip文件并下载
    try {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(zipBlob);
        downloadLink.download = 'resized_images.zip';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        showMessage(`成功处理 ${selectedFiles.length} 张图片`, 'success');
    } catch (error) {
        console.error('生成ZIP文件时出错:', error);
        showMessage(`生成ZIP文件时出错: ${error.message}`, 'error');
    }
    
    // 启用按钮
    processBtn.disabled = false;
    resetBtn.disabled = false;
}

// 调整图片尺寸
function resizeImage(file, mode, width, height, percentage, maxDimension, maintainAspectRatio, outputFormat, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(event) {
            const img = new Image();
            
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                let newWidth, newHeight;
                
                // 根据模式计算新尺寸
                switch (mode) {
                    case 'dimensions':
                        if (maintainAspectRatio) {
                            const aspectRatio = img.width / img.height;
                            
                            if (width / height > aspectRatio) {
                                newHeight = height;
                                newWidth = height * aspectRatio;
                            } else {
                                newWidth = width;
                                newHeight = width / aspectRatio;
                            }
                        } else {
                            newWidth = width;
                            newHeight = height;
                        }
                        break;
                    case 'percentage':
                        newWidth = img.width * percentage;
                        newHeight = img.height * percentage;
                        break;
                    case 'max-dimension':
                        if (img.width >= img.height && img.width > maxDimension) {
                            newWidth = maxDimension;
                            newHeight = (img.height / img.width) * maxDimension;
                        } else if (img.height > img.width && img.height > maxDimension) {
                            newHeight = maxDimension;
                            newWidth = (img.width / img.height) * maxDimension;
                        } else {
                            // 图片尺寸已经小于最大尺寸，保持原样
                            newWidth = img.width;
                            newHeight = img.height;
                        }
                        break;
                }
                
                // 设置canvas尺寸
                canvas.width = newWidth;
                canvas.height = newHeight;
                
                // 绘制调整后的图片
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                
                // 转换为Blob
                canvas.toBlob(function(blob) {
                    resolve(blob);
                }, outputFormat, quality);
            };
            
            img.onerror = function() {
                reject(new Error('加载图片失败'));
            };
            
            img.src = event.target.result;
        };
        
        reader.onerror = function() {
            reject(new Error('读取文件失败'));
        };
        
        reader.readAsDataURL(file);
    });
}

// 显示消息
function showMessage(text, type) {
    messageElement.textContent = text;
    messageElement.className = `message ${type}`;
    messageElement.style.display = 'block';
    
    // 5秒后隐藏消息
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 5000);
}

// 重置所有
function resetAll() {
    // 清空文件选择
    fileInput.value = '';
    selectedFiles = [];
    selectedFilesText.textContent = '未选择任何文件';
    
    // 清空预览
    previewContainer.innerHTML = '';
    
    // 重置进度条
    progressContainer.style.display = 'none';
    progressFill.style.width = '0%';
    
    // 重置消息
    messageElement.style.display = 'none';
    
    // 禁用处理按钮
    processBtn.disabled = true;
    
    // 重置设置
    document.getElementById('resize-mode').value = 'dimensions';
    document.getElementById('width').value = '800';
    document.getElementById('height').value = '600';
    document.getElementById('scale-percentage').value = '50';
    document.getElementById('max-dimension').value = '1024';
    document.getElementById('maintain-aspect-ratio').value = 'true';
    document.getElementById('image-quality').value = '90';
    document.getElementById('output-format').value = 'same';
    
    // 更新调整模式
    updateResizeMode();
}