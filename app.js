// ============================================
// الحالة العامة
// ============================================
let currentActivity = 1;
let completedActivities = { 1: false, 2: false, 3: false };
let activeDrag = null;
let audioCtx = null;

// ============================================
// مكوّن السحب (A-Frame Component)
// ============================================
AFRAME.registerComponent('drag-move', {
    init: function () {
        this.isDragging = false;
        this.plane = new THREE.Plane();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.intersection = new THREE.Vector3();
        this.offset = new THREE.Vector3();
        this.startPos = new THREE.Vector3();
        this.cameraEl = document.querySelector('[camera]');
        
        const self = this;
        this.el.sceneEl.addEventListener('renderstart', () => {
            const canvas = self.el.sceneEl.canvas;
            canvas.addEventListener('mousedown', (e) => self.onDown(e));
            canvas.addEventListener('touchstart', (e) => self.onDown(e), { passive: false });
            window.addEventListener('mousemove', (e) => self.onMove(e));
            window.addEventListener('touchmove', (e) => self.onMove(e), { passive: false });
            window.addEventListener('mouseup', (e) => self.onUp(e));
            window.addEventListener('touchend', (e) => self.onUp(e));
        });
    },
    
    onDown: function(evt) {
        if (this.isDragging || activeDrag) return;
        const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
        const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
        this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
        
        this.cameraEl = document.querySelector('[camera]');
        this.raycaster.setFromCamera(this.mouse, this.cameraEl.components.camera.camera);
        const intersects = this.raycaster.intersectObject(this.el.object3D, true);
        
        if (intersects.length > 0) {
            evt.preventDefault(); evt.stopPropagation();
            this.isDragging = true; activeDrag = this;
            
            const rig = document.getElementById('camera-rig');
            if (rig && rig.components['look-controls']) rig.components['look-controls'].enabled = false;
            
            const cameraDir = new THREE.Vector3();
            this.cameraEl.object3D.getWorldDirection(cameraDir);
            const objPos = new THREE.Vector3();
            this.el.object3D.getWorldPosition(objPos);
            this.startPos.copy(this.el.object3D.position);
            this.plane.setFromNormalAndCoplanarPoint(cameraDir, objPos);
            this.raycaster.ray.intersectPlane(this.plane, this.intersection);
            this.offset.copy(objPos).sub(this.intersection);
            
            this.el.setAttribute('material', 'emissiveIntensity', '2');
            playSound(440, 0.05);
        }
    },
    
    onMove: function(evt) {
        if (!this.isDragging) return;
        evt.preventDefault();
        const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
        const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
        this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.cameraEl.components.camera.camera);
        this.raycaster.ray.intersectPlane(this.plane, this.intersection);
        const newWorldPos = this.intersection.clone().add(this.offset);
        const localPos = this.el.object3D.parent.worldToLocal(newWorldPos.clone());
        this.el.object3D.position.copy(localPos);
    },
    
    onUp: function(evt) {
        if (!this.isDragging) return;
        this.isDragging = false; activeDrag = null;
        const rig = document.getElementById('camera-rig');
        if (rig && rig.components['look-controls']) rig.components['look-controls'].enabled = true;
        this.el.setAttribute('material', 'emissiveIntensity', '1.2');
        checkDrop(this.el, this.startPos);
    }
});

// ============================================
// محرك الصوت
// ============================================
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playSound(freq, dur, type = 'sine') {
    try {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + dur);
    } catch(e) {}
}
function playSuccessSound() {
    playSound(523, 0.15); setTimeout(() => playSound(659, 0.15), 100); setTimeout(() => playSound(784, 0.3), 200);
}
function playErrorSound() { playSound(220, 0.2, 'sawtooth'); }

