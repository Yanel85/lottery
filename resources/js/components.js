// 管理页面组件
const ManagePage = {
    template: '#manage-template',
    data() {
        return {
            nameFilter: '',
            telFilter: '',
            lotteryNumber: StudentManager.getLotteryNumber(),
            selectedStudents: [],
            selectAll: false
        };
    },
    computed: {
        filteredStudents() {
            const nameFilter = this.nameFilter.toLowerCase();
            const telFilter = this.telFilter;
            
            return StudentManager.getAllStudents().filter(student => {
                const nameMatch = student.name.toLowerCase().includes(nameFilter);
                const telMatch = student.telephone.includes(telFilter);
                return nameMatch && telMatch;
            });
        }
    },
    methods: {
        clearFilters() {
            this.nameFilter = '';
            this.telFilter = '';
        },
        toggleSelectAll() {
            if (this.selectAll) {
                this.selectedStudents = this.filteredStudents.map(s => s.idCard);
            } else {
                this.selectedStudents = [];
            }
        },
        setLotteryNumber() {
            const number = this.lotteryNumber || 0;
            if (number > 0) {
                StudentManager.setLotteryNumber(number);
                alert(`摇号人数已设置为: ${number} 人`);
            } else {
                alert('请输入有效的摇号人数');
            }
        },
        deleteSelectedStudents() {
            if (this.selectedStudents.length === 0) {
                alert('请先选择要删除的学生');
                return;
            }

            if (confirm(`确定要删除选中的 ${this.selectedStudents.length} 个学生吗？`)) {
                const deleted = StudentManager.deleteStudents(this.selectedStudents);
                this.selectAll = false;
                this.selectedStudents = [];
                //给联系电话筛选框添加过滤条件，然后clearFilters
                this.telFilter = '0000';
                this.clearFilters();
            }
        },
        importExcel() {
            const fileInput = this.$refs.excelFile;
            if (!fileInput.files.length) {
                alert('请选择Excel文件');
                return;
            }

            const file = fileInput.files[0];
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    // 获取第一个工作表
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    // 处理导入数据 - 根据新模板格式
                    const importedStudents = jsonData.map(row => {
                        return {
                            idCard: row['编号'] || '',
                            name: row['姓名'] || '',
                            gender: row['性别'] || '',
                            telephone: row['联系电话'] || ''
                        };
                    }).filter(student => student.name && student.telephone);

                    if (importedStudents.length === 0) {
                        alert('没有找到有效的学生数据');
                        return;
                    }
                    // 校验重复数据
                    const validationErrors = StudentManager.checkDuplicates(importedStudents);

                    if (validationErrors.length > 0) {
                        // 显示错误信息
                        this.$root.validationErrors = validationErrors;
                        this.$root.showValidationModal = true;
                    }  else {
                        // 导入数据
                        const added = StudentManager.addStudents(importedStudents);
                        alert(`成功导入 ${importedStudents.length} 条学生记录`);
                        fileInput.value = ''; // 清空文件输入
                        this.telFilter = '0000';
                        this.clearFilters();
                    }
                } catch (error) {
                    console.error('导入Excel出错:', error);
                    alert('导入Excel出错: ' + error.message);
                }
            };

            reader.readAsArrayBuffer(file);
        },
        downloadTemplate() {
            // 创建工作簿
            const wb = XLSX.utils.book_new();
            
            // 创建工作表数据
            const wsData = [
                ['编号', '姓名', '性别', '联系电话'],
                ['001', '张三', '男', '13800138000'],
                ['002', '李四', '女', '13900139000']
            ];
            
            // 创建工作表
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            
            // 将工作表添加到工作簿
            XLSX.utils.book_append_sheet(wb, ws, '学生信息');
            
            // 生成Excel文件并下载
            XLSX.writeFile(wb, '学生信息导入模板.xlsx');
        }
    }
};

// 摇号页面组件
const LotteryPage = {
    template: '#lottery-template',
    data() {
        return {
            lotteryNumber: StudentManager.getLotteryNumber(),
            lotteryResults: StudentManager.getLotteryResults(),
            lotteryCount: StudentManager.getLotteryCount(),
            isLotteryRunning: false,
            lotteryInterval: null,
            currentStudents: [],
            lotterySpeed: 100, // 摇号速度（毫秒）
            lotteryStatus: '已摇号',
            tempResults: [] // 临时结果，用于动画显示
        };
    },
    computed: {
        formattedDate() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hour = String(now.getHours()).padStart(2, '0');
            const minute = String(now.getMinutes()).padStart(2, '0');
            return `${year}年${month}月${day}日 ${hour}点${minute}分`;
        },
        startButtonText() {
            if (this.lotteryCount >= 3) {
                return '摇号已结束';
            }
            return this.isLotteryRunning ? '摇号中...' : '开始摇号';
        }
    },
    methods: {
        startLottery() {
            if (this.isLotteryRunning || this.lotteryCount >= 3) {
                return;
            }

            const allStudents = StudentManager.getAllStudents();
            if (allStudents.length === 0) {
                alert('没有学生数据，请先导入学生信息');
                return;
            }

            if (this.lotteryNumber <= 0) {
                alert('请先设置摇号人数');
                return;
            }

            if (this.lotteryNumber > allStudents.length) {
                alert(`摇号人数(${this.lotteryNumber})不能大于学生总数(${allStudents.length})`);
                return;
            }

            this.isLotteryRunning = true;
            this.currentStudents = [...allStudents];
            
            // 初始化临时结果
            this.tempResults = [];
            
            // 开始摇号动画 - 使用Fisher-Yates洗牌算法显示临时结果
            this.lotteryInterval = setInterval(() => {
                // 使用Fisher-Yates洗牌算法
                const shuffled = [...this.currentStudents];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                // 取前lotteryNumber个作为临时结果
                this.tempResults = shuffled.slice(0, this.lotteryNumber);
            }, this.lotterySpeed);
        },

        stopLottery() {
            if (!this.isLotteryRunning) {
                return;
            }
            this.isLotteryRunning = false;
            // 直接使用当前的tempResults作为最终结果
            this.lotteryResults = [...this.tempResults];
            StudentManager.saveLotteryResults(this.lotteryResults);

            clearInterval(this.lotteryInterval);
            
            // 增加摇号次数
            this.lotteryCount = StudentManager.incrementLotteryCount();
        },
        resetLottery() {
            if (confirm('确定要重置摇号结果吗？这将清除所有摇号记录。')) {
                this.lotteryResults = [];
                this.lotteryCount = StudentManager.resetLottery();
            }
        },
        printResults() {
            window.print();
        },
        exportResults() {
            // 创建工作簿
            const wb = XLSX.utils.book_new();
            
            // 准备数据
            const wsData = [
                ['序号', '编号', '姓名', '性别', '联系电话']
            ];
            
            this.lotteryResults.forEach((student, index) => {
                wsData.push([
                    index + 1,
                    student.idCard || '',
                    student.name || '',
                    student.gender || '',
                    student.telephone || ''
                ]);
            });
            
            // 创建工作表
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            
            // 将工作表添加到工作簿
            XLSX.utils.book_append_sheet(wb, ws, `第${this.lotteryCount}次摇号结果`); 


            // 生成Excel文件并下载
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            XLSX.writeFile(wb, `第${this.lotteryCount}次摇号结果_${dateStr}.xlsx`);
        }
    }
};