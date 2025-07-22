// ==UserScript==
// @name         视频音频下载器
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  在所有网站的视频和音频元素旁边添加下载按钮
// @author       dream10201
// @match        *://*/*
// @connect      *
// @grant        GM.xmlHttpRequest
// @run-at       document-end
// @grant        GM.setValue
// @grant        GM.getValue
// @downloadURL https://cdn.jsdelivr.net/gh/dream10201/yt-dlp-script@master/index.js
// @updateURL https://cdn.jsdelivr.net/gh/dream10201/yt-dlp-script@master/index.js
// @inject-into  content
// ==/UserScript==

(async function() {
    'use strict';
    const YT_DLP_WEB_URL=await GM.getValue("YT_DLP_WEB_URL",null);
    const PROXY_URL=await GM.getValue("PROXY_URL",null);
    
    let pageWindow;
    if (typeof unsafeWindow === 'undefined') {
        pageWindow = window;
    } else {
        pageWindow = unsafeWindow;
    }
    const yt_dlp_web_ui_token = pageWindow.localStorage.getItem('token');
    if(new URL(YT_DLP_WEB_URL).hostname == document.domain && null!=yt_dlp_web_ui_token && yt_dlp_web_ui_token.length>0){
        await GM.setValue('yt_dlp_web_ui_token', yt_dlp_web_ui_token);
    }
    const TOKEN=await GM.getValue("yt_dlp_web_ui_token",null);
    if(null == TOKEN){
        return;
    }

    const buttonStyle = `
        position: fixed !important;
        z-index: 999999 !important;
        background: #ff4444 !important;
        color: white !important;
        border: 1px solid white !important;
        padding: 2px 3px !important;
        border-radius: 5px !important;
        cursor: pointer !important;
        font-size: 12px !important;
        font-weight: bold !important;
        box-shadow: 0 4px 8px rgba(0,0,0,0.5) !important;
        transition: all 0.3s !important;
        pointer-events: auto !important;
        display: block !important;
        opacity: 0.9 !important;
    `;
    // 创建下载按钮
    async function createDownloadButton(mediaElement) {
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = '下载';
        downloadBtn.style.cssText = buttonStyle;


        const proxydBtn = document.createElement('button');
        proxydBtn.textContent = await GM.getValue(`${location.host}_PROXY`, false)?'✅':'☑️';
        proxydBtn.style.cssText = buttonStyle;

        // 计算按钮位置
        function updateButtonPosition() {
            const rect = mediaElement.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                downloadBtn.style.left = (rect.right - 80) + 'px';
                downloadBtn.style.top = (rect.top - 25) + 'px';
                downloadBtn.style.display = 'block';


                proxydBtn.style.left = (rect.right - 46) + 'px';
                proxydBtn.style.top = (rect.top - 25) + 'px';
                proxydBtn.style.display = 'block';
            } else {
                downloadBtn.style.display = 'none';
                proxydBtn.style.display = 'none';
            }
        }

        // 延迟初始定位，确保元素已完全渲染
        setTimeout(updateButtonPosition, 100);

        // 使用requestAnimationFrame确保平滑更新
        let animationId;
        function scheduleUpdate() {
            if (animationId) cancelAnimationFrame(animationId);
            animationId = requestAnimationFrame(updateButtonPosition);
        }

        // 监听滚动和resize事件，更新按钮位置
        window.addEventListener('scroll', scheduleUpdate);
        window.addEventListener('resize', scheduleUpdate);

        // 使用IntersectionObserver监听元素可见性变化
        const intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.target === mediaElement) {
                    scheduleUpdate();
                }
            });
        });
        intersectionObserver.observe(mediaElement);

        // 鼠标悬停效果
        downloadBtn.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#cc0000 !important';
            this.style.transform = 'scale(1.1)';
        });

        downloadBtn.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '#ff4444 !important';
            this.style.transform = 'scale(1)';
        });

        proxydBtn.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#cc0000 !important';
            this.style.transform = 'scale(1.1)';
        });

        proxydBtn.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '#ff4444 !important';
            this.style.transform = 'scale(1)';
        });

        proxydBtn.addEventListener('click', async function(e) {
            await GM.setValue(`${location.host}_PROXY`, !await GM.getValue(`${location.host}_PROXY`, false));
            proxydBtn.textContent = await GM.getValue(`${location.host}_PROXY`, false)?'✅':'☑️';
        });
        function updateDownloadButtonStyle(msg,ok){
            downloadBtn.textContent = msg;
            downloadBtn.style.backgroundColor = (ok?"#28a745":"#dc3545") + " !important";
            setTimeout(() => {
                downloadBtn.textContent = '下载';
                downloadBtn.style.backgroundColor = '#ff4444 !important';
            }, 2000);
        }

        downloadBtn.addEventListener('click',async function(e) {
            e.preventDefault();
            e.stopPropagation();
            let src = mediaElement.src || mediaElement.currentSrc;
            if (!src || src.slice(0,4) != 'http') {
                const sourceElements = mediaElement.querySelectorAll('source');
                if (sourceElements.length == 0 || !src || src.slice(0,4) != 'http') {
                    updateDownloadButtonStyle('🆖',false);
                    return;
                }
                src = sourceElements[0].src;
            }
            if (src) {
                let downloadUrl=`${YT_DLP_WEB_URL}/api/v1/exec?token=${TOKEN}`;
                const proxy = (await GM.getValue(`${location.host}_PROXY`, false)?PROXY_URL:"");
                const params=[
                    "--add-headers",`User-Agent:${navigator.userAgent}`,
                    "--yes-playlist",
                    "--buffer-size", "64K",
                    "--resize-buffer",
                    // 不覆盖任何文件
                    "-w",
                    // 断点续传
                    "-c",
                    '--no-mtime',
                    "--cache-dir","/tmp",
                    "--merge-output-format","mp4/mkv/mov/flv/webm/avi",
                    "-f","bestvideo*+bestaudio/best"
                ];
                let CK=document.cookie;
                if(CK.length >0){
                    params.push("--add-headers");
                    params.push( `Cookie:${CK}`);
                }
                if(proxy.length >0){
                    params.push("--proxy");
                    params.push( proxy);
                }
                // 发送GET请求
                GM.xmlHttpRequest({
                    method: 'POST',
                    url: downloadUrl,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data:JSON.stringify({"url":src,"params":params,"rename":"%(title)s-%(duration)s.%(ext)s"}),
                    responseType:'json',
                    onload: function(response) {
                        let msg = '👌';
                        if(response.status!=200){
                            console.log('下载请求已发送:', downloadUrl);
                            console.log('响应状态:', response.status);
                            console.log(response);
                            msg = response.responseText;
                        }
                        updateDownloadButtonStyle(msg,true);
                    },
                    onerror: function(error) {
                        console.error('请求失败:', error);
                        updateDownloadButtonStyle('失败',false);
                    }
                });
            } else {
                alert('无法获取媒体文件的URL');
            }
        });

        const uuid=crypto.randomUUID();
        downloadBtn.setAttribute('data-download-uuid', uuid);
        proxydBtn.setAttribute('data-download-uuid', uuid);
        return [downloadBtn,proxydBtn];
    }

    // 为媒体元素添加下载按钮
    async function addDownloadButton(mediaElement) {
        // 检查是否已经添加过按钮
        if (mediaElement.hasAttribute('data-download-uuid')) {
            const allButtons = document.querySelectorAll('button.media-download-button');
            let flag=false;
            for(let i=0;i<allButtons.length;i++){
                if(mediaElement.getAttribute('data-download-uuid') == allButtons[i].getAttribute('data-download-uuid')){
                    flag = true;
                    break;
                }
            }
            if(flag){
                return;
            }
        }


        const button = await createDownloadButton(mediaElement);
        button[0].className = 'media-download-button';
        // 标记已添加按钮
        mediaElement.setAttribute('data-download-uuid', button[0].getAttribute('data-download-uuid'));

        // 将按钮添加到body中（而不是媒体元素中）
        document.body.appendChild(button[0]);
        document.body.appendChild(button[1]);

        // 当媒体元素被移除时，也移除对应的按钮
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.removedNodes.forEach(function(node) {
                    if (node === mediaElement) {
                        button[0].remove();
                        button[1].remove();
                        observer.disconnect();
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 添加调试信息
        //console.log('添加下载按钮:', mediaElement.tagName, mediaElement.src || mediaElement.currentSrc);
    }

    // 查找并处理所有视频和音频元素
    function processMediaElements() {
        // 查找所有video和audio元素
        const videoElements = document.querySelectorAll('video');
        const audioElements = document.querySelectorAll('audio');

        //console.log('找到视频元素:', videoElements.length);
        //console.log('找到音频元素:', audioElements.length);
        // 为每个视频元素添加下载按钮
        videoElements.forEach(video => {
            addDownloadButton(video);
        });

        // 为每个音频元素添加下载按钮
        audioElements.forEach(audio => {
            addDownloadButton(audio);
        });
    }

    // 初始处理
    setTimeout(processMediaElements, 100);

    // 使用MutationObserver监听DOM变化，处理动态加载的媒体元素
    const observer = new MutationObserver(function(mutations) {
        let shouldProcess = false;

        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // 元素节点
                        // 检查新添加的节点是否是视频或音频
                        if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') {
                            setTimeout(() => addDownloadButton(node), 50);
                        }

                        // 检查新添加的节点内部是否包含视频或音频
                        const videos = node.querySelectorAll ? node.querySelectorAll('video') : [];
                        const audios = node.querySelectorAll ? node.querySelectorAll('audio') : [];

                        if (videos.length > 0 || audios.length > 0) {
                            shouldProcess = true;
                        }
                    }
                });
            }
        });

        if (shouldProcess) {
            setTimeout(processMediaElements, 100);
        }
    });

    // 开始监听
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 页面加载完成后再次处理（防止遗漏）
    window.addEventListener('load', function() {
        setTimeout(processMediaElements, 500);
    });

    // 页面完全加载后再次处理
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(processMediaElements, 200);
    });

    // 定期检查是否有新的媒体元素
    setInterval(processMediaElements, 3000);

})();