// ============================================
// بيانات الأنشطة
// ============================================
const activityData = {
    1: {
        title: 'إلكترونات التكافؤ',
        desc: 'اسحب الإلكترون المتوهج الموجود في الطبقة الخارجية لذرة الصوديوم إلى الصندوق المخصص.',
        tip: 'إلكترون التكافؤ هو الإلكترون الموجود في الطبقة الأخيرة من الذرة، وهو المسؤول عن تكوين الروابط.',
        successMsg: 'لقد حددت إلكترون التكافؤ لذرة الصوديوم!',
        successDetail: 'تحتوي ذرة الصوديوم (Na) على إلكترون واحد في طبقتها الخارجية (طبقة التكافؤ)، وهذا الإلكترون هو الذي يشارك في تكوين الروابط الكيميائية.'
    },
    2: {
        title: 'الرابطة الأيونية',
        desc: 'اسحب إلكترون التكافؤ من ذرة الصوديوم (Na) إلى الحلقة الخضراء عند ذرة الكلور (Cl).',
        tip: 'في الرابطة الأيونية، ينتقل إلكترون من ذرة إلى أخرى، فيتكون أيون موجب وأيون سالب.',
        successMsg: 'تم تكوين الرابطة الأيونية بنجاح!',
        successDetail: 'انتقل الإلكترون من ذرة الصوديوم (Na) إلى ذرة الكلور (Cl). أصبح الصوديوم أيوناً موجباً (Na⁺) لأنه فقد إلكتروناً، وأصبح الكلور أيوناً سالباً (Cl⁻) لأنه اكتسب إلكتروناً.'
    },
    3: {
        title: 'الرابطة التساهمية',
        desc: 'اسحب إلكتروناً من كل ذرة هيدروجين (H) إلى المنطقة الخضراء في المنتصف.',
        tip: 'في الرابطة التساهمية، تشترك الذرات في الإلكترونات لتكوين رابطة بينها.',
        successMsg: 'تم تكوين الرابطة التساهمية بنجاح!',
        successDetail: 'شاركت ذرتا الهيدروجين (H) بإلكتروناتهما في المنطقة المشتركة بينهما، لتكوين رابطة تساهمية. هذا هو نفس النوع من الروابط في جزيء الهيدروجين (H₂).'
    }
};

// ============================================
// التنقل
// ============================================
function startLab() {
    initAudio();
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    setTimeout(() => {
        const scene = document.getElementById('ar-scene');
        if (scene) scene.resize();
    }, 100);
}

function backToWelcome() {
    document.getElementById('main-app').classList.add('hidden');
    document.getElementById('welcome-screen').classList.remove('hidden');
}

function switchActivity(num) {
    if (num === currentActivity) return;
    [1, 2, 3].forEach(n => {
        document.getElementById(`activity-${n}`).setAttribute('visible', n === num ? 'true' : 'false');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', parseInt(tab.dataset.activity) === num);
    });
    const data = activityData[num];
    document.getElementById('instr-title').textContent = data.title;
    document.getElementById('instr-desc').textContent = data.desc;
    document.getElementById('instr-tip').textContent = data.tip;
    document.getElementById('activity-indicator').textContent = `النشاط ${num} من 3`;
    document.getElementById('prev-btn').disabled = num === 1;
    document.getElementById('next-btn').disabled = num === 3;
    currentActivity = num;
    playSound(600, 0.08);
}

function nextActivity() { if (currentActivity < 3) switchActivity(currentActivity + 1); }
function prevActivity() { if (currentActivity > 1) switchActivity(currentActivity - 1); }

function resetActivity() {
    const activityEl = document.getElementById(`activity-${currentActivity}`);
    if (!activityEl) return;
    activityEl.querySelectorAll('[data-electron]').forEach(el => {
        if (!el.components['drag-move']) el.setAttribute('drag-move', '');
        el.removeAttribute('data-placed');
        el.setAttribute('position', el.dataset.initialPos);
        el.setAttribute('scale', '1 1 1');
        el.setAttribute('animation', 'property: scale; to: 1.3 1.3 1.3; dir: alternate; dur: 1000; loop: true');
    });
    if (currentActivity === 2) {
        const naLabel = document.getElementById('na-label');
        const clLabel = document.getElementById('cl-label');
        if (naLabel) naLabel.setAttribute('value', 'Na');
        if (clLabel) clLabel.setAttribute('value', 'Cl');
    }
    playSound(500, 0.1);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(e => {});
    else document.exitFullscreen();
}

