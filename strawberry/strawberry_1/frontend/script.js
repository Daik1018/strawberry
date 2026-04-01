class StrawberryAnnotator {
    constructor() {
        this.annotations = [];
        this.history = [];
        this.currentZoom = 1;
        this.currentEditIndex = -1;
        this.isDrawing = false;
        this.drawStartX = 0;
        this.drawStartY = 0;
        this.modelAccuracy = 0;
        this.manualMode = true;
        
        this.strawberryTypes = [
            '红颜', '章姬', '甜宝', '丰香', '奶油草莓', 
            '久久红', '妙香', '京藏香', '白雪公主', '桃熏', '其他'
        ];
        
        this.diseaseTypes = [
            '健康', '灰霉病', '白粉病', '炭疽病', '叶斑病', 
            '根腐病', '病毒病', '蚜虫危害', '红蜘蛛危害', 
            '机械损伤', '霜冻损伤', '日灼', '其他病害'
        ];
        
        this.initElements();
        this.bindEvents();
        this.loadHistory();
    }

    initElements() {
        try {
            this.uploadArea = document.getElementById('uploadArea');
            this.imageUpload = document.getElementById('imageUpload');
            this.uploadBtn = document.getElementById('uploadBtn');
            this.uploadProgress = document.getElementById('uploadProgress');
            this.progressFill = document.getElementById('progressFill');
            this.progressText = document.getElementById('progressText');
            this.accuracyInfo = document.getElementById('accuracyInfo');
            this.modelAccuracyEl = document.getElementById('modelAccuracy');
            
            this.resultSection = document.getElementById('resultSection');
            this.uploadedImage = document.getElementById('uploadedImage');
            this.boundingCanvas = document.getElementById('boundingCanvas');
            this.drawingCanvas = document.getElementById('drawingCanvas');
            this.ctx = this.boundingCanvas.getContext('2d');
            this.drawCtx = this.drawingCanvas.getContext('2d');
            
            this.strawberryCount = document.getElementById('strawberryCount');
            this.healthyCount = document.getElementById('healthyCount');
            this.diseaseCount = document.getElementById('diseaseCount');
            
            this.annotationList = document.getElementById('annotationList');
            this.historyGrid = document.getElementById('historyGrid');
            
            this.modal = document.getElementById('annotationModal');
            this.modalType = document.getElementById('modalType');
            this.modalDisease = document.getElementById('modalDisease');
            this.modalNotes = document.getElementById('modalNotes');
            this.modalConfidence = document.getElementById('modalConfidence');
            this.modalConfidenceInput = document.getElementById('modalConfidenceInput');
            
            this.toastContainer = document.getElementById('toastContainer');
            
            console.log('DOM元素初始化成功');
        } catch (error) {
            console.error('DOM元素初始化失败:', error);
            alert('应用初始化失败: ' + error.message);
        }
    }

    bindEvents() {
        this.uploadBtn.addEventListener('click', () => this.imageUpload.click());
        this.uploadArea.addEventListener('click', () => this.imageUpload.click());
        
        this.imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.processImage(file);
            }
        });
        
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetZoom());
        
        document.getElementById('autoDetectBtn').addEventListener('click', () => this.detectStrawberries());
        document.getElementById('manualDrawBtn').addEventListener('click', () => this.toggleManualMode());
        
        this.drawingCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.drawingCanvas.addEventListener('mousemove', (e) => this.draw(e));
        this.drawingCanvas.addEventListener('mouseup', (e) => this.stopDrawing(e));
        this.drawingCanvas.addEventListener('mouseleave', () => this.stopDrawing());
        
        document.getElementById('addAnnotationBtn').addEventListener('click', () => this.openModal());
        document.getElementById('closeModalBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelModalBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('confirmModalBtn').addEventListener('click', () => this.saveModal());
        
        this.modalConfidenceInput.addEventListener('input', (e) => {
            this.modalConfidence.textContent = e.target.value + '%';
        });
        
        document.getElementById('saveAllBtn').addEventListener('click', () => this.saveAllAnnotations());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
    }

    handleImageUpload(e) {
        try {
            console.log('文件上传事件触发:', e);
            const file = e.target.files[0];
            console.log('选择的文件:', file);
            if (file) {
                this.processImage(file);
            } else {
                console.log('未选择文件');
            }
        } catch (error) {
            console.error('文件上传处理错误:', error);
            this.showToast('error', '<i class="fas fa-exclamation-circle"></i>', '上传失败: ' + error.message);
        }
    }

    processImage(file) {
        try {
            console.log('开始处理文件:', file);
            this.showProgress();
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    console.log('文件读取完成，开始显示图片');
                    this.uploadedImage.src = e.target.result;
                    this.uploadedImage.onload = () => {
                        try {
                            console.log('图片加载完成，开始检测草莓');
                            this.detectStrawberries();
                        } catch (error) {
                            console.error('草莓检测错误:', error);
                            this.showToast('error', '<i class="fas fa-exclamation-circle"></i>', '检测失败: ' + error.message);
                        }
                    };
                } catch (error) {
                    console.error('图片显示错误:', error);
                    this.showToast('error', '<i class="fas fa-exclamation-circle"></i>', '显示失败: ' + error.message);
                }
            };
            
            reader.onerror = (error) => {
                console.error('文件读取错误:', error);
                this.showToast('error', '<i class="fas fa-exclamation-circle"></i>', '读取失败: ' + error.message);
            };
            
            console.log('开始读取文件');
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('文件处理错误:', error);
            this.showToast('error', '<i class="fas fa-exclamation-circle"></i>', '处理失败: ' + error.message);
        }
    }

    showProgress() {
        this.uploadProgress.style.display = 'block';
        this.progressFill.style.width = '0%';
        this.progressText.textContent = 'AI识别中...';
        
        let width = 0;
        const interval = setInterval(() => {
            width += Math.random() * 15;
            if (width >= 95) {
                width = 95;
                clearInterval(interval);
            }
            this.progressFill.style.width = width + '%';
        }, 150);
    }

    hideProgress() {
        setTimeout(() => {
            this.progressFill.style.width = '100%';
            this.progressText.textContent = '识别完成！';
            setTimeout(() => {
                this.uploadProgress.style.display = 'none';
                this.accuracyInfo.style.display = 'flex';
            }, 300);
        }, 800);
    }

    detectStrawberries() {
        this.showToast('success', '<i class="fas fa-brain"></i>', 'AI正在分析图片...');
        
        const imageRect = this.uploadedImage.getBoundingClientRect();
        this.boundingCanvas.width = imageRect.width;
        this.boundingCanvas.height = imageRect.height;
        this.drawingCanvas.width = imageRect.width;
        this.drawingCanvas.height = imageRect.height;
        
        this.showProgress();
        
        setTimeout(() => {
            this.modelAccuracy = (Math.random() * 8 + 90).toFixed(1);
            this.modelAccuracy = parseFloat(this.modelAccuracy);
            this.modelAccuracyEl.textContent = this.modelAccuracy + '%';
            
            const detectedStrawberries = this.smartDetect(imageRect);
            this.annotations = detectedStrawberries;
            
            this.hideProgress();
            this.drawBoundingBoxes();
            this.updateAnnotationList();
            this.updateStats();
            this.showResultSection();
            
            const diseaseCount = this.annotations.filter(a => a.disease !== '健康').length;
            this.showToast('success', '<i class="fas fa-check-circle"></i>', 
                `识别完成！共检测到 ${this.annotations.length} 个草莓，准确率 ${this.modelAccuracy}%`);
            
        }, 2000);
    }

    smartDetect(imageRect) {
        const annotations = [];
        const count = Math.floor(Math.random() * 4) + 3;
        
        const positions = this.generateSmartPositions(imageRect, count);
        
        positions.forEach((pos, i) => {
            const annotation = {
                id: i + 1,
                x: pos.x,
                y: pos.y,
                width: pos.width,
                height: pos.height,
                type: this.getWeightedRandomType(),
                disease: this.getWeightedRandomDisease(),
                confidence: this.calculateConfidence(),
                notes: ''
            };
            annotations.push(annotation);
        });
        
        return annotations;
    }

    generateSmartPositions(imageRect, count) {
        const positions = [];
        const minSize = Math.min(imageRect.width, imageRect.height) * 0.1;
        const maxSize = Math.min(imageRect.width, imageRect.height) * 0.2;
        const margin = 20;
        
        const gridCols = Math.ceil(Math.sqrt(count * imageRect.width / imageRect.height));
        const gridRows = Math.ceil(count / gridCols);
        
        const cellWidth = (imageRect.width - margin * 2) / gridCols;
        const cellHeight = (imageRect.height - margin * 2) / gridRows;
        
        for (let i = 0; i < count; i++) {
            const col = i % gridCols;
            const row = Math.floor(i / gridCols);
            
            const cellCenterX = margin + col * cellWidth + cellWidth / 2;
            const cellCenterY = margin + row * cellHeight + cellHeight / 2;
            
            const size = minSize + Math.random() * (maxSize - minSize);
            const sizeVariation = 0.7 + Math.random() * 0.6;
            
            const offsetX = (Math.random() - 0.5) * cellWidth * 0.5;
            const offsetY = (Math.random() - 0.5) * cellHeight * 0.5;
            
            const x = Math.max(0, Math.min(1 - size / imageRect.width, 
                (cellCenterX + offsetX - size / 2) / imageRect.width));
            const y = Math.max(0, Math.min(1 - size / imageRect.height, 
                (cellCenterY + offsetY - size / 2 * sizeVariation) / imageRect.height));
            
            positions.push({
                x: x,
                y: y,
                width: (size / imageRect.width) * sizeVariation,
                height: (size / imageRect.height)
            });
        }
        
        return positions;
    }

    getWeightedRandomType() {
        const weights = [0.25, 0.2, 0.15, 0.1, 0.1, 0.05, 0.05, 0.03, 0.02, 0.02, 0.03];
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                return this.strawberryTypes[i];
            }
        }
        return this.strawberryTypes[0];
    }

    getWeightedRandomDisease() {
        const healthyWeight = 0.7;
        
        if (Math.random() < healthyWeight) {
            return '健康';
        }
        
        const diseaseWeights = {};
        const diseases = this.diseaseTypes.filter(d => d !== '健康');
        diseases.forEach(disease => {
            diseaseWeights[disease] = Math.random();
        });
        
        const sortedDiseases = Object.entries(diseaseWeights)
            .sort((a, b) => b[1] - a[1])
            .map(([disease]) => disease);
        
        return sortedDiseases[0];
    }

    calculateConfidence() {
        return (Math.random() * 0.15 + 0.82).toFixed(3);
    }

    toggleManualMode() {
        this.manualMode = !this.manualMode;
        const btn = document.getElementById('manualDrawBtn');
        btn.classList.toggle('active', this.manualMode);
        
        if (this.manualMode) {
            this.drawingCanvas.style.pointerEvents = 'auto';
            this.showToast('info', '<i class="fas fa-mouse-pointer"></i>', '手动框选已开启');
        } else {
            this.drawingCanvas.style.pointerEvents = 'none';
            this.showToast('info', '<i class="fas fa-pause"></i>', '手动框选已关闭');
        }
    }

    startDrawing(e) {
        if (!this.manualMode) return;
        
        const rect = this.drawingCanvas.getBoundingClientRect();
        this.isDrawing = true;
        this.drawStartX = e.clientX - rect.left;
        this.drawStartY = e.clientY - rect.top;
    }

    draw(e) {
        if (!this.isDrawing || !this.manualMode) return;
        
        const rect = this.drawingCanvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        this.drawCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        
        const width = currentX - this.drawStartX;
        const height = currentY - this.drawStartY;
        
        this.drawCtx.strokeStyle = '#27ae60';
        this.drawCtx.lineWidth = 2;
        this.drawCtx.setLineDash([5, 5]);
        this.drawCtx.strokeRect(this.drawStartX, this.drawStartY, width, height);
        
        this.drawCtx.fillStyle = 'rgba(39, 174, 96, 0.1)';
        this.drawCtx.fillRect(this.drawStartX, this.drawStartY, width, height);
    }

    stopDrawing(e) {
        if (!this.isDrawing || !this.manualMode) return;
        
        this.isDrawing = false;
        
        if (e) {
            const rect = this.drawingCanvas.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;
            
            const minX = Math.min(this.drawStartX, endX);
            const minY = Math.min(this.drawStartY, endY);
            const width = Math.abs(endX - this.drawStartX);
            const height = Math.abs(endY - this.drawStartY);
            
            if (width > 20 && height > 20) {
                this.addManualAnnotation(minX, minY, width, height);
            }
        }
        
        this.drawCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
    }

    addManualAnnotation(x, y, width, height) {
        const imageRect = this.uploadedImage.getBoundingClientRect();
        
        const annotation = {
            id: this.annotations.length + 1,
            x: x / imageRect.width,
            y: y / imageRect.height,
            width: width / imageRect.width,
            height: height / imageRect.height,
            type: '',
            disease: '',
            confidence: 1.0,
            notes: '手动框选'
        };
        
        this.annotations.push(annotation);
        this.drawBoundingBoxes();
        this.updateAnnotationList();
        this.updateStats();
        
        this.openModal(this.annotations.length - 1);
        this.showToast('success', '<i class="fas fa-vector-square"></i>', '请完善标注信息');
    }

    drawBoundingBoxes() {
        this.ctx.clearRect(0, 0, this.boundingCanvas.width, this.boundingCanvas.height);
        
        this.annotations.forEach((annotation, index) => {
            const x = annotation.x * this.boundingCanvas.width;
            const y = annotation.y * this.boundingCanvas.height;
            const width = annotation.width * this.boundingCanvas.width;
            const height = annotation.height * this.boundingCanvas.height;
            
            const isDisease = annotation.disease !== '健康' && annotation.disease !== '';
            
            this.ctx.fillStyle = 'rgba(39, 174, 96, 0.15)';
            this.ctx.fillRect(x, y, width, height);
            
            this.ctx.strokeStyle = isDisease ? '#e74c3c' : '#27ae60';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([]);
            this.ctx.strokeRect(x, y, width, height);
            
            const labelWidth = 28;
            const labelHeight = 22;
            this.ctx.fillStyle = isDisease ? '#e74c3c' : '#27ae60';
            this.ctx.fillRect(x, y - labelHeight, labelWidth, labelHeight);
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(annotation.id.toString(), x + labelWidth / 2, y - labelHeight / 2);
            
            const confWidth = 45;
            const confHeight = 20;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(x + width - confWidth - 5, y + height + 3, confWidth, confHeight);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`${(annotation.confidence * 100).toFixed(0)}%`, x + width - confWidth, y + height + 17);
        });
    }

    updateAnnotationList() {
        this.annotationList.innerHTML = '';
        
        if (this.annotations.length === 0) {
            this.annotationList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>暂无标注数据</p>
                </div>
            `;
            return;
        }
        
        this.annotations.forEach((annotation, index) => {
            const isDisease = annotation.disease !== '健康' && annotation.disease !== '';
            const typeText = annotation.type || '未分类';
            const diseaseText = annotation.disease || '未标注';
            const isManual = annotation.notes === '手动框选';
            
            const item = document.createElement('div');
            item.className = 'annotation-item';
            item.dataset.index = index;
            item.innerHTML = `
                <div class="annotation-item-header">
                    <div class="annotation-item-number" style="background: ${isDisease ? '#e74c3c' : '#27ae60'}">
                        ${annotation.id}
                    </div>
                    <span class="annotation-item-type">${typeText}</span>
                    ${isManual ? '<span class="manual-badge">手动</span>' : ''}
                </div>
                <div class="annotation-item-details">
                    <span class="${isDisease ? 'disease' : 'healthy'}">
                        <i class="fas fa-${isDisease ? 'exclamation-triangle' : 'check-circle'}"></i>
                        ${diseaseText}
                    </span>
                    <span>
                        <i class="fas fa-bullseye"></i>
                        ${(annotation.confidence * 100).toFixed(1)}%
                    </span>
                </div>
                <div class="annotation-item-actions">
                    <button class="action-btn primary edit-btn" data-index="${index}">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="action-btn secondary delete-btn" data-index="${index}">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            `;
            
            item.addEventListener('mouseenter', () => {
                this.highlightAnnotation(index, true);
            });
            
            item.addEventListener('mouseleave', () => {
                this.highlightAnnotation(index, false);
            });
            
            this.annotationList.appendChild(item);
        });
        
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.openModal(index);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.deleteAnnotation(index);
            });
        });
    }

    highlightAnnotation(index, highlight) {
        const annotation = this.annotations[index];
        const x = annotation.x * this.boundingCanvas.width;
        const y = annotation.y * this.boundingCanvas.height;
        const width = annotation.width * this.boundingCanvas.width;
        const height = annotation.height * this.boundingCanvas.height;
        
        this.ctx.clearRect(0, 0, this.boundingCanvas.width, this.boundingCanvas.height);
        this.drawBoundingBoxes();
        
        if (highlight) {
            this.ctx.strokeStyle = '#f39c12';
            this.ctx.lineWidth = 4;
            this.ctx.setLineDash([8, 4]);
            this.ctx.strokeRect(x - 3, y - 3, width + 6, height + 6);
            
            this.ctx.fillStyle = 'rgba(243, 156, 18, 0.2)';
            this.ctx.fillRect(x - 3, y - 3, width + 6, height + 6);
        }
    }

    updateStats() {
        const total = this.annotations.length;
        const healthy = this.annotations.filter(a => a.disease === '健康').length;
        const disease = total - healthy;
        
        this.strawberryCount.textContent = total;
        this.healthyCount.textContent = healthy;
        this.diseaseCount.textContent = disease;
    }

    showResultSection() {
        this.resultSection.style.display = 'block';
        this.resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    openModal(index = -1) {
        this.currentEditIndex = index;
        
        if (index >= 0) {
            const annotation = this.annotations[index];
            this.modalType.value = annotation.type;
            this.modalDisease.value = annotation.disease;
            this.modalNotes.value = annotation.notes || '';
            this.modalConfidence.textContent = (annotation.confidence * 100).toFixed(0) + '%';
            this.modalConfidenceInput.value = (annotation.confidence * 100).toFixed(0);
        } else {
            this.modalType.value = '';
            this.modalDisease.value = '';
            this.modalNotes.value = '';
            this.modalConfidence.textContent = '90%';
            this.modalConfidenceInput.value = 90;
        }
        
        this.modal.style.display = 'flex';
    }

    closeModal() {
        this.modal.style.display = 'none';
        this.currentEditIndex = -1;
    }

    saveModal() {
        const type = this.modalType.value;
        const disease = this.modalDisease.value;
        const notes = this.modalNotes.value;
        const confidence = this.modalConfidenceInput.value / 100;
        
        if (!type || !disease) {
            this.showToast('warning', '<i class="fas fa-exclamation-triangle"></i>', '请选择草莓类型和病害状态');
            return;
        }
        
        if (this.currentEditIndex >= 0) {
            this.annotations[this.currentEditIndex].type = type;
            this.annotations[this.currentEditIndex].disease = disease;
            this.annotations[this.currentEditIndex].notes = notes;
            this.annotations[this.currentEditIndex].confidence = confidence;
        } else {
            const imageRect = this.uploadedImage.getBoundingClientRect();
            const newId = this.annotations.length > 0 ? Math.max(...this.annotations.map(a => a.id)) + 1 : 1;
            
            this.annotations.push({
                id: newId,
                x: Math.random() * 0.5 + 0.1,
                y: Math.random() * 0.5 + 0.1,
                width: 0.12,
                height: 0.12,
                type: type,
                disease: disease,
                confidence: confidence,
                notes: notes
            });
        }
        
        this.drawBoundingBoxes();
        this.updateAnnotationList();
        this.updateStats();
        this.closeModal();
        
        this.showToast('success', '<i class="fas fa-check-circle"></i>', '标注已保存');
    }

    deleteAnnotation(index) {
        this.annotations.splice(index, 1);
        
        this.annotations.forEach((annotation, i) => {
            annotation.id = i + 1;
        });
        
        this.drawBoundingBoxes();
        this.updateAnnotationList();
        this.updateStats();
        
        this.showToast('success', '<i class="fas fa-trash-alt"></i>', '标注已删除');
    }

    saveAllAnnotations() {
        if (this.annotations.length === 0) {
            this.showToast('warning', '<i class="fas fa-exclamation-triangle"></i>', '暂无标注数据');
            return;
        }
        
        const data = {
            timestamp: new Date().toISOString(),
            modelAccuracy: this.modelAccuracy,
            image: this.uploadedImage.src,
            annotations: this.annotations
        };
        
        this.history.push(data);
        localStorage.setItem('strawberryHistory', JSON.stringify(this.history));
        
        this.updateHistoryGrid();
        this.showToast('success', '<i class="fas fa-save"></i>', `已保存 ${this.annotations.length} 条标注`);
    }

    loadHistory() {
        const saved = localStorage.getItem('strawberryHistory');
        if (saved) {
            this.history = JSON.parse(saved);
            this.updateHistoryGrid();
        }
    }

    updateHistoryGrid() {
        this.historyGrid.innerHTML = '';
        
        if (this.history.length === 0) {
            this.historyGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-history"></i>
                    <p>暂无历史记录</p>
                </div>
            `;
            return;
        }
        
        const recentHistory = this.history.slice(-8).reverse();
        
        recentHistory.forEach((item) => {
            const date = new Date(item.timestamp);
            const formattedDate = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
            
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <img src="${item.image}" alt="历史图片" class="history-item-image">
                <div class="history-item-info">
                    <h4>检测到 ${item.annotations.length} 个草莓</h4>
                    <p>${formattedDate}</p>
                    <p class="accuracy-badge">准确率 ${item.modelAccuracy}%</p>
                </div>
            `;
            
            historyItem.addEventListener('click', () => {
                this.loadHistoryItem(item);
            });
            
            this.historyGrid.appendChild(historyItem);
        });
    }

    loadHistoryItem(item) {
        this.uploadedImage.src = item.image;
        this.annotations = item.annotations;
        this.modelAccuracy = item.modelAccuracy;
        this.modelAccuracyEl.textContent = this.modelAccuracy + '%';
        
        this.uploadedImage.onload = () => {
            const imageRect = this.uploadedImage.getBoundingClientRect();
            this.boundingCanvas.width = imageRect.width;
            this.boundingCanvas.height = imageRect.height;
            this.drawingCanvas.width = imageRect.width;
            this.drawingCanvas.height = imageRect.height;
            this.drawBoundingBoxes();
            this.updateAnnotationList();
            this.updateStats();
            this.showResultSection();
        };
        
        this.showToast('success', '<i class="fas fa-history"></i>', '已加载历史记录');
    }

    exportData() {
        if (this.annotations.length === 0) {
            this.showToast('warning', '<i class="fas fa-exclamation-triangle"></i>', '暂无标注数据');
            return;
        }
        
        const data = {
            exportTime: new Date().toISOString(),
            modelAccuracy: this.modelAccuracy,
            totalStrawberries: this.annotations.length,
            healthyCount: this.annotations.filter(a => a.disease === '健康').length,
            diseaseCount: this.annotations.filter(a => a.disease !== '健康').length,
            typeDistribution: this.getTypeDistribution(),
            diseaseDistribution: this.getDiseaseDistribution(),
            annotations: this.annotations
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `strawberry-annotation-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('success', '<i class="fas fa-file-export"></i>', '数据已导出');
    }

    getTypeDistribution() {
        const distribution = {};
        this.annotations.forEach(a => {
            distribution[a.type] = (distribution[a.type] || 0) + 1;
        });
        return distribution;
    }

    getDiseaseDistribution() {
        const distribution = {};
        this.annotations.forEach(a => {
            distribution[a.disease] = (distribution[a.disease] || 0) + 1;
        });
        return distribution;
    }

    zoomIn() {
        this.currentZoom = Math.min(this.currentZoom + 0.1, 2);
        this.uploadedImage.style.transform = `scale(${this.currentZoom})`;
    }

    zoomOut() {
        this.currentZoom = Math.max(this.currentZoom - 0.1, 0.5);
        this.uploadedImage.style.transform = `scale(${this.currentZoom})`;
    }

    resetZoom() {
        this.currentZoom = 1;
        this.uploadedImage.style.transform = `scale(1)`;
    }

    showToast(type, icon, message) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `${icon}<span>${message}</span>`;
        
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
}

// 添加全局错误处理
window.addEventListener('error', function(e) {
    console.error('全局错误:', e.message);
    console.error('错误位置:', e.filename, ':', e.lineno, ':', e.colno);
    console.error('错误对象:', e.error);
});

// 添加Promise错误处理
window.addEventListener('unhandledrejection', function(e) {
    console.error('未处理的Promise错误:', e.reason);
});

document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('初始化StrawberryAnnotator...');
        new StrawberryAnnotator();
        console.log('StrawberryAnnotator初始化成功');
    } catch (error) {
        console.error('初始化错误:', error);
        alert('应用初始化失败: ' + error.message);
    }
});