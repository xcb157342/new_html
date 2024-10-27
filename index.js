// 切换活动状态
function setActive(element) {
    // 移除所有链接的 active 类
    var links = document.querySelectorAll('.navbar a');
    links.forEach(link => link.classList.remove('active'));

    // 为点击的链接添加 active 类
    element.classList.add('active');
}