// ============================================
// منطق الإفلات
// ============================================
function checkDrop(electronEl, startPos) {
    const activity = parseInt(electronEl.dataset.activity);
    const dropzone = document.getElementById(`dropzone-${activity}`);
    if (!dropzone) return;
    
    const ePos = new THREE.Vector3();
    const dPos = new THREE.Vector3();
    electronEl.object3D.getWorldPosition(ePos);
    dropzone.object3D.getWorldPosition(dPos);
    
    if (ePos.distanceTo(dPos) < 1.3) handleSuccess(electronEl, dropzone, activity);
    else { electronEl.object3D.position.copy(startPos); playErrorSound(); }
}

function handleSuccess(electronEl, dropzone, activity) {
    if (electronEl.hasAttribute('data-placed')) return;
    
    if (activity === 1 || activity === 2) {
        placeElectron(electronEl, dropzone);
        showSuccess(activity);
        markComplete(activity);
    } else if (activity === 3) {
        const offset = electronEl.dataset.electron === 'h1-electron' ? -0.2 : 0.2;
        placeElectron(electronEl, dropzone, offset);
        electronEl.setAttribute('data-placed', 'true');
        const activityEl = document.getElementById('activity-3');
        const placedCount = activityEl.querySelectorAll('[data-placed="true"]').length;
        if (placedCount === 2) { showSuccess(activity); markComplete(activity); }
        else playSound(600, 0.1);
    }
}

function placeElectron(electronEl, dropzone, offsetX = 0) {
    electronEl.removeAttribute('drag-move');
    electronEl.setAttribute('animation', 'property: scale; to: 1 1 1; dur: 300');
    const dPos = new THREE.Vector3();
    dropzone.object3D.getWorldPosition(dPos);
    const localPos = electronEl.object3D.parent.worldToLocal(dPos.clone());
    localPos.x += offsetX;
    electronEl.object3D.position.copy(localPos);
}

function showSuccess(activity) {
    playSuccessSound();
    const data = activityData[activity];
    document.getElementById('success-message').textContent = data.successMsg;
    document.getElementById('success-detail').textContent = data.successDetail;
    document.getElementById('success-modal').classList.remove('hidden');
    if (activity === 2) {
        document.getElementById('na-label').setAttribute('value', 'Na⁺');
        document.getElementById('cl-label').setAttribute('value', 'Cl⁻');
    }
}

function markComplete(activity) {
    completedActivities[activity] = true;
    document.querySelector(`.tab[data-activity="${activity}"]`).classList.add('completed');
    const total = Object.values(completedActivities).filter(Boolean).length;
    document.getElementById('progress-fill').style.width = (total / 3 * 100) + '%';
    document.getElementById('progress-text').textContent = `${total} / 3`;
    if (total === 3) setTimeout(showCompletion, 1500);
}

function closeSuccessAndContinue() {
    document.getElementById('success-modal').classList.add('hidden');
    if (currentActivity < 3) setTimeout(nextActivity, 300);
}
function closeSuccessAndStay() { document.getElementById('success-modal').classList.add('hidden'); }
function showCompletion() { document.getElementById('completion-modal').classList.remove('hidden'); }
function restartAll() { window.location.reload(); }

// ============================================
// المساعدة
// ============================================
function showHelp() { document.getElementById('help-modal').classList.remove('hidden'); }
function closeHelp() { document.getElementById('help-modal').classList.add('hidden'); }

// ============================================
// التهيئة
// ============================================
window.addEventListener('load', () => {
    setTimeout(() => document.getElementById('loading-screen').classList.add('hidden'), 800);
    
    // توليد رمز QR تلقائياً
    try {
        if (window.location.href.startsWith('http')) {
            new QRCode(document.getElementById('qrcode'), {
                text: window.location.href,
                width: 140, height: 140,
                colorDark: "#0d6b5d", colorLight: "#ffffff"
            });
        }
    } catch(e) {}
    
    window.addEventListener('resize', () => {
        const scene = document.getElementById('ar-scene');
        if (scene) scene.resize();
    });
});

document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'CANVAS') e.preventDefault();
});