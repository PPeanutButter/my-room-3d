/* First-person entry point. The orbit view and this page use the same ROOM_MODEL. */
(function() {
  'use strict';
  var canvas=document.getElementById('stage'),loading=document.getElementById('loading');
  try {
    var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight,false);
    renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    var model=ROOM_MODEL.create(renderer),scene=model.scene;
    // The inward-opening entry leaf otherwise obstructs the adjacent kitchen entrance.
    model.joinery.setDoorOpen('entry-door',false);
    var navigation=TOUR_NAVIGATION.create(model);
    var camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.045,80);camera.rotation.order='YXZ';
    // Close the shell overhead for the eye-level view, retaining the shared wall/furniture geometry.
    var ceilingShape=new THREE.Shape();model.outline.forEach(function(p,i){if(i)ceilingShape.lineTo(p[0],-p[1]);else ceilingShape.moveTo(p[0],-p[1]);});ceilingShape.closePath();
    var ceilingMaterial=new THREE.MeshStandardMaterial({color:0xe8e5dc,roughness:1,side:THREE.DoubleSide});ceilingMaterial.color.convertSRGBToLinear();
    var ceiling=new THREE.Mesh(new THREE.ShapeGeometry(ceilingShape),ceilingMaterial);ceiling.name='tour-ceiling';
    ceiling.rotation.x=-Math.PI/2;ceiling.position.set(-model.center.x,model.height,-model.center.z);scene.add(ceiling);
    scene.add(new THREE.AmbientLight(0xfff7e9,.22));model.refreshMirrors();
    var keys=new Set(),yaw=Math.PI,pitch=0,paused=false,lastTime=0,frame=0,lastMouse=null,lookPointer=null;
    var locations={
      start:[5.49,.55,2.78],living:[3.55,5.5,-Math.PI/2],dining:[4.65,2.5,Math.PI/2],
      master:[5.5,5.5,-Math.PI/2],bed2:[1.65,2.6,0],kitchen:[7.5,1.35,0],
      bath:[6.55,2.85,0],service:[8.5,2.7,-Math.PI/2],balcony:[3.2,8.25,Math.PI]
    };
    function clearKeys(){keys.clear();document.querySelectorAll('[data-key]').forEach(function(b){b.classList.remove('active');});}
    function pause(){paused=true;clearKeys();lastMouse=null;lookPointer=null;document.getElementById('pause').hidden=false;}
    function resume(){paused=false;lastTime=performance.now();document.getElementById('pause').hidden=true;canvas.focus({preventScroll:true});requestFrame();}
    function go(name) {
      var target=locations[name]||locations.start;
      if(!navigation.place(target[0],target[1]))return false;
      yaw=target[2];pitch=0;clearKeys();lastMouse=null;requestFrame();return true;
    }
    function render(now) {
      frame=0;var dt=Math.min(.05,Math.max(0,(now-lastTime)/1000));lastTime=now;
      if(!paused) {
        var forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),right=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
        var length=Math.hypot(forward,right);
        if(length) {
          var step=(keys.has('ShiftLeft')||keys.has('ShiftRight')?2.1:1.25)*dt/length;
          navigation.move((-Math.sin(yaw)*forward+Math.cos(yaw)*right)*step,(-Math.cos(yaw)*forward-Math.sin(yaw)*right)*step);
        }
      }
      var room=navigation.roomAt();camera.position.set(navigation.position.x-model.center.x,1.6+(room&&room.wet?-.018:0),navigation.position.z-model.center.z);
      camera.rotation.set(pitch,yaw,0,'YXZ');renderer.render(scene,camera);
      document.getElementById('room-name').textContent=room?room.name:'过道';
      if(!paused&&keys.size)requestFrame();
    }
    function requestFrame(){if(!frame)frame=requestAnimationFrame(render);}
    function turn(dx,dy){if(paused)return;yaw-=dx*.0025;pitch=THREE.MathUtils.clamp(pitch-dy*.0022,-1.35,1.35);requestFrame();}
    function unlock(){if(document.pointerLockElement===canvas)document.exitPointerLock();}
    function lockUnavailable(){lastMouse=null;document.getElementById('lock').textContent='悬停转头';document.getElementById('lock').title='鼠标锁定暂不可用，可直接在画面上移动鼠标转头';}
    function lockMouse() {
      resume();
      if(canvas.requestPointerLock) {
        try {var result=canvas.requestPointerLock();if(result&&result.catch)result.catch(lockUnavailable);}catch(e){lockUnavailable();}
      }else lockUnavailable();
    }
    canvas.addEventListener('pointerenter',function(){lastMouse=null;});
    canvas.addEventListener('pointerleave',function(){lastMouse=null;});
    canvas.addEventListener('pointerdown',function(e){
      if(e.pointerType==='touch'){resume();lookPointer=e.pointerId;lastMouse={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}
    });
    canvas.addEventListener('click',function(e){if(e.pointerType!=='touch')lockMouse();});
    canvas.addEventListener('pointermove',function(e){
      if(document.pointerLockElement===canvas)return;
      if(e.pointerType==='touch'&&e.pointerId!==lookPointer)return;
      if(lastMouse)turn(e.clientX-lastMouse.x,e.clientY-lastMouse.y);
      lastMouse={x:e.clientX,y:e.clientY};
    });
    document.addEventListener('mousemove',function(e){if(document.pointerLockElement===canvas)turn(e.movementX,e.movementY);});
    function endLook(e){if(e.pointerId===lookPointer){lookPointer=null;lastMouse=null;}}
    canvas.addEventListener('pointerup',endLook);canvas.addEventListener('pointercancel',endLook);canvas.addEventListener('lostpointercapture',endLook);
    document.addEventListener('pointerlockchange',function(){
      var locked=document.pointerLockElement===canvas;document.getElementById('lock').textContent=locked?'释放鼠标':'锁定鼠标';
      if(locked)resume();else pause();
    });
    document.addEventListener('pointerlockerror',lockUnavailable);
    window.addEventListener('keydown',function(e){
      if(e.target.closest('select,input,textarea,button,a'))return;
      if(e.code==='Escape'){unlock();pause();return;}
      if(e.code==='KeyR'){e.preventDefault();go('start');return;}
      if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight'].indexOf(e.code)<0||paused)return;
      e.preventDefault();if(!keys.size)lastTime=performance.now();keys.add(e.code);requestFrame();
    });
    window.addEventListener('keyup',function(e){keys.delete(e.code);});
    window.addEventListener('blur',function(){unlock();pause();});
    document.addEventListener('visibilitychange',function(){if(document.hidden){unlock();pause();}});
    document.getElementById('reset').addEventListener('click',function(){go('start');resume();});
    document.getElementById('location').addEventListener('change',function(){go(this.value);this.value='start';resume();});
    document.getElementById('lock').addEventListener('click',function(){if(document.pointerLockElement===canvas)unlock();else lockMouse();});
    document.querySelectorAll('[data-key]').forEach(function(button){
      button.addEventListener('pointerdown',function(e){e.preventDefault();resume();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);button.classList.add('active');requestFrame();});
      function release(){keys.delete(button.dataset.key);button.classList.remove('active');}
      button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
    });
    window.addEventListener('resize',function(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();requestFrame();});
    if(!go('start'))throw new Error('Room Tour start is obstructed');
    loading.hidden=true;lastTime=performance.now();requestFrame();
  } catch(err) {loading.hidden=false;loading.textContent='漫游未能启动，请使用支持 WebGL 的现代浏览器打开。';console.error(err);}
})();
