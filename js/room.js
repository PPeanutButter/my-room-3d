/* Orbit-view interface for the shared ROOM_MODEL scene. */
(function () {
  'use strict';
  var CX = 4.72, CZ = 4.515;
  var scene, camera, renderer, model, joinery, cabinets, furniture, appliances, curtains, fullWalls = true, showLabels = true, doorsOpen = true;
  var labelItems = [], tween = null, frame = 0;
  var canvas = document.getElementById('stage');
  var mobile = function () { return window.innerWidth <= 720; };
  var orbit = { x:0, z:0, y:0.45, theta:-0.32, phi:0.55, span:13.5, distance:28 };
  var views = {
    all: { x:4.72, z:4.515, y:0.45, theta:-0.32, phi:0.55, span:13.5 },
    top: { x:4.72, z:4.515, y:0, theta:0, phi:0.001, span:11.4 },
    living: { x:3.55, z:4.8, y:0.25, theta:-0.28, phi:0.43, span:8.1 },
    dining: { x:4.12, z:1.8, y:0.35, theta:.35, phi:.65, span:4.5 },
    kitchen: { x:7.52, z:1.1, y:0.4, theta:-0.18, phi:0.5, span:5.3 },
    service: { x:8.55, z:2.68, y:.85, theta:-.7, phi:.65, span:3.7 },
    master: { x:6.55, z:5.55, y:0.3, theta:-0.3, phi:0.5, span:6.2 },
    bed2: { x:1.55, z:1.9, y:0.3, theta:-0.15, phi:0.45, span:5.9 },
    bath: { x:7.48, z:2.65, y:0.25, theta:-0.15, phi:0.35, span:5.2 },
    washbasin: { x:5.61, z:3.30, y:1.3, theta:Math.PI, phi:1.03, span:2.7, distance:3 },
    balcony: { x:3.39, z:8.3, y:0.25, theta:-0.25, phi:0.55, span:5.6 }
  };
  function buildModel() {
    model=ROOM_MODEL.create(renderer);scene=model.scene;
    joinery=model.joinery;cabinets=model.cabinets;furniture=model.furniture;
    appliances=model.appliances;curtains=model.curtains;
    model.rooms.forEach(function(r) {
      var el=document.createElement('div'); el.className='room-label';
      el.innerHTML=r.name+'<small>'+r.area+' m²</small>';
      document.getElementById('labels').appendChild(el);
      labelItems.push({el:el,point:new THREE.Vector3(r.at[0]-CX,.06,r.at[1]-CZ)});
    });
  }
  function buildWalls() {model.setFullWalls(fullWalls);}
  function projection() {
    var w=innerWidth,h=innerHeight, compact=mobile(), panelHidden=document.getElementById('panel').classList.contains('hidden');
    var left=compact||panelHidden?0:300;
    var top=compact&&!panelHidden?document.getElementById('panel').getBoundingClientRect().height+24:0;
    var usableWidth=Math.max(200,w-left-36), usableHeight=Math.max(180,h-top-85);
    var fit=Math.max(h/usableHeight, h/usableWidth*.94);
    var span=orbit.span*fit;
    camera.left=-span*w/h/2; camera.right=span*w/h/2; camera.top=span/2; camera.bottom=-span/2;
    camera.setViewOffset(w,h,-left/2,-top/2,w,h); camera.updateProjectionMatrix();
  }
  function updateCamera() {
    var r=orbit.distance, s=Math.sin(orbit.phi);
    camera.position.set(orbit.x+r*s*Math.sin(orbit.theta),orbit.y+r*Math.cos(orbit.phi),orbit.z+r*s*Math.cos(orbit.theta));
    camera.lookAt(orbit.x,orbit.y,orbit.z); projection(); camera.updateMatrixWorld();
  }
  function render() {
    frame=0; updateCamera(); renderer.render(scene,camera);
    labelItems.forEach(function(item) {
      var p=item.point.clone().project(camera);
      var x=(p.x+1)*innerWidth/2,y=(1-p.y)*innerHeight/2;
      item.el.style.display=showLabels&&p.z>-1&&p.z<1?'':'none';
      item.el.style.transform='translate('+x+'px,'+y+'px) translate(-50%,-50%)';
    });
  }
  function requestRender() { if(!frame) frame=requestAnimationFrame(render); }
  function selectView(key,animate) {
    var v=views[key]; if(!v) return;
    if(tween) cancelAnimationFrame(tween); tween=null;
    document.querySelectorAll('[data-view]').forEach(function(b) { var on=b.dataset.view===key; b.classList.toggle('on',on); b.setAttribute('aria-pressed',String(on)); });
    var target={x:v.x-CX,z:v.z-CZ,y:v.y,theta:v.theta,phi:v.phi,span:v.span,distance:v.distance||28};
    if(!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { Object.assign(orbit,target); requestRender(); return; }
    var start=Object.assign({},orbit), t0=performance.now();
    function step(now) {
      var t=Math.min(1,(now-t0)/650), e=t*t*(3-2*t);
      Object.keys(target).forEach(function(k) { orbit[k]=start[k]+(target[k]-start[k])*e; });
      requestRender(); tween=t<1?requestAnimationFrame(step):null;
    }
    tween=requestAnimationFrame(step);
  }
  function controls() {
    var pointers=new Map(), drag=null, pinch=null;
    function cancelTween() { if(tween) cancelAnimationFrame(tween); tween=null; }
    function pinchState() {
      var a=Array.from(pointers.values());
      return {distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2};
    }
    function pan(dx,dy) {
      var s=(camera.top-camera.bottom)/innerHeight;
      var right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0), up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
      orbit.x+=(-right.x*dx+up.x*dy)*s; orbit.z+=(-right.z*dx+up.z*dy)*s; orbit.y+=(-right.y*dx+up.y*dy)*s;
    }
    canvas.addEventListener('pointerdown',function(e) {
      cancelTween(); canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      drag={x:e.clientX,y:e.clientY,pan:e.shiftKey||e.button===2}; if(pointers.size===2) pinch=pinchState();
    });
    canvas.addEventListener('pointermove',function(e) {
      if(!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pointers.size===2) {
        var now=pinchState();
        if(pinch) { orbit.span=THREE.MathUtils.clamp(orbit.span*pinch.distance/Math.max(1,now.distance),2.5,28); pan(now.x-pinch.x,now.y-pinch.y); }
        pinch=now;
      } else if(drag) {
        var dx=e.clientX-drag.x,dy=e.clientY-drag.y;
        if(drag.pan) pan(dx,dy);
        else { orbit.theta-=dx*.006; orbit.phi=THREE.MathUtils.clamp(orbit.phi-dy*.005,.001,1.35); }
        drag.x=e.clientX; drag.y=e.clientY;
      }
      requestRender();
    });
    function end(e) {
      pointers.delete(e.pointerId); pinch=null;
      var remaining=Array.from(pointers.values())[0]; drag=remaining?{x:remaining.x,y:remaining.y,pan:false}:null;
    }
    canvas.addEventListener('pointerup',end); canvas.addEventListener('pointercancel',end); canvas.addEventListener('lostpointercapture',end);
    canvas.addEventListener('contextmenu',function(e) {e.preventDefault();});
    canvas.addEventListener('wheel',function(e) {e.preventDefault();cancelTween();orbit.span=THREE.MathUtils.clamp(orbit.span*Math.exp(e.deltaY*.001),2.5,28);requestRender();},{passive:false});
    document.querySelectorAll('[data-view]').forEach(function(b) {b.addEventListener('click',function(){selectView(b.dataset.view,true);});});
    document.getElementById('walls').addEventListener('click',function(){fullWalls=!fullWalls;this.textContent=fullWalls?'剖面墙高':'完整墙高';this.setAttribute('aria-pressed',String(fullWalls));buildWalls();cabinets.refreshMirror(scene);requestRender();});
    document.getElementById('doors').addEventListener('click',function(){doorsOpen=!doorsOpen;this.textContent=doorsOpen?'关闭房门':'打开房门';this.setAttribute('aria-pressed',String(!doorsOpen));joinery.setOpen(doorsOpen);cabinets.refreshMirror(scene);requestRender();});
    document.getElementById('cabinetToggle').addEventListener('click',function(){cabinets.root.visible=!cabinets.root.visible;this.textContent=cabinets.root.visible?'隐藏柜体':'显示柜体';this.setAttribute('aria-pressed',String(!cabinets.root.visible));cabinets.refreshMirror(scene);requestRender();});
    document.getElementById('furnitureToggle').addEventListener('click',function(){furniture.root.visible=!furniture.root.visible;this.textContent=furniture.root.visible?'隐藏家具':'显示家具';this.setAttribute('aria-pressed',String(!furniture.root.visible));cabinets.refreshMirror(scene);requestRender();});
    document.getElementById('applianceToggle').addEventListener('click',function(){appliances.root.visible=!appliances.root.visible;this.textContent=appliances.root.visible?'隐藏设备':'显示设备';this.setAttribute('aria-pressed',String(!appliances.root.visible));cabinets.refreshMirror(scene);requestRender();});
    document.getElementById('curtainToggle').addEventListener('click',function(){curtains.root.visible=!curtains.root.visible;this.textContent=curtains.root.visible?'隐藏窗帘':'显示窗帘';this.setAttribute('aria-pressed',String(!curtains.root.visible));cabinets.refreshMirror(scene);requestRender();});
    document.getElementById('labelToggle').addEventListener('click',function(){showLabels=!showLabels;this.textContent=showLabels?'隐藏标注':'显示标注';this.setAttribute('aria-pressed',String(!showLabels));requestRender();});
    document.getElementById('toggleInfo').addEventListener('click',function(){var hidden=document.getElementById('panel').classList.toggle('hidden');this.textContent=hidden?'显示信息':'隐藏信息';this.setAttribute('aria-expanded',String(!hidden));requestRender();});
    var dialog=document.getElementById('planDialog');
    document.getElementById('source').addEventListener('click',function(){dialog.showModal();});
    document.getElementById('closePlan').addEventListener('click',function(){dialog.close();});
    dialog.addEventListener('click',function(e){if(e.target===dialog){var b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}});
    document.getElementById('shot').addEventListener('click',function(){
      render();
      var output=document.createElement('canvas'); output.width=canvas.width; output.height=canvas.height;
      var ctx=output.getContext('2d'); ctx.drawImage(canvas,0,0);
      if(showLabels) {
        var ratio=canvas.width/innerWidth; ctx.scale(ratio,ratio); ctx.textAlign='center';
        labelItems.forEach(function(item) {
          var p=item.point.clone().project(camera); if(p.z<=-1||p.z>=1) return;
          var x=(p.x+1)*innerWidth/2,y=(1-p.y)*innerHeight/2;
          ctx.fillStyle='rgba(247,246,240,.85)';ctx.fillRect(x-35,y-18,70,36);
          ctx.fillStyle='#535a4e';ctx.font='12px sans-serif';ctx.fillText(item.el.childNodes[0].textContent,x,y-1);
          ctx.fillStyle='#858a7e';ctx.font='10px sans-serif';ctx.fillText(item.el.querySelector('small').textContent,x,y+12);
        });
      }
      output.toBlob(function(blob){if(!blob)return;var a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='房屋3D_'+Date.now()+'.png';a.click();setTimeout(function(){URL.revokeObjectURL(url);},2000);},'image/png');
    });
    window.addEventListener('resize',function(){renderer.setSize(innerWidth,innerHeight,false);requestRender();});
    window.addEventListener('hashchange',function(){selectView(location.hash.slice(1),true);});
  }
  try {
    renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,preserveDrawingBuffer:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight,false);
    renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,250);
    buildModel();controls();selectView(views[location.hash.slice(1)]?location.hash.slice(1):'all',false);render();
    var loading=document.getElementById('loading'); loading.style.opacity='0';setTimeout(function(){loading.hidden=true;loading.style.display='none';},320);
  } catch(err) {
    document.getElementById('loading').textContent='三维场景未能启动，请使用支持 WebGL 的现代浏览器打开。';
    console.error(err);
  }
})();
