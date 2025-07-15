// 数据存储和管理
const StudentManager = {
    STORAGE_KEY: "students",
    LOTTERY_NUMBER_KEY: "lotteryNumber",
    LOTTERY_RESULTS_KEY: "lotteryResults",
    LOTTERY_COUNT_KEY: "lotteryCount",

    // 获取所有学生
    getAllStudents() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    // 保存所有学生
    saveAllStudents(students) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(students));
    },

    // 添加学生
    addStudent(student) {
        const students = this.getAllStudents();
        students.push(student);
        this.saveAllStudents(students);
        return student;
    },

    // 批量添加学生
    addStudents(newStudents) {
        const students = this.getAllStudents();
        students.push(...newStudents);
        this.saveAllStudents(students);
    },

    // 删除学生
    deleteStudent(idCard) {
        let students = this.getAllStudents();
        students = students.filter(s => s.idCard !== idCard);
        this.saveAllStudents(students);
        return students;
    },

    // 批量删除学生
    deleteStudents(idCards) {
        let students = this.getAllStudents();
        students = students.filter(s => !idCards.includes(s.idCard));
        this.saveAllStudents(students);
        return students;
    },

    // 设置摇号人数
    setLotteryNumber(number) {
        localStorage.setItem(this.LOTTERY_NUMBER_KEY, number.toString());
    },

    // 获取摇号人数
    getLotteryNumber() {
        const number = localStorage.getItem(this.LOTTERY_NUMBER_KEY);
        return number ? parseInt(number) : 0;
    },

    // 获取摇号结果
    getLotteryResults() {
        const data = localStorage.getItem(this.LOTTERY_RESULTS_KEY);
        return data ? JSON.parse(data) : [];
    },

    // 保存摇号结果
    saveLotteryResults(results) {
        localStorage.setItem(this.LOTTERY_RESULTS_KEY, JSON.stringify(results));
    },

    // 增加摇号次数
    incrementLotteryCount() {
        const count = this.getLotteryCount() + 1;
        localStorage.setItem(this.LOTTERY_COUNT_KEY, count.toString());
        return count;
    },

    // 获取摇号次数
    getLotteryCount() {
        const count = localStorage.getItem(this.LOTTERY_COUNT_KEY);
        return count ? parseInt(count) : 0;
    },

    // 重置摇号
    resetLottery() {
        localStorage.removeItem(this.LOTTERY_RESULTS_KEY);
        localStorage.removeItem(this.LOTTERY_COUNT_KEY);
        return 0;
    },

    // 检查重复数据
    checkDuplicates(newStudents) {
        const existingStudents = this.getAllStudents();
        const errors = [];

        // 创建现有数据的索引
        const existingPhoneIndex = {};
        const existingIdCardIndex = {};

        existingStudents.forEach(student => {
            if (student.telephone) existingPhoneIndex[student.telephone] = true;
            if (student.idCard) existingIdCardIndex[student.idCard] = true;
        });

        // 检查新数据中的重复项
        const newPhoneIndex = {};
        const newIdCardIndex = {};

        newStudents.forEach((student, index) => {
            const rowNumber = index + 2; // Excel行号（标题行+1）
            const errorsForRow = [];
            
            // 校验电话号码的正确性
            if (!this.isValidPhoneNumber(student.telephone)) {
                errorsForRow.push(`第${rowNumber}行电话号码格式不正确`);
            }

            // 检查电话重复（系统中）
            if (student.telephone && existingPhoneIndex[student.telephone]) {
                errorsForRow.push(`电话 "${student.telephone}" 在系统中已存在`);
            }

            // 检查电话重复（本次导入中）
            if (student.telephone && newPhoneIndex[student.telephone]) {
                errorsForRow.push(`电话 "${student.telephone}" 在本次导入中重复`);
            }

            // 检查ID Card重复（系统中）
            if (student.idCard && existingIdCardIndex[student.idCard]) {
                errorsForRow.push(`编号 "${student.idCard}" 在系统中已存在`);
            }

            // 检查ID Card重复（本次导入中）
            if (student.idCard && newIdCardIndex[student.idCard]) {
                errorsForRow.push(`编号 "${student.idCard}" 在本次导入中重复`);
            }

            if (errorsForRow.length > 0) {
                errors.push({
                    row: rowNumber,
                    idCard: student.idCard || '',
                    name: student.name || '',
                    telephone: student.telephone || '',
                    messages: errorsForRow
                });
            }

            // 更新索引
            if (student.telephone) newPhoneIndex[student.telephone] = true;
            if (student.idCard) newIdCardIndex[student.idCard] = true;
        });

        return errors;
    },

    // 校验中国大陆手机号（以1开头，第二位3-9，11位数字）
    isValidPhoneNumber(phone) {
        return /^1[3-9]\d{9}$/.test(phone);
    }
};