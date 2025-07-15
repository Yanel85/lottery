// 路由配置
const routes = [
    { path: '/', redirect: '/manage' },
    { path: '/manage', component: ManagePage },
    { path: '/lottery', component: LotteryPage }
];

const router = new VueRouter({
    routes
});

// Vue实例
const app = new Vue({
    el: '#app',
    router,
    data: {
        showValidationModal: false,
        validationErrors: []
    },
    methods: {
        closeValidationModal() {
            this.showValidationModal = false;
            this.validationErrors = [];
        }
    }
});