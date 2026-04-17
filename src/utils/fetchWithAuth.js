import store from '@/store'
import { ElMessage } from 'element-plus'
import router from '@/router'

let isRedirecting = false;

export default async function fetchWithAuth(url, options = {}) {
    // 开发环境下添加 /api 前缀
    url = process.env.NODE_ENV === 'production' ? url : `/api${url}`;

    // 确保包含凭据（HttpOnly Cookie 会自动携带）
    options.credentials = 'include';

    options.headers = {
        ...options.headers,
    };

    const response = await fetch(url, options);

    if (response.status === 401 && !isRedirecting) {
        isRedirecting = true;
        store.commit('setAdminLoggedIn', false);
        ElMessage.error('认证状态错误，请重新登录');
        router.push('/adminLogin').finally(() => {
            isRedirecting = false;
        });
    }

    return response;
}
