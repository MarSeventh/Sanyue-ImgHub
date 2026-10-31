import { createSharedComposable, useTimestamp } from '@vueuse/core';

// 列表和详情共用时钟，让打开的页面也能及时更新到期状态
export const useExpiryClock = createSharedComposable(() => useTimestamp({ interval: 1000 }));
