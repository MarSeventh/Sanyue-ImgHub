// 文件管理器工具类
class FileManager {
    constructor() {
        this.FILE_LIST_PATH = 'data/fileList.json';
    }

    // 从本地存储读取文件列表
    getLocalFileList() {
        try {
            const fileList = localStorage.getItem(this.FILE_LIST_PATH);
            return fileList ? JSON.parse(fileList) : [];
        } catch (error) {
            console.error('Error reading local file list:', error);
            return [];
        }
    }

    // 保存文件列表到本地存储
    saveFileList(fileList) {
        try {
            localStorage.setItem(this.FILE_LIST_PATH, JSON.stringify(fileList));
            return true;
        } catch (error) {
            console.error('Error saving file list:', error);
            return false;
        }
    }

    // 添加新文件到列表
    addFile(newFile) {
        try {
            const fileList = this.getLocalFileList();
            fileList.push(newFile);
            return this.saveFileList(fileList);
        } catch (error) {
            console.error('Error adding file:', error);
            return false;
        }
    }

    // 从列表中删除文件
    removeFile(fileName) {
        try {
            let fileList = this.getLocalFileList();
            fileList = fileList.filter(file => file.name !== fileName);
            return this.saveFileList(fileList);
        } catch (error) {
            console.error('Error removing file:', error);
            return false;
        }
    }

    // 更新文件列表
    async refreshFileList(fetchWithAuth) {
        try {
            const response = await fetchWithAuth('/api/manage/list?count=60', { method: 'GET' });
            const newFileList = await response.json();
            return this.saveFileList(newFileList);
        } catch (error) {
            console.error('Error refreshing file list:', error);
            return false;
        }
    }
}

export const fileManager = new FileManager(); 